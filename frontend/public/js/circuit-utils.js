function snap(val, gridSize) {
    return Math.round(val / gridSize) * gridSize;
}

// 通用电路工具函数，全部都是计算
function getAllNodesAndEdges(components, GRID_SIZE, getActualPins) {
    const nodeKeyList = [];
    const nodeKeyMap = new Map();
    let nodeId = 0;

    function nodeKey(pin) {
        if (pin.type) { // 如果有类型信息，包含类型
            return `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}:${pin.type}`;
        }
        return `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
    }

    // 收集所有节点
    components.forEach(comp => {
        getActualPins(comp).forEach(pin => {
            const key = nodeKey(pin);
            if (!nodeKeyMap.has(key)) {
                nodeKeyMap.set(key, nodeId++);
                nodeKeyList.push(key);
            }
        });
    });

    // 并查集管理节点连通性
    const parent = Array(nodeKeyList.length).fill(0).map((_, i) => i);

    function find(x) {
        return parent[x] === x ? x : (parent[x] = find(parent[x]));
    }

    function union(x, y) {
        parent[find(x)] = find(y);
    }

    // 导线连接
    components.forEach(comp => {
        if (comp.type === 'wire') {
            const pins = getActualPins(comp);
            if (pins.length === 2) {
                const a = nodeKeyMap.get(nodeKey(pins[0]));
                const b = nodeKeyMap.get(nodeKey(pins[1]));
                if (a != null && b != null) union(a, b);
            }
        }
    });

    // 每个节点所属的电路网络编号
    const compIdMap = new Map(); // i(节点索引) => 网络编号
    let compId = 0;
    const root2netId = new Map(); // 根节点索引 => 网络编号
    for (let i = 0; i < nodeKeyList.length; i++) {
        const root = find(i);
        if (!root2netId.has(root)) root2netId.set(root, compId++);
        compIdMap.set(i, root2netId.get(root));
    }
    // 构建nodes数组：下标为网络编号，内容为代表坐标字符串
    const nodes = [];
    for (let i = 0; i < nodeKeyList.length; i++) {
        const netId = compIdMap.get(i);
        nodes[netId] = nodeKeyList[i];
    }

    // 构建边：每对引脚之间的元件连接关系，支持多引脚元件
    const edges = [];
    components.forEach(comp => {
        const pins = getActualPins(comp);
        if (pins.length >= 2) {
            for (let i = 0; i < pins.length; i++) {
                for (let j = i + 1; j < pins.length; j++) {
                    const a = compIdMap.get(nodeKeyMap.get(nodeKey(pins[i])));
                    const b = compIdMap.get(nodeKeyMap.get(nodeKey(pins[j])));
                    edges.push({ a, b, comp });
                }
            }
        }
    });
    window.parent.postMessage({
        type: 'CIRCUIT_INFO',
        nodes,
        edges,
        nodeKeyMap,
        compIdMap
    }, window.location.origin);
    return { nodes, edges, nodeKeyMap, compIdMap }; // nodes下标为网络编号
}




function updateConductanceMatrix(G, idx1, idx2, g) {
    G[idx1][idx1] += g;
    G[idx2][idx2] += g;
    G[idx1][idx2] -= g;
    G[idx2][idx1] -= g;
}

function isConnected(pin1, pin2, GRID_SIZE) {
    // pin1/pin2应为像素坐标
    return (Math.abs(pin1.x - pin2.x) <= GRID_SIZE/2) && 
           (Math.abs(pin1.y - pin2.y) <= GRID_SIZE/2);
}

function solveNodeVoltages(components, GRID_SIZE, getActualPins, windowRef) {
    if (!windowRef._lastNodeVoltages) {
        windowRef._lastNodeVoltages = {};
    }
    const { nodes, edges, nodeKeyMap, compIdMap } = windowRef.getAllNodesAndEdges(components, GRID_SIZE, getActualPins);
    if (!nodes.length) return {};
    // console.log('nodes:', nodes);

    let batteryNodes = [], groundNodes = [];
    // 查找电源和接地节点
    components.forEach(comp => {
        if (comp.type === 'battery') {
            const pins = getActualPins(comp);
            const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
            const idx = nodeKeyMap.get(key);
            if (idx != null) batteryNodes.push(compIdMap.get(idx));
        }
        if (comp.type === 'ground') {
            const pins = getActualPins(comp);
            const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
            const idx = nodeKeyMap.get(key);
            if (idx != null) groundNodes.push(compIdMap.get(idx));
        }
    });
    const hasLogicGates = components.some(comp => 
        ['and-gate', 'or-gate', 'not-gate', 'nand-gate', 'nor-gate'].includes(comp.type)
    );

    // 若没有电源和接地，但有逻辑门，添加虚拟电源和接地
    if (batteryNodes.length === 0 && groundNodes.length === 0 && hasLogicGates) {
        // 为逻辑门添加虚拟电源和接地
        const virtualPowerNode = nodes.length;
        const virtualGroundNode = nodes.length + 1;
        // 扩展 nodes 数组
        nodes.push('virtual_power', 'virtual_ground');

        // 更新 nodeKeyMap 和 compIdMap
        if (!nodeKeyMap.has('virtual_power')) {
            nodeKeyMap.set('virtual_power', virtualPowerNode);
            compIdMap.set(virtualPowerNode, virtualPowerNode);
        }
        if (!nodeKeyMap.has('virtual_ground')) {
            nodeKeyMap.set('virtual_ground', virtualGroundNode);
            compIdMap.set(virtualGroundNode, virtualGroundNode);
        }

        // 为每个逻辑门的所有引脚关联虚拟电源和接地
        const newEdges = [];
        components.forEach(comp => {
            if (['and-gate', 'or-gate', 'not-gate', 'nand-gate', 'nor-gate'].includes(comp.type)) {
                const pins = getActualPins(comp);
                pins.forEach(pin => {
                    const pinKey = `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
                    const pinIdx = nodeKeyMap.get(pinKey);
                    if (pinIdx !== undefined) {
                        // 关联虚拟电源和接地
                        newEdges.push({ a: pinIdx, b: virtualPowerNode, comp: { type: 'virtual_wire' } });
                        newEdges.push({ a: pinIdx, b: virtualGroundNode, comp: { type: 'virtual_wire' } });
                    }
                });
            }
        });

        // 更新 edges 数组
        edges.push(...newEdges);

        batteryNodes.push(virtualPowerNode);
        groundNodes.push(virtualGroundNode);
    }

    if (batteryNodes.length === 0 || groundNodes.length === 0) {
        return {};
    }

    // 只保留与电源或地连通的网络编号
    const activeNetSet = new Set([...batteryNodes, ...groundNodes]);
    let changed = true;
    while (changed) {
        changed = false;
        edges.forEach(({ a, b }) => {
            if (activeNetSet.has(a) && !activeNetSet.has(b)) {
                activeNetSet.add(b); changed = true;
            } else if (activeNetSet.has(b) && !activeNetSet.has(a)) {
                activeNetSet.add(a); changed = true;
            }
        });
    }
    // 构建netId到新索引的映射
    const activeNetIds = Array.from(activeNetSet);
    const netId2idx = new Map();
    activeNetIds.forEach((netId, i) => netId2idx.set(netId, i));
    const N = activeNetIds.length;
    const G = Array.from({ length: N }, () => Array(N).fill(0));
    const I = Array(N).fill(0);

    // ---------------------------------- 处理双引脚元件 ----------------------------------
    edges.forEach(({ a, b, comp }) => {
        if (!netId2idx.has(a) || !netId2idx.has(b)) {};
        let R = 1e6; // 默认电阻为1M，这是一个较大的值，表示电阻无穷大
        if (comp.type === 'not-gate') {
            const pins = getActualPins(comp);
            const idxIn = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
            const idxOut = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));

            if (idxIn === undefined || idxOut === undefined) return;

            const vIn = windowRef && windowRef._lastNodeVoltages && nodes && nodes[idxIn] !== undefined 
                ? windowRef._lastNodeVoltages[nodes[idxIn]] || 0 : 0;

            let vOut = (5 - vIn) >= 2.49 ? 5 : 0;

            const k = netId2idx.get(idxOut);

            if (k !== undefined) {
                // 强制该节点电压为 vOut，模仿电源模型
                G[k] = Array(N).fill(0);
                G[k][k] = 1;
                I[k] = vOut;
                windowRef._lastNodeVoltages[nodes[idxOut]] = vOut;
                // console.log('非门输出:', nodes[idxOut], '电压:', vOut);
            }
            return;
        } else if (comp.type === 'resistor' || comp.type === 'bulb') {
            R = Math.max(comp.value || 1, 1e-3);
        } else if (comp.type === 'wire') {
            R = 0.01;
        } else if (comp.type === 'switch') {
            R = (comp.state === 'closed') ? 0.01 : 1e6;
        } else if (comp.type === 'diode') { // 二极管
            let vA = 0, vB = 0;
            const pins = getActualPins(comp);
            const { anodeIdx, cathodeIdx } = getDiodeAnodeCathodeIdx(comp);
            if (windowRef._lastNodeVoltages) {
                const anodeKey = `${snap(pins[anodeIdx].x, GRID_SIZE)},${snap(pins[anodeIdx].y, GRID_SIZE)}`;
                const cathodeKey = `${snap(pins[cathodeIdx].x, GRID_SIZE)},${snap(pins[cathodeIdx].y, GRID_SIZE)}`;
                vA = windowRef._lastNodeVoltages[nodes[compIdMap.get(nodeKeyMap.get(anodeKey))]] || 0;
                vB = windowRef._lastNodeVoltages[nodes[compIdMap.get(nodeKeyMap.get(cathodeKey))]] || 0;
            }
            // 没有历史电压时，默认小电阻
            if (!windowRef._lastNodeVoltages) {
                R = 10;
            } else {
                const U = vA - vB;
                R = U > 0.7 ? 10 : 1e6;
            }
        } else if (comp.type === 'capacitor') {
            const dt = 1 / 30;
            const g = (comp.currentVoltage !== undefined) ? (comp.value * 1e-6) / dt : 1e-6;
            const ia = netId2idx.get(a), ib = netId2idx.get(b);
            if (ia === undefined || ib === undefined || ia >= G.length || ib >= G.length) {
                return;
            }
            G[ia][ia] += g;
            G[ib][ib] += g;
            G[ia][ib] -= g;
            G[ib][ia] -= g;
            if (comp.currentVoltage !== undefined) {
                I[ia] += g * comp.currentVoltage;
                I[ib] -= g * comp.currentVoltage;
            }
            return;
        } else if (comp.type === 'transistor-npn' || comp.type === 'transistor-pnp') return;
        const g = 1 / R;
        const ia = netId2idx.get(a), ib = netId2idx.get(b);
        if (ia === undefined || ib === undefined || ia >= G.length || ib >= G.length) {
            return;
        }
        G[ia][ia] += g;
        G[ib][ib] += g;
        G[ia][ib] -= g;
        G[ib][ia] -= g;
    });
    // ---------------------------------- 处理三极管 ----------------------------------
    components.forEach(comp => {
        if (comp.type === 'transistor-npn' || comp.type === 'transistor-pnp') {
            const pins = getActualPins(comp);
            const { bIdx, cIdx, eIdx } = getTransistorPinIdx(comp);
            const idxB = compIdMap.get(nodeKeyMap.get(`${snap(pins[bIdx].x, GRID_SIZE)},${snap(pins[bIdx].y, GRID_SIZE)}`));
            const idxC = compIdMap.get(nodeKeyMap.get(`${snap(pins[cIdx].x, GRID_SIZE)},${snap(pins[cIdx].y, GRID_SIZE)}`));
            const idxE = compIdMap.get(nodeKeyMap.get(`${snap(pins[eIdx].x, GRID_SIZE)},${snap(pins[eIdx].y, GRID_SIZE)}`));
            if (!netId2idx.has(idxB) || !netId2idx.has(idxC) || !netId2idx.has(idxE)) return;

            let vB = 0, vC = 0, vE = 0;
            if (windowRef._lastNodeVoltages) {
                vB = windowRef._lastNodeVoltages[nodes[idxB]] || 0;
                vC = windowRef._lastNodeVoltages[nodes[idxC]] || 0;
                vE = windowRef._lastNodeVoltages[nodes[idxE]] || 0;
            }

            // 测试输出三极管引脚电压
            // console.log('三极管引脚电压:', 'B:', vB, 'C:', vC, 'E:', vE);

            let Rce = 1e6;
            if (comp.type === 'transistor-npn') {
                Rce = (vB - vE > 0.7 && vC > vE) ? 1 : 1e6;
            } else if (comp.type === 'transistor-pnp') {
                Rce = (vE - vB > 0.7 && vE > vC) ? 1 : 1e6;
            }

            const g = 1 / Rce; // 电导由电阻计算得来，代表集电极和发射极之间的电流导通能力
            const ic = netId2idx.get(idxC);
            const ie = netId2idx.get(idxE);
            G[ic][ic] += g; // 集电极添加电流导纳，意味着集电极和发射极之间的电流导通
            G[ie][ie] += g; // 发射极
            G[ic][ie] -= g;
            G[ie][ic] -= g;

            // 更新 windowRef._lastNodeVoltages
            windowRef._lastNodeVoltages[nodes[idxB]] = vB;
            windowRef._lastNodeVoltages[nodes[idxC]] = vC;
            windowRef._lastNodeVoltages[nodes[idxE]] = vE;
        }
    });
    // ----------------------------------- 模拟逻辑门 -----------------------------------
    components.forEach(comp => {
        if (comp.type === 'or-gate' || comp.type === 'and-gate' || comp.type === 'nand-gate' || comp.type === 'nor-gate') {
            const pins = getActualPins(comp);

            const idxIn1 = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
            const idxIn2 = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
            const idxOut = compIdMap.get(nodeKeyMap.get(`${snap(pins[2].x, GRID_SIZE)},${snap(pins[2].y, GRID_SIZE)}`));
            
            let vOut = 0;
            if (idxIn1 === undefined || idxIn2 === undefined || idxOut === undefined) {// 引脚未连接
                // 让逻辑门输出为0
                vOut = 0;
            } else {
                
                const vIn1 = windowRef && windowRef._lastNodeVoltages && nodes && nodes[idxIn1] !== undefined 
                ? windowRef._lastNodeVoltages[nodes[idxIn1]] || 0 : 0;
                const vIn2 = windowRef && windowRef._lastNodeVoltages && nodes && nodes[idxIn2] !== undefined 
                ? windowRef._lastNodeVoltages[nodes[idxIn2]] || 0 : 0;
                
                // console.log('逻辑门组件:', comp.type, '输入引脚电压:', vIn1, vIn2, '输出引脚:', idxOut);

                switch (comp.type) {
                    case 'and-gate':
                        vOut = Math.min(vIn1, vIn2) >= 2.49 ? 5 : 0;
                        break;
                    case 'or-gate':
                        vOut = Math.max(vIn1, vIn2) >= 2.49 ? 5 : 0;
                        break;
                    case 'nand-gate':
                        vOut = Math.min(vIn1, vIn2) >= 2.49 ? 0 : 5;
                        break;
                    case 'nor-gate':
                        vOut = Math.max(vIn1, vIn2) >= 2.49 ? 0 : 5;
                        break;
                    default:
                        break;
                }
            }

            const pinOut = pins[2];
            const keyOut = `${snap(pinOut.x, GRID_SIZE)},${snap(pinOut.y, GRID_SIZE)}`;
            const idxOutMapped = idxOut;
            const k = netId2idx.get(idxOutMapped);

            if (k !== undefined) {
                G[k] = Array(N).fill(0);
                G[k][k] = 1;
                I[k] = vOut;
                windowRef._lastNodeVoltages[keyOut] = vOut;
                // console.log('逻辑门输出:', keyOut, '电压:', vOut);
            }
        }
    });

    // ----------------------------------- 设置参考电压 -----------------------------------
    // 设置参考电压（电池为5V，地为0V）
    for (let k = 0; k < N; k++) {
        const netId = activeNetIds[k];
        if (batteryNodes.includes(netId)) {
            G[k] = Array(N).fill(0);
            G[k][k] = 1;
            I[k] = 5;
        } else if (groundNodes.includes(netId)) {
            G[k] = Array(N).fill(0);
            G[k][k] = 1;
            I[k] = 0;
        }
    }
    // 解线性方程组
    const V = solveLinearSystem(G, I);
    activeNetIds.forEach((netId, i) => {
        windowRef._lastNodeVoltages[nodes[netId]] = V[i];
    });
    // 映射回原有nodes下标
    const result = Array(nodes.length).fill(0);
    activeNetIds.forEach((netId, i) => {
        result[netId] = V[i];
    });
    return result;
}

// 高斯消元实现（用于演示）
function solveLinearSystem(A, B) {
    const n = A.length;
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) maxRow = j;
        }
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [B[i], B[maxRow]] = [B[maxRow], B[i]];

        const pivot = A[i][i];
        if (Math.abs(pivot) < 1e-9) continue;

        for (let j = i + 1; j < n; j++) {
            const factor = A[j][i] / pivot;
            for (let k = i; k < n; k++) {
                A[j][k] -= factor * A[i][k];
            }
            B[j] -= factor * B[i];
        }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (B[i] - sum) / A[i][i];
    }

    return x;
}

// 更新电容器状态
function updateCapacitors(components, nodeVoltages, dt, nodes, nodeKeyMap, compIdMap, getActualPins, isConnected, GRID_SIZE) {
    components.forEach(comp => {
        if (comp.type === 'capacitor' || comp.type === 'electrolytic-capacitor') {
            const pins = getActualPins(comp);
            const idxA = compIdMap.get(nodeKeyMap.get(`${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`));
            const idxB = compIdMap.get(nodeKeyMap.get(`${snap(pins[1].x, GRID_SIZE)},${snap(pins[1].y, GRID_SIZE)}`));
            const vA = (idxA !== undefined) ? nodeVoltages[idxA] : 0;
            const vB = (idxB !== undefined) ? nodeVoltages[idxB] : 0;
            const Vab = isNaN(vA - vB) ? 0 : vA - vB;
            const C = Math.max(comp.value || 0, 1) * 1e-6;
            if (comp.type === 'electrolytic-capacitor') {
                const actualVoltage = vA - vB;
                if (actualVoltage < -0.5) {
                    comp.currentVoltage = 0;
                    return;
                }
            }
            // Vc(t+dt) = Vc(t) + (I * dt) / C
            // I = (Vab - Vc) / R
            let equivalentR = 1000;
            components.forEach(c => {
                if (c.type === 'resistor' || c.type === 'bulb') {
                    const cPins = getActualPins(c);
                    if (isConnected(pins[0], cPins[0], GRID_SIZE) && isConnected(pins[1], cPins[1], GRID_SIZE)) {
                        equivalentR += c.value;
                    } else if (isConnected(pins[0], cPins[0], GRID_SIZE) || isConnected(pins[1], cPins[1], GRID_SIZE)) {
                        equivalentR = 1/(1/equivalentR + 1/c.value);
                    }
                }
            });
            equivalentR = Math.max(equivalentR, 100);
            if (comp.lastUpdate === undefined) {
                comp.lastUpdate = Date.now();
            }
            if (typeof comp.currentVoltage !== 'number' || isNaN(comp.currentVoltage)) {
                comp.currentVoltage = Vab;
            }
            const now = Date.now();
            const realDT = Math.max((now - comp.lastUpdate) / 1000, 0);
            comp.lastUpdate = now;
            // 真实积分
            const I = (Vab - comp.currentVoltage) / equivalentR;
            comp.currentVoltage += (I * realDT) / C;
        }
    });
}
function checkGoals() {
    const { nodes, edges, nodeKeyMap, compIdMap } = getAllNodesAndEdges(components, GRID_SIZE, getActualPins);
    const currentBulbLit = components.some(comp => comp.type === 'bulb' && comp.lit);
    const transistorCount = components.filter(c => c.type === 'transistor-npn' || c.type === 'transistor-pnp').length;
    const voltageSources = components.filter(c => c.type === 'voltage-source' || c.type === 'battery');
    const isGrounded = components.some(c => c.type === 'ground');
    const switches = components.filter(c => c.type === 'switch');
    const nandGates = components.filter(c => c.type === 'nand-gate');
    const bulbs = components.filter(c => c.type === 'bulb');
    const resistors = components.filter(c => c.type === 'resistor');

    // 获取activeNetSet（与电源或地连通的网络编号）
    let batteryNodes = [], groundNodes = [];
    components.forEach(comp => {
        if (comp.type === 'battery') {
            const pins = getActualPins(comp);
            const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
            const idx = nodeKeyMap.get(key);
            if (idx != null) batteryNodes.push(compIdMap.get(idx));
        }
        if (comp.type === 'ground') {
            const pins = getActualPins(comp);
            const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
            const idx = nodeKeyMap.get(key);
            if (idx != null) groundNodes.push(compIdMap.get(idx));
        }
    });
    const activeNetSet = new Set([...batteryNodes, ...groundNodes]);
    let changed = true;
    while (changed) {
        changed = false;
        edges.forEach(({ a, b }) => {
            if (activeNetSet.has(a) && !activeNetSet.has(b)) {
                activeNetSet.add(b); changed = true;
            } else if (activeNetSet.has(b) && !activeNetSet.has(a)) {
                activeNetSet.add(a); changed = true;
            }
        });
    }

    // 检查灯泡是否发光（仅在状态变化时触发）
    if (currentBulbLit !== goalStatus.BULB_LIT && goalStatus.BULB_LIT == false) {
        goalStatus.BULB_LIT = currentBulbLit;
        if (currentBulbLit) {
            // console.log('目标达成：灯泡发光');
            comm.recordOperation('GOAL_BULB_LIT', {});
        }
    }

    // 检查三极管数量是否存在至少1个（仅在达到阈值时触发一次）
    if (!goalStatus.TRANSISTOR_1 && transistorCount >= 1) {
        // console.log('目标达成：使用了三极管');
        goalStatus.TRANSISTOR_1 = true;
        comm.recordOperation('GOAL_TRANSISTOR_1', {count: transistorCount});
    }

    // 检查三极管数量是否存在至少2个（仅在达到阈值时触发一次）
    if (!goalStatus.TRANSISTOR_2 && transistorCount >= 2) {
        // console.log('目标达成：三极管数量达到2个', goalStatus.TRANSISTOR_2);
        goalStatus.TRANSISTOR_2 = true;
        comm.recordOperation('GOAL_TRANSISTOR_2', {count: transistorCount});
    }
    
    // 检查是否使用电源并成功接地（基础电路完成）
    if (!goalStatus.BASIC_DONE && voltageSources.length >= 1 && isGrounded) {
        // console.log('目标达成：使用电源并成功接地');
        goalStatus.BASIC_DONE = true;
        comm.recordOperation('GOAL_Basic_Done', {});
    }


    // 检查多谐振荡器（增加状态缓存）
    const currentOscillator = detectMultivibrator(components);
    if (!goalStatus.OSCILLATOR && currentOscillator) {
        goalStatus.OSCILLATOR = true;
        comm.recordOperation('GOAL_OSCILLATOR', {});
    }
    
    // 两个开关都断开时灯泡熄灭
    if (switches.length >= 2) {
        const bothOpen = switches[0].state === 'open' && switches[1].state === 'open';
        if (!goalStatus.OR_GATE_BULB_OFF && bothOpen && !currentBulbLit) {
            // console.log('目标达成：两个开关都断开时灯泡熄灭');
            goalStatus.OR_GATE_BULB_OFF = true;
            comm.recordOperation('GOAL_OR_GATE_BULB_OFF', {});
        }
    }

    // 当至少一个开关闭合时灯泡发光
    if (switches.length >= 2) {
        const atLeastOneClosed = switches.some(s => s.state === 'closed');
        if (!goalStatus.OR_GATE_BULB_ON && atLeastOneClosed && currentBulbLit) {
            // console.log('目标达成：至少一个开关闭合时灯泡发光');
            goalStatus.OR_GATE_BULB_ON = true;
            comm.recordOperation('GOAL_OR_GATE_BULB_ON', {});
        }
    }

    // 当两个开关都闭合时灯泡发光
    if (switches.length >= 2) {
        const bothClosed = switches[0].state === 'closed' && switches[1].state === 'closed';
        if (!goalStatus.AND_GATE_BULB_ON && bothClosed && currentBulbLit) {
            // console.log('目标达成：两个开关都闭合时灯泡发光');
            goalStatus.AND_GATE_BULB_ON = true;
            comm.recordOperation('GOAL_AND_GATE_BULB_ON', {});
        }
    }

    // 当仅一个开关闭合时灯泡熄灭
    if (switches.length >= 2) {
        const oneClosed = (switches[0].state === 'closed' && switches[1].state === 'open') ||
                        (switches[0].state === 'open' && switches[1].state === 'closed');
        if (!goalStatus.AND_GATE_BULB_OFF && oneClosed && !currentBulbLit) {
            // console.log('目标达成：仅一个开关闭合时灯泡熄灭');
            goalStatus.AND_GATE_BULB_OFF = true;
            comm.recordOperation('GOAL_AND_GATE_BULB_OFF', {});
        }
    }

    // 非门模拟目标检测
    if (switches.length >= 1 && bulbs.length >= 1 && goalStatus.TRANSISTOR_1 && resistors.length >= 2) { 
        const sw1 = switches.find(s => s.id === 'SW1');
        const bulb = bulbs.find(s => s.id === 'B1');
        if (goalStatus.NOT_GATE01 === false && sw1.state === 'closed' && !bulb.lit && isComponentInActiveCircuit(bulb, nodes, nodeKeyMap, compIdMap, activeNetSet, getActualPins, GRID_SIZE)){
            goalStatus.NOT_GATE01 = true;
            goalStatus.NOT_GATE = true;
            comm.recordOperation('GOAL_NOT_GATE_01', {});
        }else if (goalStatus.NOT_GATE10 === true && sw1.state === 'open' && bulb.lit && isComponentInActiveCircuit(bulb, nodes, nodeKeyMap, compIdMap, activeNetSet, getActualPins, GRID_SIZE)){ 
            goalStatus.NOT_GATE10 = true;
            goalStatus.NOT_GATE = true;
            comm.recordOperation('GOAL_NOT_GATE_10', {});
        }
    }

    // 与非门基本触发器目标检测
    if (nandGates.length >= 2 && switches.length >= 2 && bulbs.length >= 1 && isComponentInActiveCircuit(bulbs.find(s => s.id === 'B1'), nodes, nodeKeyMap, compIdMap, activeNetSet, getActualPins, GRID_SIZE)) {
        const sw1 = switches.find(s => s.id === 'SW1');
        const sw2 = switches.find(s => s.id === 'SW2');
        const bulb = bulbs.find(s => s.id === 'B1');
        if (!sw1 || !sw2 || !bulb) return;

        // 以NAND型为例，输入高电平为open，低电平为closed
        const S = sw1.state === 'open' ? 1 : 0; // sw1输入
        const R = sw2.state === 'open' ? 1 : 0; // sw2输入
        const Q = bulb.lit ? 1 : 0; // 灯泡亮为高

        // 初始化记录
        if (typeof goalStatus.LATCH_PREV_Q === 'undefined') goalStatus.LATCH_PREV_Q = Q;
        if (typeof goalStatus.LATCH_PREV_S === 'undefined') goalStatus.LATCH_PREV_S = S;
        if (typeof goalStatus.LATCH_PREV_R === 'undefined') goalStatus.LATCH_PREV_R = R;

        // S=1, R=0，Q应为0（灯泡灭）
        if (S === 1 && R === 0 && Q === 0 && !goalStatus.GOAL_LATCH_SR10_Q0) {
            if (!goalStatus.LATCH_SR10_Q0) {
                goalStatus.LATCH_SR10_Q0 = true;
                comm.recordOperation('GOAL_LATCH_SR10_Q0', {});
            }
        }
        // S=0, R=1，Q应为1（灯泡亮）
        if (S === 0 && R === 1 && Q === 1 && !goalStatus.GOAL_LATCH_SR01_Q1) {
            if (!goalStatus.LATCH_SR01_Q1) {
                goalStatus.LATCH_SR01_Q1 = true;
                comm.recordOperation('GOAL_LATCH_SR01_Q1', {});
            }
        }
        // S=1, R=1，保持状态：只有本次和上次都是S=1,R=1且Q未变才判定
        if (S === 1 && R === 1 && (goalStatus.LATCH_PREV_S != S || goalStatus.LATCH_PREV_R != R) && !goalStatus.GOAL_LATCH_SR11_KEEP) {
            if (Q === goalStatus.LATCH_PREV_Q) {
                if (!goalStatus.LATCH_SR11_KEEP) {
                    goalStatus.LATCH_SR11_KEEP = true;
                    comm.recordOperation('GOAL_LATCH_SR11_KEEP', {});
                }
            }
        }
        // S=0, R=0，非法状态
        if (S === 0 && R === 0) {
            if (!goalStatus.LATCH_SR00_INVALID) {
                goalStatus.LATCH_SR00_INVALID = true;
                comm.recordOperation('GOAL_LATCH_SR00_INVALID', {});
            }
        }

        // 更新记录
        goalStatus.LATCH_PREV_Q = Q;
        goalStatus.LATCH_PREV_S = S;
        goalStatus.LATCH_PREV_R = R;

    }
}

function isComponentInActiveCircuit(component, nodes, nodeKeyMap, compIdMap, activeNetSet, getActualPins, GRID_SIZE) {
    // 获取元件所有引脚的网络编号
    const pins = getActualPins(component);
    if (!pins || pins.length < 2) return false;
    // 检查所有引脚是否都在activeNetSet中
    return pins.every(pin => {
        const key = `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
        const nodeIdx = nodeKeyMap.get(key);
        const netId = compIdMap.get(nodeIdx);
        return activeNetSet.has(netId);
    });
}
function onComponentsChanged() { // 组件变化时调用
    const currentTransistorCount = components.filter(c => c.type === 'transistor-npn' || c.type === 'transistor-pnp').length;
    if (currentTransistorCount < 2) goalStatus.TRANSISTOR_2 = false;
    if (!components.some(c => c.type === 'bulb')) goalStatus.BULB_LIT = false;
}
function detectMultivibrator(components) {
    // 结构法
    const transistorCount = components.filter(c => c.type === 'transistor-npn' || c.type === 'transistor-pnp').length;
    const capacitorCount = components.filter(c => c.type === 'capacitor').length;
    const bulbCount = components.filter(c => c.type === 'bulb').length;
    const structureOk = transistorCount >= 1 && capacitorCount >= 1 && bulbCount >= 1;

    // 行为法
    const bulb = components.find(c => c.type === 'bulb');
    if (!bulb) return false;
    const bulbPins = getActualPins(bulb);
    const bulbKey = `${bulbPins[0].x},${bulbPins[0].y}-${bulbPins[1].x},${bulbPins[1].y}`;

    if (nodeVoltagesHistory.length > 20) {
        const lastVoltages = nodeVoltagesHistory.slice(-20); // 取最后20帧数据
        const voltageDeltas = lastVoltages.map((v, i) => 
            i > 0 ? Math.abs(v[bulbKey] - lastVoltages[i-1][bulbKey]) : 0
        );
        const avgDelta = voltageDeltas.reduce((a,b) => a+b, 0) / voltageDeltas.length;
        behaviorOk = avgDelta > 0.05; // 平均电压变化需大于0.05V
    }
    return structureOk;
}

// 获取二极管阳极/阴极引脚索引（支持direction和rotation）
function getDiodeAnodeCathodeIdx(component) {
    // 默认direction=1时，rotation=0: pins[0]=阳极, pins[1]=阴极
    // rotation=180: pins[1]=阳极, pins[0]=阴极
    // rotation=90: pins[0]=阳极, pins[1]=阴极（水平变竖直，仍然0为阳极）
    // rotation=270: pins[1]=阳极, pins[0]=阴极
    // direction=-1时反过来
    let dir = component.direction || 1;
    let rot = (component.rotation || 0) % 360;
    let anodeIdx = 0, cathodeIdx = 1;
    if ((rot === 0 && dir === 1) || (rot === 180 && dir === -1) || (rot === 90 && dir === 1) || (rot === 270 && dir === -1)) {
        anodeIdx = 0; cathodeIdx = 1;
    } else {
        anodeIdx = 1; cathodeIdx = 0;
    }
    return { anodeIdx, cathodeIdx };
}

// 二极管建模：严格区分 direction，首次仿真即判断正反向
function diodeConductance(component, nodeVoltages, pins, compIdMap, nodeKeyMap, GRID_SIZE) {
    const { anodeIdx, cathodeIdx } = getDiodeAnodeCathodeIdx(component);
    const anodeKey = `${snap(pins[anodeIdx].x, GRID_SIZE)},${snap(pins[anodeIdx].y, GRID_SIZE)}`;
    const cathodeKey = `${snap(pins[cathodeIdx].x, GRID_SIZE)},${snap(pins[cathodeIdx].y, GRID_SIZE)}`;
    const nA = compIdMap.get(nodeKeyMap.get(anodeKey));
    const nK = compIdMap.get(nodeKeyMap.get(cathodeKey));
    const anodeV = nodeVoltages[nA] || 0;
    const cathodeV = nodeVoltages[nK] || 0;
    const U = anodeV - cathodeV;
    if (U > 0.7) {
        return 1.0 / 0.7; // 正向导通
    } else {
        return 1e-6; // 反向截止
    }
}

// 获取三极管BCE引脚索引（支持direction和rotation）
function getTransistorPinIdx(component) {
    // 默认direction=1时，rotation=0: pins[0]=B, pins[1]=C, pins[2]=E
    // rotation=180: pins[0]=B, pins[2]=C, pins[1]=E
    // rotation=90: pins[0]=B, pins[1]=C, pins[2]=E（竖直，B在左）
    // rotation=270: pins[0]=B, pins[2]=C, pins[1]=E
    // direction=-1时，C/E互换
    let dir = component.direction || 1;
    let rot = (component.rotation || 0) % 360;
    let bIdx = 0, cIdx = 1, eIdx = 2;
    if (rot === 0 || rot === 90) {
        bIdx = 0; cIdx = 1; eIdx = 2;
    } else if (rot === 180 || rot === 270) {
        bIdx = 0; cIdx = 2; eIdx = 1;
    }
    if (dir === -1) {
        // C/E互换
        let tmp = cIdx; cIdx = eIdx; eIdx = tmp;
    }
    return { bIdx, cIdx, eIdx };
}

// getAllNodesAndEdges、solveNodeVoltages、updateCapacitors 等函数内部，调用上述 conductance 判据，确保 direction、pins 顺序、节点编号严格对应。

window.getAllNodesAndEdges = getAllNodesAndEdges; // 获得节点和边
window.updateConductanceMatrix = updateConductanceMatrix; // 更新导纳矩阵
window.isConnected = isConnected; // 检测是否连通
window.solveNodeVoltages = solveNodeVoltages; // 求解节点电压
window.updateCapacitors = updateCapacitors; // 更新电容器
window.checkGoals = checkGoals; // 检测目标
window.onComponentsChanged = onComponentsChanged; // 检测组件改变
window.detectMultivibrator = detectMultivibrator; // 判断多谐振荡器是否实现
window.isComponentInActiveCircuit = isComponentInActiveCircuit; // 检测组件是否在活动电路中