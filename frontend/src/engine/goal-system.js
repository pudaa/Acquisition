// 可配置化目标检测引擎
// 支持教师通过 JSON 配置定义实验目标，无需编写检测代码

// ============ 内置检测器注册表 ============

const detectors = {};

// ---- 1. 灯泡发光检测 ----
// config: { bulbId?: "B1" }  指定特定灯泡 ID；不指定则检测任意灯泡
detectors.bulb_lit = {
  validate(config) { return true; },
  check(state, components, ctx) {
    let bulbs = ctx.getComponentList('bulb');
    // 若配置了 bulbId，只检测指定灯泡
    if (state.config.bulbId) {
      bulbs = bulbs.filter(b => b.id === state.config.bulbId);
    }
    const lit = bulbs.some(b => b.lit === true);
    if (lit && !state.achieved) return { achieved: true, event: 'GOAL_BULB_LIT' };
    return { achieved: state.achieved };
  },
};

// ---- 2. 元件数量检测 ----
// config: { componentType: "resistor", minCount: 4, componentId?: "R1" }
//   componentId 可选，指定只统计对应 id 的特定元件
detectors.component_count = {
  validate(config) {
    return config && config.componentType && config.minCount > 0;
  },
  check(state, components, ctx) {
    let list = ctx.getComponentList(state.config.componentType);
    // 若配置了 componentId，只统计该 ID
    if (state.config.componentId) {
      list = list.filter(c => c.id === state.config.componentId);
    }
    const count = list.length;
    if (count >= state.config.minCount && !state.achieved) {
      return { achieved: true, event: `${state.id}` };
    }
    return { achieved: state.achieved };
  },
};

// ---- 3. 电路导通检测 ----
detectors.circuit_active = {
  validate(config) { return true; },
  check(state, components, ctx) {
    if (state.achieved) return { achieved: true };
    const batteries = ctx.getComponentList('battery');
    const grounds = ctx.getComponentList('ground');
    if (batteries.length === 0 || grounds.length === 0) return { achieved: false };
    const active = ctx.engine.isCircuitActive(components);
    if (active && !state.achieved) return { achieved: true, event: 'GOAL_BASIC_DONE' };
    return { achieved: false };
  },
};

// ---- 4. 多谐振荡器检测 ----
detectors.multivibrator = {
  validate(config) { return true; },
  check(state, components, ctx) {
    if (state.achieved) return { achieved: true };
    const transistorCount = ctx.getComponentList('transistor-npn').length + ctx.getComponentList('transistor-pnp').length;
    const capacitorCount = ctx.getComponentList('capacitor').length;
    const bulbCount = ctx.getComponentList('bulb').length;
    const structureOk = transistorCount >= 1 && capacitorCount >= 1 && bulbCount >= 1;

    let behaviorOk = false;
    const history = ctx.nodeVoltagesHistory;
    if (history.length > 20) {
      const recent = history.slice(-20);
      let totalDelta = 0, validKeys = 0;
      const allKeys = new Set();
      recent.forEach(s => Object.keys(s).forEach(k => allKeys.add(k)));
      for (const key of allKeys) {
        const values = recent.map(s => s[key]).filter(v => typeof v === 'number' && !isNaN(v));
        if (values.length > 1) {
          const deltas = [];
          for (let i = 1; i < values.length; i++) {
            deltas.push(Math.abs(values[i] - values[i - 1]));
          }
          const avg = deltas.filter(d => d > 0).reduce((a, b) => a + b, 0) / Math.max(deltas.filter(d => d > 0).length, 1);
          if (avg > 0) { totalDelta += avg; validKeys++; }
        }
      }
      behaviorOk = validKeys > 0 && (totalDelta / validKeys) > 0.2;
    }

    if (structureOk && behaviorOk && !state.achieved) {
      return { achieved: true, event: 'GOAL_OSCILLATOR' };
    }
    return { achieved: false };
  },
};

// ---- 5. 开关与灯泡逻辑检测 ----
detectors.switch_bulb_logic = {
  validate(config) {
    return config && config.condition && config.bulbState;
  },
  check(state, components, ctx) {
    if (state.achieved) return { achieved: true };
    const switches = ctx.getComponentList('switch');
    const bulbs = ctx.getComponentList('bulb');
    if (switches.length < 2 || bulbs.length === 0) return { achieved: false };

    const bulbLit = bulbs.some(b => b.lit === true);
    const { condition, bulbState } = state.config;
    const targetLit = bulbState === 'lit';

    let condMet = false;
    if (condition === 'any_closed') {
      condMet = switches.some(s => s.state === 'closed');
    } else if (condition === 'all_closed') {
      condMet = switches.every(s => s.state === 'closed');
    } else if (condition === 'one_closed') {
      const closed = switches.filter(s => s.state === 'closed').length;
      condMet = closed === 1;
    } else if (condition === 'all_open') {
      condMet = switches.every(s => s.state === 'open');
    } else if (condition === 'any_closed_any_open') {
      condMet = switches.some(s => s.state === 'closed') && switches.some(s => s.state === 'open');
    }

    if (condMet && bulbLit === targetLit && !state.achieved) {
      return { achieved: true, event: state.id };
    }
    return { achieved: false };
  },
};

// ---- 6. 非门行为检测 ----
detectors.not_gate = {
  validate(config) { return config && config.switchId && config.bulbId; },
  check(state, components, ctx) {
    if (state.achieved) return { achieved: true };
    const switches = ctx.getComponentList('switch');
    const bulbs = ctx.getComponentList('bulb');
    const transistors = [...ctx.getComponentList('transistor-npn'), ...ctx.getComponentList('transistor-pnp')];
    const resistors = ctx.getComponentList('resistor');
    if (switches.length < 1 || bulbs.length < 1 || transistors.length < 1 || resistors.length < 2) {
      return { achieved: false };
    }

    const sw = switches.find(s => s.id === state.config.switchId);
    const bulb = bulbs.find(s => s.id === state.config.bulbId);
    if (!sw || !bulb) return { achieved: false };

    // 子目标：开关闭合时灯泡灭
    const sub1 = state.subGoals?.['closed_bulb_off'] || false;
    const sub2 = state.subGoals?.['open_bulb_on'] || false;

    if (!sub1 && sw.state === 'closed' && !bulb.lit) {
      state.subGoals = { ...state.subGoals, closed_bulb_off: true };
      ctx.emit('GOAL_NOT_GATE_01', {});
    }
    if (!sub2 && sw.state === 'open' && bulb.lit) {
      state.subGoals = { ...state.subGoals, open_bulb_on: true };
      ctx.emit('GOAL_NOT_GATE_10', {});
    }

    const newSub1 = state.subGoals?.['closed_bulb_off'] || false;
    const newSub2 = state.subGoals?.['open_bulb_on'] || false;

    if (newSub1 && newSub2 && !state.achieved) {
      return { achieved: true, event: state.id };
    }
    return { achieved: false };
  },
};

// ---- 7. RS 锁存器行为检测 ----
detectors.rs_latch = {
  validate(config) {
    return config && config.switchIds?.length >= 2 && config.bulbId;
  },
  check(state, components, ctx) {
    if (state.achieved) return { achieved: true };
    const nandGates = ctx.getComponentList('nand-gate');
    const switches = ctx.getComponentList('switch');
    const bulbs = ctx.getComponentList('bulb');
    const minGates = state.config.minGates || 2;

    if (nandGates.length < minGates || switches.length < 2 || bulbs.length < 1) {
      return { achieved: false };
    }

    const sw1 = switches.find(s => s.id === state.config.switchIds[0]);
    const sw2 = switches.find(s => s.id === state.config.switchIds[1]);
    const bulb = bulbs.find(s => s.id === state.config.bulbId);
    if (!sw1 || !sw2 || !bulb) return { achieved: false };

    const S = sw1.state === 'open' ? 1 : 2;
    const R = sw2.state === 'open' ? 1 : 2;
    const Q = bulb.lit ? 1 : 2;

    const sub = state.subGoals || {};
    const newSub = { ...sub };

    if (S === 1 && R === 2 && Q === 2) newSub.sr10_q0 = true;
    if (S === 2 && R === 1 && Q === 1) newSub.sr01_q1 = true;
    if (S === 1 && R === 1 && Q === (sub.prevQ || Q)) newSub.sr11_keep = true;
    if (S === 2 && R === 2) newSub.sr00_invalid = true;
    newSub.prevQ = Q;
    newSub.prevS = S;
    newSub.prevR = R;

    if (JSON.stringify(sub) !== JSON.stringify(newSub)) {
      state.subGoals = newSub;
      for (const [k, v] of Object.entries(newSub)) {
        if (v === true && !sub[k] && k.startsWith('sr')) {
          ctx.emit(`GOAL_LATCH_${k.toUpperCase()}`, {});
        }
      }
    }

    if (newSub.sr10_q0 && newSub.sr01_q1 && newSub.sr11_keep && !state.achieved) {
      return { achieved: true, event: state.id };
    }
    return { achieved: false };
  },
};

// ============ 检测器引擎 ============

import { WorkflowEngine, validateWorkflow } from './workflow-engine.js';

export class GoalEngine {
  constructor(config) {
    this.goals = (config?.goals || []).map(g => ({
      ...g,
      achieved: false,
      subGoals: {},
      config: g.config || {},
      // 工作流目标：创建 WorkflowEngine 实例
      _workflow: g.type === 'workflow' && g.workflow
        ? new WorkflowEngine(g.workflow, {
            onAchieved: (title) => {
              this.emit('goal_achieved', { id: g.id, title: title || g.title });
            },
          })
        : null,
    }));
    this.componentCounts = new Map();
    this.componentTyped = new Map();
    this.nodeVoltagesHistory = [];
    this.listeners = [];
    this._circuitInfo = null;
    this._lastVoltages = {};
    this._lastComponents = [];

    // 按 trigger 拆分：poll（轮询） vs event（事件驱动）
    this._pollGoals = [];
    this._eventGoals = new Map();
    for (const g of this.goals) {
      const trigger = g.trigger || 'poll';
      if (trigger === 'poll') {
        this._pollGoals.push(g);
      } else {
        // trigger 格式: "event:subtype:detail"
        // 注册事件及其所有父级模式，如 "component:add:resistor" → "component:add:resistor", "component:add", "component"
        const parts = trigger.split(':');
        for (let i = 0; i < parts.length; i++) {
          const key = parts.slice(0, i + 1).join(':');
          if (!this._eventGoals.has(key)) this._eventGoals.set(key, []);
          this._eventGoals.get(key).push({ goal: g, trigger });
        }
      }
    }
  }

  /** 设置当前电压结果供工作流使用 */
  setVoltages(voltages) {
    this._lastVoltages = voltages || {};
  }

  onGoal(eventOrCallback, callback) {
    // 支持两种用法：onGoal(callback) 和 onGoal(event, callback)
    if (callback === undefined) {
      this.listeners.push(eventOrCallback);
    } else {
      const event = eventOrCallback;
      this.listeners.push((ev, data) => {
        if (ev === event) callback(data);
      });
    }
  }

  emit(event, data) {
    for (const cb of this.listeners) {
      if (typeof cb === 'function') cb(event, data);
    }
  }

  getComponentCount(type) {
    return this.componentCounts.get(type) || 0;
  }

  getComponentList(type) {
    if (type === 'all') {
      const all = [];
      for (const list of this.componentTyped.values()) {
        all.push(...list);
      }
      return all;
    }
    return this.componentTyped.get(type) || [];
  }

  isCircuitActive(components) {
    // 简化版电路导通检测 → 检查是否有闭合回路
    const batteries = components.filter(c => c.type === 'battery');
    const grounds = components.filter(c => c.type === 'ground');
    if (batteries.length === 0 || grounds.length === 0) return false;
    // 通过元件连通性粗略判断
    const connected = new Set();
    components.forEach(c => {
      if (c.type === 'battery' || c.type === 'ground') connected.add(c);
    });
    // 广度搜索连通图
    const queue = Array.from(connected);
    const visited = new Set();
    while (queue.length > 0) {
      const node = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      // 查找连接到该元件的导线
      components.forEach(c => {
        if (c.type !== 'wire' || visited.has(c)) return;
        if (this._areConnected(node, c, components, 40)) {
          queue.push(c);
        }
      });
    }
    return visited.size > 1;
  }

  _areConnected(a, b, components, GRID_SIZE) {
    // 简化：通过引脚位置判断是否连接
    const pinsA = this._getPins(a, GRID_SIZE);
    const pinsB = this._getPins(b, GRID_SIZE);
    for (const pa of pinsA) {
      for (const pb of pinsB) {
        if (Math.abs(pa.x - pb.x) <= 2 && Math.abs(pa.y - pb.y) <= 2) return true;
      }
    }
    return false;
  }

  _getPins(comp, GRID_SIZE = 40) {
    if (comp.type === 'wire') {
      return [
        { x: (comp.xGrid || 0) * GRID_SIZE, y: (comp.yGrid || 0) * GRID_SIZE },
        { x: (comp.x2Grid || 0) * GRID_SIZE, y: (comp.y2Grid || 0) * GRID_SIZE },
      ];
    }
    // 简易引脚生成
    const pins = [];
    const cx = (comp.xGrid || 0) * GRID_SIZE;
    const cy = (comp.yGrid || 0) * GRID_SIZE;
    const angle = (comp.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    // 两引脚元件：左右各一个
    if (!['ground', 'battery', 'transistor-npn', 'transistor-pnp',
          'and-gate', 'or-gate', 'nand-gate', 'nor-gate', 'not-gate'].includes(comp.type)) {
      const lx = -GRID_SIZE, ly = 0;
      pins.push({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
      const rx = GRID_SIZE, ry = 0;
      pins.push({ x: cx + rx * cos - ry * sin, y: cy + rx * sin + ry * cos });
    }
    if (comp.type === 'battery' || comp.type === 'ground') {
      pins.push({ x: cx, y: cy });
    }
    return pins;
  }

  // 更新组件统计信息
  updateStats(components, nodeVoltagesHistory) {
    this.componentCounts.clear();
    this.componentTyped.clear();
    this.nodeVoltagesHistory = nodeVoltagesHistory || [];

    // 统计各类型元件数量
    for (const comp of components) {
      if (comp.type === 'wire') continue;
      const type = comp.type;
      this.componentCounts.set(type, (this.componentCounts.get(type) || 0) + 1);
      if (!this.componentTyped.has(type)) this.componentTyped.set(type, []);
      this.componentTyped.get(type).push(comp);
    }
  }

  // ======== 事件驱动检测（供 SimulationEngine 外部调用）========
  /**
   * 触发一个事件，检查匹配的事件驱动型目标
   * @param {string} eventType 事件类型，如 "component:add:resistor"
   * @param {object} payload 事件载荷
   */
  fireEvent(eventType, payload) {
    // 精确匹配 + 前缀匹配：fire "component:add:resistor" 会触发注册了
    // "component:add:resistor", "component:add", "component" 的所有目标
    const parts = eventType.split(':');
    const matched = new Set();
    for (let i = parts.length; i > 0; i--) {
      const key = parts.slice(0, i).join(':');
      const list = this._eventGoals.get(key);
      if (list) {
        for (const entry of list) {
          if (!matched.has(entry.goal.id)) {
            matched.add(entry.goal.id);
            this._checkSingleGoal(entry.goal, { eventType, payload, ...payload });
          }
        }
      }
    }
  }

  /** 检测单个目标（内部复用） */
  _checkSingleGoal(goal, extraCtx = {}) {
    if (goal.achieved) return;

    // ---- 工作流类型目标 ----
    if (goal._workflow) {
      try {
        const result = goal._workflow.check({ ...this._buildWfCtx(), ...extraCtx });
        if (result.achieved) {
          goal.achieved = true;
          console.log(`[目标检测] ✅ ${goal.id} (${goal.title}) 达成, 准备通知父页面`);
          // 工作流目标的 onAchieved 回调由 WorkflowEngine 构造函数内的闭包触发
          // 这里也调用 emit 作为确定性的备用通道
          this.emit('goal_achieved', { id: goal.id, title: goal.title });
        } else {
          // 调试：每 60 帧打印一次未达成的 poll 目标
          if (goal._debugCounter === undefined) goal._debugCounter = 0;
          goal._debugCounter++;
          if (goal._debugCounter % 60 === 1) {
            console.log(`[目标检测] ⏳ ${goal.id} (${goal.title}) 检测中...`);
          }
        }
      } catch (err) {
        console.error(`工作流目标检测失败 [${goal.id}]:`, err);
      }
      return;
    }

    // ---- 传统检测器类型目标 ----
    const detector = detectors[goal.type];
    if (!detector) {
      console.warn(`未知目标类型: ${goal.type}`);
      return;
    }

    try {
      const state = { id: goal.id, config: goal.config, achieved: goal.achieved, subGoals: goal.subGoals };
      const result = detector.check(state, this._lastComponents, this._buildDetectorCtx());
      goal.subGoals = state.subGoals;

      if (result.achieved && !goal.achieved) {
        goal.achieved = true;
        console.log(`[目标检测] ✅ ${goal.id} (${goal.title}) 达成`);
        this.emit('goal_achieved', { id: goal.id, title: goal.title, event: result.event });
        if (result.event) {
          this.emit(result.event, {});
        }
      } else {
        if (goal._debugCounter === undefined) goal._debugCounter = 0;
        goal._debugCounter++;
        if (goal._debugCounter % 60 === 1) {
          console.log(`[目标检测] ⏳ ${goal.id} (${goal.title}) 检测中... achieved=${result.achieved}`, 
            goal.type === 'bulb_lit' ? `灯泡数=${this.getComponentList('bulb').length} lit=${this.getComponentList('bulb').some(b => b.lit)}` : '');
        }
      }
    } catch (err) {
      console.error(`目标检测失败 [${goal.id}]:`, err);
    }
  }

  /** 构建检测器上下文 */
  _buildDetectorCtx() {
    return {
      getComponentCount: (t) => this.getComponentCount(t),
      getComponentList: (t) => this.getComponentList(t),
      nodeVoltagesHistory: this.nodeVoltagesHistory,
      engine: this,
      emit: (e, d) => this.emit(e, d),
    };
  }

  /** 构建工作流上下文 */
  _buildWfCtx() {
    return {
      getComponentCount: (t) => this.getComponentCount(t),
      getComponentList: (t) => this.getComponentList(t),
      nodeVoltagesHistory: this.nodeVoltagesHistory,
      engine: this,
      emit: (e, d) => this.emit(e, d),
      voltages: this._lastVoltages,
      GRID_SIZE: 40,
      getActualPins: (comp, gs) => this._getPins(comp, gs),
      getNodeVoltage: () => 0,
      getVoltage: (comp) => {
        const pins = this._getPins(comp);
        if (pins.length < 2) return 0;
        return Math.abs(this._lastVoltages[pins[0].x + ',' + pins[0].y] || 0);
      },
    };
  }

  // 检测所有轮询型目标（每帧由 SimulationEngine 调用）
  checkAll(components, nodeVoltagesHistory) {
    this._lastComponents = components;
    this.updateStats(components, nodeVoltagesHistory);
    const n = this._pollGoals.filter(g => !g.achieved).length;
    if (n > 0) {
      // 每秒打印一次未完成的 poll 目标数
      if (!this._checkLogTimer) this._checkLogTimer = 0;
      this._checkLogTimer++;
      if (this._checkLogTimer % 60 === 1) {
        console.log(`[目标检测] 轮询: ${this._pollGoals.length} 个 poll 目标, ${n} 个待完成, ` +
          `元件数=${components.length}, ` +
          `灯泡=${this.getComponentList('bulb').length}, ` +
          `电池=${this.getComponentList('battery').length}, ` +
          `地线=${this.getComponentList('ground').length}`);
      }
    }
    for (const goal of this._pollGoals) {
      this._checkSingleGoal(goal);
    }
    return this.getResults();
  }

  // 获取检测结果
  getResults() {
    return this.goals.map(g => ({
      id: g.id,
      title: g.title,
      weight: g.weight,
      done: g.achieved,
    }));
  }

  // 获取进度
  getProgress() {
    const total = this.goals.reduce((s, g) => s + (g.weight || 1), 0);
    const done = this.goals.filter(g => g.achieved).reduce((s, g) => s + (g.weight || 1), 0);
    return total === 0 ? 0 : Math.round(100 * done / total);
  }

  // 验证目标配置是否合法
  static validateGoals(goals) {
    if (!Array.isArray(goals)) return { valid: false, error: '目标必须是数组' };
    const errors = [];
    for (const g of goals) {
      if (!g.id) errors.push(`目标缺少 id`);
      if (!g.type) errors.push(`目标 ${g.id || '(unnamed)'} 缺少 type`);
      if (!detectors[g.type]) errors.push(`目标类型 ${g.type} 不存在`);
      else {
        const valid = detectors[g.type].validate(g.config || {});
        if (!valid) errors.push(`目标 ${g.id} 配置无效`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

// 注册自定义检测器
export function registerDetector(type, detector) {
  if (detectors[type]) {
    console.warn(`检测器 ${type} 已被覆盖`);
  }
  detectors[type] = detector;
}
