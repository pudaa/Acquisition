// 仿真引擎编排器
// 整合 TimeManager + Circuit Solver + GoalEngine

import { TimeManager } from './time-manager.js';
import { solveCircuit, getAllNodesAndEdges } from './circuit-core.js';
import { GoalEngine } from './goal-system.js';

export class SimulationEngine {
  constructor(options = {}) {
    this.components = [];
    this.GRID_SIZE = options.gridSize || 40;
    this.time = new TimeManager(options);
    this.simState = { lastV: {}, capV: {}, indI: {}, simTime: 0 };

    // 目标检测
    this.goalEngine = options.goalEngine || null;

    // 回调
    this.onUpdate = options.onUpdate || null;     // 每步更新
    this.onRender = options.onRender || null;      // 渲染帧

    // 运行状态
    this._animId = null;
    this._dirty = true;                // 脏标记：电路结构变化时置 true（显式调用 markDirty）
    this._lastSolveResult = null;      // 缓存上次求解结果
  }

  // 设置元件列表
  setComponents(components) {
    this.components = components;
    this._dirty = true;
    this._lastSolveResult = null;
  }

  // 显式标记电路结构变化（元件增删/开关切换/撤销等），替代每帧 JSON.stringify 脏检查
  markDirty() {
    this._dirty = true;
    this._lastSolveResult = null;
    this.simState.lastV = {};
  }

  // 设置目标引擎
  setGoalEngine(engine) {
    this.goalEngine = engine;
  }

  // 开始仿真
  start() {
    this.time.reset();
    this.time.start();
    this._loop();
  }

  // 停止仿真
  stop() {
    this.time.stop();
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  // 重置状态
  reset() {
    this.simState = { lastV: {}, capV: {}, indI: {}, simTime: 0 };
    this._dirty = true;
    this._lastSolveResult = null;
    this.time.reset();
  }

  // 获取当前仿真结果
  getVoltage(nodeKey) {
    return this.simState.lastV[nodeKey] || 0;
  }

  // 主循环
  _loop() {
    const steps = this.time.tick();
    const dt = this.time.getEffectiveDt();

    // 脏标记优化：电路结构变化（markDirty）或有动态元件时才重新求解
    const hasDynamic = this._hasDynamicComponents();
    if (this._dirty || hasDynamic) {
      // 执行多个子步
      for (let i = 0; i < steps; i++) {
        this._step(dt);
      }
      if (!hasDynamic) {
        this._dirty = false;  // 纯阻性电路求解一次后标记为干净
      }
    } else {
      // 电路未变化且无动态元件：跳过求解，直接复用上次结果渲染
      // 仍需推进仿真时间以保持时间轴一致
      for (let i = 0; i < steps; i++) {
        this.time._simTime += this.time._dt;
      }
    }

    // 渲染帧回调
    if (this.onRender) {
      this.onRender({
        components: this.components,
        voltages: this.simState.lastV,
        simTime: this.time.simTime,
        goals: this.goalEngine ? this.goalEngine.getResults() : [],
        progress: this.goalEngine ? this.goalEngine.getProgress() : 0,
      });
    }

    this._animId = requestAnimationFrame(() => this._loop());
  }

  // 检查是否存在动态元件（电容、电感）
  _hasDynamicComponents() {
    for (const c of this.components) {
      if (c.type === 'capacitor' || c.type === 'inductor') return true;
    }
    return false;
  }

  // 单步仿真
  _step(dt) {
    if (this.components.length === 0) return;

    // 1. 求解电路
    const result = solveCircuit(
      this.components,
      this.GRID_SIZE,
      this.simState,
      dt
    );
    this.simState = result.state;

    // 2. 目标检测
    if (this.goalEngine) {
      const results = this.goalEngine.checkAll(this.components, []);
      // 如果有新达成的目标，触发回调
      for (const goal of results) {
        if (goal.done) {
          // 通过 onUpdate 上报进度
        }
      }
    }

    // 3. 进度回调
    if (this.onUpdate) {
      this.onUpdate({
        voltages: result.voltages,
        state: this.simState,
        time: this.time.simTime,
        goals: this.goalEngine ? this.goalEngine.getResults() : [],
      });
    }
  }
}
