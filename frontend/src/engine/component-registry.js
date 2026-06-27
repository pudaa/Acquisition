// 元件 ID 注册系统
// 为每个放置的元件分配唯一编号，供工作流目标检测引用

const TYPE_PREFIX = {
  resistor: 'R', battery: 'B', bulb: 'L',
  switch: 'SW', capacitor: 'C', diode: 'D',
  'transistor-npn': 'QN', 'transistor-pnp': 'QP',
  ground: 'GND',
  'and-gate': 'U1', 'or-gate': 'U2', 'not-gate': 'U3',
  'nand-gate': 'U4', 'nor-gate': 'U5',
  wire: 'W', inductor: 'L',
};

export class ComponentRegistry {
  constructor() {
    this._counters = {};
    this._usedIds = new Set();
  }

  /**
   * 为元件生成唯一 ID
   * @param {string} type 元件类型
   * @param {string} [preferredId] 优先使用的 ID（用于预设电路）
   * @returns {string} 如 "R1", "B2", "SW3"
   */
  generateId(type, preferredId) {
    // 如果指定了优先 ID 且未被占用
    if (preferredId && !this._usedIds.has(preferredId)) {
      this._usedIds.add(preferredId);
      this._updateCounter(preferredId);
      return preferredId;
    }

    const prefix = TYPE_PREFIX[type] || 'X';
    let num = this._counters[prefix] || 1;
    while (this._usedIds.has(`${prefix}${num}`)) {
      num++;
    }
    const id = `${prefix}${num}`;
    this._counters[prefix] = num + 1;
    this._usedIds.add(id);
    return id;
  }

  /**
   * 注册预设电路中的元件（保留其已有 ID）
   */
  registerPreset(components) {
    if (!components) return;
    for (const comp of components) {
      if (comp.id) {
        this._usedIds.add(comp.id);
        this._updateCounter(comp.id);
      } else if (comp.type !== 'wire') {
        comp.id = this.generateId(comp.type);
      }
    }
  }

  /**
   * 释放一个 ID（删除元件时调用）
   */
  releaseId(id) {
    if (id) this._usedIds.delete(id);
  }

  /**
   * 从计数器中删除一个 ID（方便复用编号）
   */
  removeId(id) {
    if (!id) return;
    this._usedIds.delete(id);
    const prefix = id.replace(/\d+$/, '');
    const num = parseInt(id.match(/\d+/)?.[0] || '0', 10);
    // 如果当前被删除的编号小于计数器的值，可以降低计数器
    if (this._counters[prefix] && num < this._counters[prefix]) {
      this._counters[prefix] = num;
    }
  }

  /**
   * 检查 ID 是否已被占用
   */
  isUsed(id) {
    return this._usedIds.has(id);
  }

  /** 重置全部 */
  reset() {
    this._counters = {};
    this._usedIds.clear();
  }

  _updateCounter(id) {
    const prefix = id.replace(/\d+$/, '');
    const num = parseInt(id.match(/\d+/)?.[0] || '0', 10);
    if (num >= (this._counters[prefix] || 0)) {
      this._counters[prefix] = num + 1;
    }
  }
}

/** 获取元件类型的缩写前缀 */
export function getTypePrefix(type) {
  return TYPE_PREFIX[type] || 'X';
}
