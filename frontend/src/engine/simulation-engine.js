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
    this._prevComponents = '';
  }

  // 设置元件列表
  setComponents(components) {
    this.components = components;
    this._prevComponents = JSON.stringify(components);
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

    // 在求解前先检查元件结构变化，变化时清空旧电压让求解器从零算起
    const stripped = this.components.map(c => ({
      type: c.type, xGrid: c.xGrid, yGrid: c.yGrid,
      x2Grid: c.x2Grid, y2Grid: c.y2Grid,
      id: c.id, rotation: c.rotation, state: c.state,
      value: c.value, beta: c.beta,
    }));
    const current = JSON.stringify(stripped);
    if (current !== this._prevComponents) {
      this._prevComponents = current;
      this.simState.lastV = {};
    }

    // 执行多个子步（此时 lastV 已正确初始化）
    for (let i = 0; i < steps; i++) {
      this._step(dt);
    }

    // 渲染帧回调（此时 lastV 是求解后的新鲜数据）
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
