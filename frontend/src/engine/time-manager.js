// 仿真时间管理器
// 固定时间步长，独立于帧率运行，保证仿真结果可复现

export class TimeManager {
  constructor(options = {}) {
    this._dt = options.dt || 1e-3;       // 固定步长（秒），默认 1ms
    this._subSteps = options.subSteps || 1; // 每帧最大子步数
    this._simTime = 0;                     // 当前仿真时间
    this._realTime = 0;                    // 上次 step 的真实时间
    this._accumulator = 0;                 // 累积未处理的时间
    this._running = false;
    this._maxStepsPerFrame = options.maxStepsPerFrame || 10; // 防止螺旋
  }

  get dt() { return this._dt; }
  set dt(val) { this._dt = Math.max(val, 1e-6); }

  get simTime() { return this._simTime; }

  // 开始仿真
  start() {
    this._realTime = performance.now();
    this._accumulator = 0;
    this._running = true;
  }

  // 暂停
  stop() { this._running = false; }

  get isRunning() { return this._running; }

  // 每帧调用，返回本次应该运行的子步数
  // 返回值：需要执行的子步数量（可能为 0）
  tick() {
    if (!this._running) return 0;

    const now = performance.now();
    const elapsed = (now - this._realTime) / 1000; // 秒
    this._realTime = now;

    // 限制最大 elapsed，防止长时间暂停后跳帧
    this._accumulator += Math.min(elapsed, 0.1);

    let steps = 0;
    while (this._accumulator >= this._dt && steps < this._maxStepsPerFrame) {
      this._accumulator -= this._dt;
      this._simTime += this._dt;
      steps++;
    }

    // 如果严重积压，丢弃剩余时间防止螺旋
    if (this._accumulator > this._dt * this._maxStepsPerFrame) {
      this._accumulator = 0;
    }

    return steps;
  }

  // 重置
  reset() {
    this._simTime = 0;
    this._accumulator = 0;
    this._realTime = performance.now();
  }

  // 获取当前 dt（可用于自适应步长）
  getEffectiveDt() {
    return this._dt;
  }
}
