// 工作流式目标检测引擎
// 支持通过 JSON 步骤序列定义复杂的检测逻辑
// 类似于 Unity 可视化脚本的工作流设计

// ============ 步骤执行器注册表 ============

const stepExecutors = {};

/**
 * 注册一个工作流步骤类型
 * @param {string} action 步骤类型名
 * @param {function} executor (step, store, ctx) => void
 *   step: 当前步骤配置 { action, store, ... }
 *   store: 键值存储 { [key]: any }
 *   ctx: 上下文 { components, getComponentList, getVoltage, frameCount, ... }
 */
export function registerStep(action, executor) {
  stepExecutors[action] = executor;
}

// ============ 工具函数：取值解析 ============

/**
 * 从 store 中解析一个值引用
 * "$key" → store.key
 * "$key.prop" → store.key.prop
 * 其他 → 原样返回
 */
function resolveValue(ref, store) {
  if (typeof ref === 'string' && ref.startsWith('$')) {
    const path = ref.slice(1);
    // 解析路径：支持 $key.prop[0].sub 等混合语法
    // 先按 . 分割，再对每段检查 [N] 数组索引
    const parts = path.split('.');
    let val = undefined;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const idxMatch = seg.match(/^([^\[]+)(?:\[(\d+)\])?$/);
      if (!idxMatch) {
        if (val == null) return undefined;
        val = val[seg];
        continue;
      }
      const key = idxMatch[1];
      const idx = idxMatch[2];
      if (i === 0) {
        val = store[key];
      } else {
        if (val == null) return undefined;
        val = val[key];
      }
      if (idx !== undefined && Array.isArray(val)) {
        val = val[parseInt(idx, 10)];
      }
    }
    return val;
  }
  return ref;
}

// ============ 内置步骤执行器 ============

// ---- 1. find_component: 查找元件 ----
registerStep('find_component', (step, store, ctx) => {
  const { type, id, store: storeKey } = step;
  let list = ctx.getComponentList('all');
  if (type) list = list.filter(c => c.type === type);
  if (id) list = list.filter(c => c.id === id);
  // 如果只期望单个结果，存第一个
  if (step.single !== false && list.length === 1) {
    store[storeKey] = list[0];
  } else {
    store[storeKey] = list;
  }
});

// ---- 2. read_property: 读取属性 ----
registerStep('read_property', (step, store, ctx) => {
  const { source, property, store: storeKey } = step;
  const obj = resolveValue(source, store);
  if (obj != null) {
    store[storeKey] = obj[property];
  } else {
    store[storeKey] = undefined;
  }
});

// ---- 3. count: 计数 ----
registerStep('count', (step, store, ctx) => {
  const { source, store: storeKey } = step;
  const val = resolveValue(source, store);
  if (Array.isArray(val)) {
    store[storeKey] = val.length;
  } else if (val != null) {
    store[storeKey] = 1; // 单个元件也算 1
  } else {
    store[storeKey] = 0;
  }
});

// ---- 4. compare: 比较运算 ----
registerStep('compare', (step, store, ctx) => {
  const { operator, left, right, store: storeKey } = step;
  const lv = resolveValue(left, store);
  const rv = resolveValue(right, store);
  let result = false;
  switch (operator) {
    case '==': result = lv === rv; break;
    case '!=': result = lv !== rv; break;
    case '>':  result = lv > rv; break;
    case '>=': result = lv >= rv; break;
    case '<':  result = lv < rv; break;
    case '<=': result = lv <= rv; break;
    case 'includes': result = Array.isArray(lv) && lv.includes(rv); break;
    case 'truthy': result = !!lv; break;
    case 'falsy': result = !lv; break;
  }
  store[storeKey] = result;
});

// ---- 5. and/or/not: 逻辑运算 ----
registerStep('and', (step, store, ctx) => {
  const { sources, store: storeKey } = step;
  store[storeKey] = sources.every(s => !!resolveValue(s, store));
});

registerStep('or', (step, store, ctx) => {
  const { sources, store: storeKey } = step;
  store[storeKey] = sources.some(s => !!resolveValue(s, store));
});

registerStep('not', (step, store, ctx) => {
  const { source, store: storeKey } = step;
  store[storeKey] = !resolveValue(source, store);
});

// ---- 6. set: 直接设置值 ----
registerStep('set', (step, store, ctx) => {
  const { value, store: storeKey } = step;
  store[storeKey] = resolveValue(value, store);
});

// ---- 7. assert: 断言（标记目标达成）----
registerStep('assert', (step, store, ctx) => {
  const { source, title } = step;
  const val = resolveValue(source, store);
  if (val && !ctx.goalState.achieved) {
    ctx.goalState.achieved = true;
    ctx.goalState.achievedTitle = title || step.title || '目标达成';
    ctx.goalState.achievedAt = ctx.frameCount;
    if (ctx.onAchieved) ctx.onAchieved(title);
  }
});

// ---- 8. sub_goal: 子目标追踪 ----
// 用法：检测到某条件时标记子目标完成
registerStep('sub_goal', (step, store, ctx) => {
  const { source, name, store: storeKey } = step;
  const val = resolveValue(source, store);
  if (val) {
    ctx.goalState.subGoals = ctx.goalState.subGoals || {};
    if (!ctx.goalState.subGoals[name]) {
      ctx.goalState.subGoals[name] = true;
      ctx.goalState.subGoalsUpdated = true;
    }
  }
  store[storeKey] = ctx.goalState.subGoals?.[name] || false;
});

// ---- 9. wait_frames: 等待帧数（防抖）----
registerStep('wait_frames', (step, store, ctx) => {
  const { source, frames, store: storeKey } = step;
  const val = resolveValue(source, store);
  const key = `_wait_${step.store || step.source}`;
  if (val) {
    store[key] = (store[key] || 0) + 1;
    store[storeKey] = store[key] >= (frames || 5);
  } else {
    store[key] = 0;
    store[storeKey] = false;
  }
});

// ---- 10. voltage: 获取节点电压 ----
registerStep('voltage', (step, store, ctx) => {
  const { nodeKey, componentId, store: storeKey } = step;
  if (componentId) {
    // 获取元件两端电压差
    const comp = ctx.getComponentList('all').find(c => c.id === componentId);
    if (comp && ctx.getVoltage) {
      store[storeKey] = ctx.getVoltage(comp);
    }
  } else if (nodeKey != null && ctx.voltages) {
    store[storeKey] = ctx.voltages[nodeKey] || 0;
  }
});

// ---- 11. voltage_diff: 获取某元件两端电压差 ----
registerStep('voltage_diff', (step, store, ctx) => {
  const { source, store: storeKey } = step;
  const comp = resolveValue(source, store);
  if (!comp || !ctx.getActualPins || !ctx.voltages) {
    store[storeKey] = 0;
    return;
  }
  const pins = ctx.getActualPins(comp, ctx.GRID_SIZE || 40);
  if (pins.length < 2) { store[storeKey] = 0; return; }
  const v1 = ctx.getNodeVoltage(pins[0]) || 0;
  const v2 = ctx.getNodeVoltage(pins[pins.length - 1]) || 0;
  store[storeKey] = Math.abs(v1 - v2);
});

// ---- 12. exists: 检查元件是否存在 ----
registerStep('exists', (step, store, ctx) => {
  const { type, id, store: storeKey } = step;
  let list = ctx.getComponentList('all');
  if (type) list = list.filter(c => c.type === type);
  if (id) list = list.filter(c => c.id === id);
  store[storeKey] = list.length > 0;
});

// ============ 工作流引擎 ============

export class WorkflowEngine {
  /**
   * @param {Array} workflow - 步骤数组
   * @param {object} options
   * @param {function} [options.onAchieved] - 目标达成回调
   */
  constructor(workflow, options = {}) {
    this.workflow = workflow || [];
    this.onAchieved = options.onAchieved;
    this.goalState = { achieved: false, subGoals: {} };
    this.frameCount = 0;
    this._lastResult = null;
  }

  /**
   * 执行一帧检测
   * @param {object} ctx - 上下文
   * @returns {{ achieved: boolean, title?: string }}
   */
  check(ctx) {
    if (this.goalState.achieved) {
      return { achieved: true, title: this.goalState.achievedTitle };
    }

    this.frameCount++;
    const store = {};
    const goalCtx = {
      ...ctx,
      goalState: this.goalState,
      frameCount: this.frameCount,
      onAchieved: (title) => {
        if (this.onAchieved) this.onAchieved(title);
      },
    };

    for (const step of this.workflow) {
      const executor = stepExecutors[step.action];
      if (!executor) {
        console.warn(`未知工作流步骤: ${step.action}`);
        continue;
      }
      try {
        executor(step, store, goalCtx);
      } catch (err) {
        console.warn(`工作流步骤执行失败 [${step.action}]:`, err);
      }
      // 如果断言已达成，提前结束
      if (this.goalState.achieved) break;
    }

    // 调试：每 120 帧打印一次工作流状态
    // if (this.frameCount % 120 === 1) {
    //   const storeSummary = Object.fromEntries(
    //     Object.entries(store).map(([k, v]) => [k, typeof v === 'object' ? (v.type || v.id || `{${Object.keys(v).join(',')}}`) : v])
    //   );
    //   console.log(`[工作流] frame=${this.frameCount} store=`, storeSummary);
    // }

    this._lastResult = {
      achieved: this.goalState.achieved,
      title: this.goalState.achievedTitle,
    };
    return this._lastResult;
  }

  /** 重置状态 */
  reset() {
    this.goalState = { achieved: false, subGoals: {} };
    this.frameCount = 0;
    this._lastResult = null;
  }
}

/**
 * 验证工作流配置是否合法
 */
export function validateWorkflow(workflow) {
  if (!Array.isArray(workflow)) {
    return { valid: false, error: 'workflow 必须是数组' };
  }
  const errors = [];
  for (let i = 0; i < workflow.length; i++) {
    const step = workflow[i];
    if (!step.action) {
      errors.push(`步骤 ${i}: 缺少 action`);
    } else if (!stepExecutors[step.action]) {
      errors.push(`步骤 ${i}: 未知 action "${step.action}"`);
    }
  }
  return { valid: errors.length === 0, errors };
}
