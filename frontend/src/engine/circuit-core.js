// 电路核心求解引擎 v2
// 使用 MNA + 牛顿-拉夫逊迭代 + 伴随模型
// - 电容：梯形积分（A-稳定）
// - 电感：向后欧拉（A-稳定）
// - 二极管/三极管：牛顿-拉夫逊迭代

import { getActualPins } from './circuit-component.js';

function snap(val, gridSize) {
  return Math.round(val / gridSize) * gridSize;
}

// ---- 节点/边提取（不变） ----
export function getAllNodesAndEdges(components, GRID_SIZE, onCircuitInfo) {
  const nodeKeyList = [];
  const nodeKeyMap = new Map();
  let nodeId = 0;

  function nodeKey(pin) {
    const key = `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
    return pin.type ? `${key}:${pin.type}` : key;
  }

  components.forEach(comp => {
    getActualPins(comp, GRID_SIZE).forEach(pin => {
      const key = nodeKey(pin);
      if (!nodeKeyMap.has(key)) {
        nodeKeyMap.set(key, nodeId++);
        nodeKeyList.push(key);
      }
    });
  });

  const parent = Array(nodeKeyList.length).fill(0).map((_, i) => i);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (x, y) => { parent[find(x)] = find(y); };

  components.forEach(comp => {
    if (comp.type === 'wire') {
      const pins = getActualPins(comp, GRID_SIZE);
      if (pins.length === 2) {
        const a = nodeKeyMap.get(nodeKey(pins[0]));
        const b = nodeKeyMap.get(nodeKey(pins[1]));
        if (a != null && b != null) union(a, b);
      }
    }
  });

  const compIdMap = new Map();
  let compId = 0;
  const root2netId = new Map();
  for (let i = 0; i < nodeKeyList.length; i++) {
    const root = find(i);
    if (!root2netId.has(root)) root2netId.set(root, compId++);
    compIdMap.set(i, root2netId.get(root));
  }

  const nodes = [];
  for (let i = 0; i < nodeKeyList.length; i++) {
    nodes[compIdMap.get(i)] = nodeKeyList[i];
  }

  const edges = [];
  components.forEach(comp => {
    const pins = getActualPins(comp, GRID_SIZE);
    if (pins.length >= 2) {
      for (let i = 0; i < pins.length; i++) {
        for (let j = i + 1; j < pins.length; j++) {
          const a = compIdMap.get(nodeKeyMap.get(nodeKey(pins[i])));
          const b = compIdMap.get(nodeKeyMap.get(nodeKey(pins[j])));
          if (a != null && b != null) edges.push({ a, b, comp });
        }
      }
    }
  });

  const result = { nodes, edges, nodeKeyMap, compIdMap };
  if (onCircuitInfo) onCircuitInfo(result);
  return result;
}

// ---- 高斯消元（不变） ----
export function solveLinearSystem(A, B) {
  const n = A.length;
  if (n === 0) return [];
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) maxRow = j;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [B[i], B[maxRow]] = [B[maxRow], B[i]];
    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i] / pivot;
      for (let k = i; k < n; k++) A[j][k] -= factor * A[i][k];
      B[j] -= factor * B[i];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(A[i][i]) < 1e-12) continue;
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
    x[i] = (B[i] - sum) / A[i][i];
  }
  return x;
}

// ============ 伴随模型 + 牛顿-拉夫逊求解器 ============

/**
 * 使用 MNA + 牛顿-拉夫逊迭代求解电路
 * @param {Array} components - 元件数组
 * @param {number} GRID_SIZE - 网格大小
 * @param {Object} state - 上次求解状态 { lastV, capV, indI, simTime }
 * @param {number} dt - 当前时间步长（秒）
 * @param {Function} onCircuitInfo - 可选回调
 * @returns {Object} { voltages, state }
 */
export function solveCircuit(components, GRID_SIZE, state = {}, dt = 1e-3, onCircuitInfo) {
  const { nodes, edges, nodeKeyMap, compIdMap } = getAllNodesAndEdges(components, GRID_SIZE, onCircuitInfo);
  if (!nodes.length) {
    // 无节点时确保灯泡/蜂鸣器 lit 归零
    for (const comp of components) {
      if (comp.type === 'bulb' || comp.type === 'buzzer') comp.lit = false;
    }
    return { voltages: [], state };
  }

  // ---- 1. 识别电源和地 ----
  let batteryNodes = [], groundNodes = [];
  const hasLogicGates = components.some(c =>
    ['and-gate', 'or-gate', 'not-gate', 'nand-gate', 'nor-gate'].includes(c.type)
  );

  components.forEach(comp => {
    if (comp.type === 'battery') {
      const pins = getActualPins(comp, GRID_SIZE);
      const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
      const idx = nodeKeyMap.get(key);
      if (idx != null) batteryNodes.push(compIdMap.get(idx));
    }
    if (comp.type === 'ground') {
      const pins = getActualPins(comp, GRID_SIZE);
      const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
      const idx = nodeKeyMap.get(key);
      if (idx != null) groundNodes.push(compIdMap.get(idx));
    }
  });

  // 虚拟地：当有电源但无地线时自动创建（保证电路可解）
  if (groundNodes.length === 0 && batteryNodes.length > 0) {
    const vg = nodes.length;
    nodes.push('virtual_ground');
    if (!nodeKeyMap.has('virtual_ground')) {
      nodeKeyMap.set('virtual_ground', vg);
      compIdMap.set(vg, vg);
    }
    groundNodes.push(vg);
  }

  // 虚拟电源/地（逻辑门专用）
  if (batteryNodes.length === 0 && groundNodes.length === 0 && hasLogicGates) {
    const vp = nodes.length, vg = nodes.length + 1;
    nodes.push('virtual_power', 'virtual_ground');
    if (!nodeKeyMap.has('virtual_power')) {
      nodeKeyMap.set('virtual_power', vp);
      compIdMap.set(vp, vp);
    }
    if (!nodeKeyMap.has('virtual_ground')) {
      nodeKeyMap.set('virtual_ground', vg);
      compIdMap.set(vg, vg);
    }
    for (const comp of components) {
      if (['and-gate','or-gate','not-gate','nand-gate','nor-gate'].includes(comp.type)) {
        for (const pin of getActualPins(comp, GRID_SIZE)) {
          const k = `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
          const idx = nodeKeyMap.get(k);
          if (idx !== undefined) {
            edges.push({ a: idx, b: vp, comp: { type: 'vwire' } });
            edges.push({ a: idx, b: vg, comp: { type: 'vwire' } });
          }
        }
      }
    }
    batteryNodes.push(vp); groundNodes.push(vg);
  }

  if (batteryNodes.length === 0 || groundNodes.length === 0) {
    // 电路无电源或地线，清空电压状态，重置所有灯泡/蜂鸣器
    state.lastV = {};
    for (const comp of components) {
      if (comp.type === 'bulb' || comp.type === 'buzzer') comp.lit = false;
    }
    return { voltages: [], state };
  }

  // ---- 2. 构建活跃节点集 ----
  const activeNetSet = new Set([...batteryNodes, ...groundNodes]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { a, b } of edges) {
      if (activeNetSet.has(a) && !activeNetSet.has(b)) { activeNetSet.add(b); changed = true; }
      else if (activeNetSet.has(b) && !activeNetSet.has(a)) { activeNetSet.add(a); changed = true; }
    }
  }

  const activeNetIds = Array.from(activeNetSet);
  const netId2idx = new Map();
  activeNetIds.forEach((n, i) => netId2idx.set(n, i));
  const N = activeNetIds.length;
  const lastV = state.lastV || {};

  // ---- 3. 牛顿-拉夫逊迭代 ----
  const NR_MAX_ITER = 20;
  const NR_TOL = 1e-6;

  let V = Array(N).fill(0);

  // 初始化：用上次电压或 0
  for (let k = 0; k < N; k++) {
    const netId = activeNetIds[k];
    V[k] = lastV[nodes[netId]] || 0;
  }

  for (let nr = 0; nr < NR_MAX_ITER; nr++) {
    // 构建 G 矩阵和 I 向量
    const G = Array.from({ length: N }, () => Array(N).fill(0));
    const I = Array(N).fill(0);

    // ---- 线性元件贡献 ----
    for (const { a, b, comp } of edges) {
      if (!netId2idx.has(a) || !netId2idx.has(b)) continue;
      const ia = netId2idx.get(a), ib = netId2idx.get(b);
      const va = V[ia] || 0, vb = V[ib] || 0;
      const vdiff = va - vb;

      switch (comp.type) {
        case 'resistor':
        case 'bulb':
        case 'photoresistor':
        case 'potentiometer':
        case 'buzzer': {
          const R = Math.max(comp.value || 1, 1e-3);
          const g = 1 / R;
          G[ia][ia] += g; G[ib][ib] += g;
          G[ia][ib] -= g; G[ib][ia] -= g;
          break;
        }
        case 'wire':
        case 'vwire': {
          G[ia][ia] += 1e4; G[ib][ib] += 1e4;
          G[ia][ib] -= 1e4; G[ib][ia] -= 1e4;
          break;
        }
        case 'switch':
        case 'fuse': {
          const R = (comp.state === 'closed') ? 0.01 : 1e9;
          const g = 1 / R;
          G[ia][ia] += g; G[ib][ib] += g;
          G[ia][ib] -= g; G[ib][ia] -= g;
          break;
        }
        case 'diode': {
          // 牛顿-拉夫逊：Ieq = Is*(exp(vd/(n*Vt))-1), Geq = dI/dV
          const Is = 1e-12;
          const nVt = 0.026; // n*Vt @ 300K
          const vd = vdiff;
          let Id, Gd;
          if (vd < -5 * nVt) {
            // 反向截止区：线性化
            Id = -Is;
            Gd = 0;
          } else {
            const expArg = Math.min(vd / nVt, 100);
            const e = Math.exp(expArg);
            Id = Is * (e - 1);
            Gd = Is * e / nVt;
          }
          G[ia][ia] += Gd; G[ib][ib] += Gd;
          G[ia][ib] -= Gd; G[ib][ia] -= Gd;
          I[ia] -= (Id - Gd * vd);
          I[ib] += (Id - Gd * vd);
          break;
        }
        case 'capacitor': {
          // 梯形积分伴随模型
          const C = Math.max((comp.value || 1) * 1e-6, 1e-12);
          const Geq = 2 * C / dt;
          state.capV = state.capV || {};
          const cKey = `${comp.x || 0}_${comp.y || 0}`;
          const vc0 = state.capV[cKey] || 0;
          const Ieq = Geq * vc0;
          G[ia][ia] += Geq; G[ib][ib] += Geq;
          G[ia][ib] -= Geq; G[ib][ia] -= Geq;
          I[ia] -= Ieq;
          I[ib] += Ieq;
          // 保存当前电压供下次使用
          state.capV[cKey] = vdiff;
          break;
        }
        case 'inductor': {
          // 向后欧拉伴随模型
          const L = Math.max((comp.value || 1) * 1e-3, 1e-9);
          const Geq = dt / L;
          state.indI = state.indI || {};
          const lKey = `${comp.x || 0}_${comp.y || 0}`;
          const iL0 = state.indI[lKey] || 0;
          const Ieq = iL0;
          G[ia][ia] += Geq; G[ib][ib] += Geq;
          G[ia][ib] -= Geq; G[ib][ia] -= Geq;
          I[ia] -= Ieq;
          I[ib] += Ieq;
          // 保存电流供下次使用
          state.indI[lKey] = iL0 + Geq * (vdiff - 0); // iL(t+dt)=iL(t)+Geq*vL(t+dt)
          break;
        }
        case 'transistor-npn':
        case 'transistor-pnp': {
          // 三极管用 Ebers-Moll 简化模型处理
          // 此处仅作占位，由后面专门处理
          break;
        }
        case 'not-gate':
        case 'and-gate':
        case 'or-gate':
        case 'nand-gate':
        case 'nor-gate': {
          // 逻辑门在后面处理
          break;
        }
      }
    }

    // ---- 三极管 Ebers-Moll 模型（牛顿-拉夫逊）----
    for (const comp of components) {
      if (comp.type !== 'transistor-npn' && comp.type !== 'transistor-pnp') continue;
      const pins = getActualPins(comp, GRID_SIZE);
      const idxB = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
      const idxC = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
      const idxE = compIdMap.get(nodeKeyMap.get(`${snap(pins[2].x, GRID_SIZE)},${snap(pins[2].y, GRID_SIZE)}`));
      if (!netId2idx.has(idxB) || !netId2idx.has(idxC) || !netId2idx.has(idxE)) continue;

      const iB = netId2idx.get(idxB), iC = netId2idx.get(idxC), iE = netId2idx.get(idxE);
      const vB = V[iB] || 0, vC = V[iC] || 0, vE = V[iE] || 0;

      const isNPN = comp.type === 'transistor-npn';
      const beta = comp.beta || 100;
      const Vth = 0.026; // 热电压
      const Is = 1e-14;

      // Ebers-Moll: 用两个二极管来建模 BE 和 BC 结
      const vBE = isNPN ? (vB - vE) : (vE - vB);
      const vBC = isNPN ? (vB - vC) : (vC - vB);

      // BE 结电流
      const expBE = Math.min(vBE / Vth, 50);
      const iBE = Is * (Math.exp(expBE) - 1);
      const gBE = Is * Math.exp(expBE) / Vth;

      // BC 结电流
      const expBC = Math.min(vBC / Vth, 50);
      const iBC = Is * (Math.exp(expBC) - 1);
      const gBC = Is * Math.exp(expBC) / Vth;

      // 受控源：Ic = beta * Ib（正向有源区近似）
      // 更精确：Ic = beta * iBE（忽略 Early 效应）
      const gm = beta * gBE; // 跨导

      // 装配到矩阵（NPN 情况）
      if (isNPN) {
        // B 节点
        G[iB][iB] += gBE + gBC;
        G[iB][iE] -= gBE;
        G[iB][iC] -= gBC;
        I[iB] -= (iBE - gBE * vBE) + (iBC - gBC * vBC);

        // C 节点：受控电流源 gm * vBE
        G[iC][iB] += gm;
        G[iC][iE] -= gm;
        I[iC] -= gm * (vB - vE) - gm * (vB - vE); // 线性化修正

        // E 节点
        G[iE][iE] += gBE;
        G[iE][iB] -= gBE;
        I[iE] -= -(iBE - gBE * vBE);
      } else {
        // PNP：类似但符号相反
        G[iB][iB] += gBE + gBC;
        G[iB][iE] -= gBE;
        G[iB][iC] -= gBC;
        I[iB] -= (iBE - gBE * vBE) + (iBC - gBC * vBC);
        G[iC][iB] -= gm;
        G[iC][iE] += gm;
        G[iE][iE] += gBE;
        G[iE][iB] -= gBE;
        I[iE] -= -(iBE - gBE * vBE);
      }
    }

    // ---- 逻辑门 ----
    for (const comp of components) {
      if (!['or-gate','and-gate','nand-gate','nor-gate','not-gate'].includes(comp.type)) continue;
      const pins = getActualPins(comp, GRID_SIZE);
      let idxIn1, idxIn2, idxOut;

      if (comp.type === 'not-gate') {
        idxIn1 = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
        idxOut = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
        if (idxIn1 === undefined || idxOut === undefined) continue;
        const vIn1 = V[netId2idx.get(idxIn1)] || 0;
        const vOut = (5 - vIn1) >= 2.49 ? 5 : 0;
        const k = netId2idx.get(idxOut);
        if (k !== undefined) { G[k] = Array(N).fill(0); G[k][k] = 1; I[k] = vOut; }
      } else {
        idxIn1 = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
        idxIn2 = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
        idxOut = compIdMap.get(nodeKeyMap.get(`${snap(pins[2].x, GRID_SIZE)},${snap(pins[2].y, GRID_SIZE)}`));
        if (idxIn1 === undefined || idxIn2 === undefined || idxOut === undefined) continue;
        const v1 = V[netId2idx.get(idxIn1)] || 0;
        const v2 = V[netId2idx.get(idxIn2)] || 0;
        const h1 = v1 >= 2.49, h2 = v2 >= 2.49;
        let vOut = 0;
        switch (comp.type) {
          case 'and-gate':  vOut = (h1 && h2) ? 5 : 0; break;
          case 'or-gate':   vOut = (h1 || h2) ? 5 : 0; break;
          case 'nand-gate': vOut = (h1 && h2) ? 0 : 5; break;
          case 'nor-gate':  vOut = (h1 || h2) ? 0 : 5; break;
        }
        const k = netId2idx.get(idxOut);
        if (k !== undefined) { G[k] = Array(N).fill(0); G[k][k] = 1; I[k] = vOut; }
      }
    }

    // ---- 设置参考电压 ----
    for (let k = 0; k < N; k++) {
      const netId = activeNetIds[k];
      if (batteryNodes.includes(netId)) {
        G[k] = Array(N).fill(0); G[k][k] = 1; I[k] = 5;
      } else if (groundNodes.includes(netId)) {
        G[k] = Array(N).fill(0); G[k][k] = 1; I[k] = 0;
      }
    }

    // ---- 求解线性方程组 ----
    const Vnew = solveLinearSystem(
      G.map(r => [...r]),
      [...I]
    );

    // ---- 检查收敛 ----
    let maxDiff = 0;
    for (let i = 0; i < N; i++) {
      const diff = Math.abs(Vnew[i] - V[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    V = Vnew;

    if (maxDiff < NR_TOL) break;
  }

  // ---- 电压钳位：限制浮空节点导致的数值发散 ----
  for (let k = 0; k < N; k++) {
    if (V[k] > 100 || V[k] < -100) {
      V[k] = 0;
    }
  }

  // ---- 更新电感电流/电容电压状态 ----
  // 电容电压在伴随模型中已更新
  // 电感电流：iL(t+dt) = iL(t) + dt/L * vL(t+dt)
  for (const comp of components) {
    if (comp.type !== 'inductor') continue;
    const pins = getActualPins(comp, GRID_SIZE);
    const idxA = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
    const idxB = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
    if (!netId2idx.has(idxA) || !netId2idx.has(idxB)) continue;
    const vL = (V[netId2idx.get(idxA)] || 0) - (V[netId2idx.get(idxB)] || 0);
    const L = Math.max((comp.value || 1) * 1e-3, 1e-9);
    state.indI = state.indI || {};
    const lKey = `${comp.x || 0}_${comp.y || 0}`;
    state.indI[lKey] = (state.indI[lKey] || 0) + (dt / L) * vL;
  }

  // ---- 更新灯泡/蜂鸣器发光状态 ----
  for (const comp of components) {
    if (comp.type !== 'bulb' && comp.type !== 'buzzer') continue;
    const pins = getActualPins(comp, GRID_SIZE);
    const idxA = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
    const idxB = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
    if (idxA !== undefined && idxB !== undefined && netId2idx.has(idxA) && netId2idx.has(idxB)) {
      const vDiff = Math.abs((V[netId2idx.get(idxA)] || 0) - (V[netId2idx.get(idxB)] || 0));
      comp.lit = vDiff > 1.5;
    } else {
      comp.lit = false;
    }
  }

  // ---- 构建结果 ----
  const result = Array(nodes.length).fill(0);
  activeNetIds.forEach((netId, i) => { result[netId] = V[i]; });

  // 保存状态：为所有原始节点键填入电压
  // （并查集合并后多个坐标指向同一 net，需全部填充才能支持任意引脚查询）
  state.lastV = {};
  for (const [key, nodeId] of nodeKeyMap.entries()) {
    const netId = compIdMap.get(nodeId);
    if (netId != null && netId2idx.has(netId)) {
      state.lastV[key] = V[netId2idx.get(netId)];
    }
  }

  return { voltages: result, state };
}

// ---- 向后兼容的 solveNodeVoltages 包装 ----
export function solveNodeVoltages(components, GRID_SIZE, lastNodeVoltages, onCircuitInfo) {
  const state = { lastV: lastNodeVoltages || {}, capV: {}, indI: {} };
  const result = solveCircuit(components, GRID_SIZE, state, 1e-3, onCircuitInfo);
  return result.voltages;
}

// ---- 电容更新（向后兼容，实际不再需要） ----
export function updateCapacitors() {}

// ---- 检测元件是否被连接 ----
export function isConnected(pin1, pin2, GRID_SIZE) {
  return Math.abs(pin1.x - pin2.x) <= GRID_SIZE / 2 &&
         Math.abs(pin1.y - pin2.y) <= GRID_SIZE / 2;
}
