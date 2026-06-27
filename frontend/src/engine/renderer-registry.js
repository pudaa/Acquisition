// 注册式元件渲染器系统
// 元件可自由注册自己的绘制函数，替代硬编码 switch/case

/** @type {Map<string, function>} */
const renderers = new Map();

/**
 * 注册一个元件类型的绘制函数
 * @param {string} type 元件类型名 (如 'resistor', 'bulb')
 * @param {function} renderFn (ctx, component, GRID_SIZE, options) => void
 */
export function registerRenderer(type, renderFn) {
  renderers.set(type, renderFn);
}

/**
 * 获取已注册的绘制函数
 */
export function getRenderer(type) {
  return renderers.get(type);
}

/**
 * 列出所有已注册的元件类型
 */
export function getRegisteredTypes() {
  return Array.from(renderers.keys());
}

// ---- 引脚绘制（公用）----

export function drawComponentPins(ctx, component, GRID_SIZE, getComponentPins) {
  ctx.fillStyle = '#f80';
  ctx.lineWidth = 1;
  const pinsDef = getComponentPins(GRID_SIZE)[component.type];
  if (pinsDef) {
    pinsDef.forEach(pin => {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, (1 / 8 * GRID_SIZE), 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// ---- 统一绘制入口 ----

/**
 * 绘制元件（通过注册表查找绘制函数）
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} component - { xGrid, yGrid, type, rotation, ... }
 * @param {number} GRID_SIZE
 * @param {function} getComponentPins - 引脚定义函数
 * @param {object} [options] - { lit?: boolean }
 */
export function drawComponent(ctx, component, GRID_SIZE, getComponentPins, options = {}) {
  const renderer = renderers.get(component.type);
  if (!renderer) return;

  ctx.save();
  ctx.translate(component.xGrid * GRID_SIZE, component.yGrid * GRID_SIZE);
  ctx.rotate((component.rotation || 0) * Math.PI / 180);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;

  renderer(ctx, component, GRID_SIZE, options);

  // 绘制引脚
  drawComponentPins(ctx, component, GRID_SIZE, getComponentPins);
  ctx.restore();
}

// ============ 内置元件绘制注册 ============

// ---- 电阻 ----
registerRenderer('resistor', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.lineTo(-(3 / 4 * gs), -(1 / 3 * gs));
  ctx.lineTo((3 / 4 * gs), -(1 / 3 * gs));
  ctx.lineTo((3 / 4 * gs), (1 / 3 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 3 * gs));
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
  if (comp.value) {
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.fillText(comp.value + 'Ω', -12, -(3 / 4 * gs));
  }
});

// ---- 电源 ----
registerRenderer('battery', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(0, -(3 / 4 * gs));
  ctx.lineTo(0, 0);
  ctx.moveTo(-(1 / 4 * gs + 1), -(3 / 4 * gs));
  ctx.lineTo((1 / 4 * gs + 1), -(3 / 4 * gs));
  ctx.stroke();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#d00';
  ctx.fillText('+', -(1 / 2 * gs), -gs);
});

// ---- 灯泡 ----
registerRenderer('bulb', (ctx, comp, gs, options) => {
  // 发光光晕
  if (options?.lit || comp.lit) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, gs - 2);
    gradient.addColorStop(0, 'rgba(255,255,120,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,220,60,0.4)');
    gradient.addColorStop(1, 'rgba(255,220,60,0)');
    ctx.beginPath();
    ctx.arc(0, 0, gs - 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, (3 / 4 * gs), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
  // 灯丝交叉线
  const j_xy = (3 / 4 * gs) * Math.sin(Math.PI / 4);
  ctx.beginPath();
  ctx.moveTo(-j_xy, -j_xy);
  ctx.lineTo(j_xy, j_xy);
  ctx.moveTo(-j_xy, j_xy);
  ctx.lineTo(j_xy, -j_xy);
  ctx.stroke();
});

// ---- 电容 ----
registerRenderer('capacitor', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(1 / 4 * gs), 0);
  ctx.moveTo((1 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.moveTo(-(1 / 4 * gs), -(1 / 2 * gs));
  ctx.lineTo(-(1 / 4 * gs), (1 / 2 * gs));
  ctx.moveTo((1 / 4 * gs), -(1 / 2 * gs));
  ctx.lineTo((1 / 4 * gs), (1 / 2 * gs));
  ctx.stroke();
});

// ---- 电解电容 ----
registerRenderer('electrolytic-capacitor', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-(3 / 4 * gs), 0);
  ctx.lineTo(-(1 / 4 * gs), 0);
  ctx.moveTo((1 / 4 * gs), 0);
  ctx.lineTo((3 / 4 * gs), 0);
  ctx.moveTo(-(1 / 4 * gs), -(1 / 2 * gs));
  ctx.lineTo(-(1 / 4 * gs), (1 / 2 * gs));
  ctx.moveTo((1 / 4 * gs), -(1 / 2 * gs));
  ctx.lineTo((1 / 4 * gs), (1 / 2 * gs));
  ctx.stroke();
  ctx.fillStyle = '#f00';
  ctx.fillText('+', -18, -(1 / 4 * gs));
  ctx.fillText('-', 12, -(1 / 4 * gs));
});

// ---- 二极管 ----
registerRenderer('diode', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(1 / 4 * gs + 1), 0);
  ctx.lineTo(-(1 / 4 * gs + 1), -(1 / 4 * gs + 2));
  ctx.lineTo((1 / 4 * gs), 0);
  ctx.lineTo(-(1 / 4 * gs + 1), (1 / 4 * gs + 2));
  ctx.lineTo(-(1 / 4 * gs + 1), 0);
  ctx.moveTo((1 / 4 * gs), -(1 / 4 * gs + 2));
  ctx.lineTo((1 / 4 * gs), (1 / 4 * gs + 2));
  ctx.moveTo((1 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
});

// ---- NPN 三极管 ----
registerRenderer('transistor-npn', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(0, 0);
  ctx.moveTo(0, -(3 / 4 * gs));
  ctx.lineTo(0, (3 / 4 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -(1 / 4 * gs));
  ctx.lineTo((9 / 10 * gs), -(9 / 10 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, (1 / 4 * gs));
  ctx.lineTo((9 / 10 * gs), (9 / 10 * gs));
  ctx.stroke();
  // NPN 箭头朝外
  ctx.beginPath();
  ctx.moveTo((4 / 5 * gs) - 3, (4 / 5 * gs) - 8);
  ctx.lineTo((4 / 5 * gs), (4 / 5 * gs));
  ctx.lineTo((4 / 5 * gs) - 9, (4 / 5 * gs));
  ctx.stroke();
  ctx.font = '10px sans-serif';
  ctx.fillText('NPN', -22, -12);
});

// ---- PNP 三极管 ----
registerRenderer('transistor-pnp', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(0, 0);
  ctx.moveTo(0, -(3 / 4 * gs));
  ctx.lineTo(0, (3 / 4 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -(1 / 4 * gs));
  ctx.lineTo((9 / 10 * gs), -(9 / 10 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, (1 / 4 * gs));
  ctx.lineTo((9 / 10 * gs), (9 / 10 * gs));
  ctx.stroke();
  // PNP 箭头朝内
  ctx.beginPath();
  ctx.moveTo((1 / 8 * gs), -(1 / 2 * gs + 3));
  ctx.lineTo(0, -(1 / 4 * gs));
  ctx.lineTo((1 / 4 * gs) + 3, -(1 / 4 * gs + 2));
  ctx.stroke();
  ctx.font = '10px sans-serif';
  ctx.fillText('PNP', -22, -12);
});

// ---- 接地 ----
registerRenderer('ground', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, (1 / 2 * gs));
  ctx.moveTo(-(1 / 2 * gs - 2), (1 / 2 * gs));
  ctx.lineTo((1 / 2 * gs - 2), (1 / 2 * gs));
  ctx.moveTo(-(1 / 4 * gs), (3 / 4 * gs));
  ctx.lineTo((1 / 4 * gs), (3 / 4 * gs));
  ctx.moveTo(-2, gs);
  ctx.lineTo(2, gs);
  ctx.stroke();
});

// ---- 开关 ----
registerRenderer('switch', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(0, 0);
  if (comp.state === 'closed') {
    ctx.lineTo(gs, 0);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo((1 / 2 * gs + 2), -(1 / 2 * gs));
    ctx.moveTo((1 / 2 * gs + 2), 0);
    ctx.lineTo(gs, 0);
  }
  ctx.stroke();
  ctx.font = gs / 2 + 'px sans-serif';
  ctx.fillStyle = '#999';
  ctx.fillText(comp.state === 'closed' ? '闭合' : '断开', -(1 / 2 * gs), (3 / 4 * gs));
});

// ---- 与门 ----
registerRenderer('and-gate', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-(3 / 4 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), (3 / 4 * gs));
  ctx.lineTo(-(3 / 4 * gs), (3 / 4 * gs));
  ctx.font = gs / 2 + 'px Arial';
  ctx.fillText('&', -(1 / 4 * gs), -(1 / 4 * gs));
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-gs, -gs);
  ctx.lineTo(-gs, -(1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), -(1 / 2 * gs));
  ctx.moveTo(-gs, gs);
  ctx.lineTo(-gs, (1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 2 * gs));
  ctx.moveTo(1 / 2 * gs, 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
});

// ---- 或门 ----
registerRenderer('or-gate', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-(3 / 4 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), (3 / 4 * gs));
  ctx.lineTo(-(3 / 4 * gs), (3 / 4 * gs));
  ctx.font = gs / 2 + 'px Arial';
  ctx.fillText('≥1', -(1 / 4 * gs), -(1 / 4 * gs));
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-gs, -gs);
  ctx.lineTo(-gs, -(1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), -(1 / 2 * gs));
  ctx.moveTo(-gs, gs);
  ctx.lineTo(-gs, (1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 2 * gs));
  ctx.moveTo(1 / 2 * gs, 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
});

// ---- 非门 ----
registerRenderer('not-gate', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.moveTo(-(3 / 4 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), (3 / 4 * gs));
  ctx.lineTo(-(3 / 4 * gs), (3 / 4 * gs));
  ctx.font = gs / 2 + 'px Arial';
  ctx.fillText('1', -(1 / 4 * gs), -(1 / 4 * gs));
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc((5 / 8 * gs), 0, (1 / 8 * gs), 0, Math.PI * 2);
  ctx.stroke();
});

// ---- 与非门 ----
registerRenderer('nand-gate', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.moveTo(-(3 / 4 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), (3 / 4 * gs));
  ctx.lineTo(-(3 / 4 * gs), (3 / 4 * gs));
  ctx.font = gs / 2 + 'px Arial';
  ctx.fillText('&', -(1 / 4 * gs), -(1 / 4 * gs));
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-gs, -gs);
  ctx.lineTo(-gs, -(1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), -(1 / 2 * gs));
  ctx.moveTo(-gs, gs);
  ctx.lineTo(-gs, (1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 2 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc((5 / 8 * gs), 0, (1 / 8 * gs), 0, Math.PI * 2);
  ctx.stroke();
});

// ---- 或非门 ----
registerRenderer('nor-gate', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.moveTo(-(3 / 4 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), -(3 / 4 * gs));
  ctx.lineTo((1 / 2 * gs), (3 / 4 * gs));
  ctx.lineTo(-(3 / 4 * gs), (3 / 4 * gs));
  ctx.font = gs / 2 + 'px Arial';
  ctx.fillText('≥1', -(1 / 4 * gs), -(1 / 4 * gs));
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-gs, -gs);
  ctx.lineTo(-gs, -(1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), -(1 / 2 * gs));
  ctx.moveTo(-gs, gs);
  ctx.lineTo(-gs, (1 / 2 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 2 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc((5 / 8 * gs), 0, (1 / 8 * gs), 0, Math.PI * 2);
  ctx.stroke();
});

// ============ 新增元件渲染器 ============

// ---- 电感 ----
registerRenderer('inductor', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(3 / 4 * gs), 0);
  const loops = 4, amp = (1 / 3 * gs), segW = (1.5 * gs) / (loops * 2);
  for (let i = 0; i < loops * 2; i++) {
    const x = -(3 / 4 * gs) + i * segW;
    const y = i % 2 === 0 ? -amp : amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
  if (comp.value) {
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.fillText((comp.value || '') + 'mH', -14, -(3 / 4 * gs));
  }
});

// ---- 光敏电阻 ----
registerRenderer('photoresistor', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.lineTo(-(3 / 4 * gs), -(1 / 3 * gs));
  ctx.lineTo((3 / 4 * gs), -(1 / 3 * gs));
  ctx.lineTo((3 / 4 * gs), (1 / 3 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 3 * gs));
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
  ctx.fillStyle = '#e8a020';
  ctx.beginPath();
  ctx.arc(0, -(1 / 2 * gs), 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8a020';
  ctx.lineWidth = 1;
  for (let dy = -(1 / 2 * gs) - 8; dy >= -(3 / 4 * gs) - 10; dy -= 4) {
    ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(0, dy - 3); ctx.stroke();
  }
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
});

// ---- 滑动变阻器 ----
registerRenderer('potentiometer', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.lineTo(-(3 / 4 * gs), -(1 / 3 * gs));
  ctx.lineTo((3 / 4 * gs), -(1 / 3 * gs));
  ctx.lineTo((3 / 4 * gs), (1 / 3 * gs));
  ctx.lineTo(-(3 / 4 * gs), (1 / 3 * gs));
  ctx.lineTo(-(3 / 4 * gs), 0);
  ctx.moveTo((3 / 4 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -(1 / 3 * gs) - 6);
  ctx.lineTo(0, -(1 / 3 * gs));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -(1 / 3 * gs) - 4);
  ctx.lineTo(0, -(1 / 3 * gs));
  ctx.lineTo(4, -(1 / 3 * gs) - 4);
  ctx.stroke();
});

// ---- 蜂鸣器 ----
registerRenderer('buzzer', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.arc(0, (1 / 4 * gs), (5 / 8 * gs), Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(5 / 8 * gs), 0);
  ctx.moveTo(gs, 0);
  ctx.lineTo((5 / 8 * gs), 0);
  ctx.stroke();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  const cx = (1 / 2 * gs), cy = -(1 / 4 * gs);
  for (let r = 5; r <= 14; r += 4) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
});

// ---- 保险丝 ----
registerRenderer('fuse', (ctx, comp, gs, options) => {
  ctx.beginPath();
  ctx.moveTo(-gs, 0);
  ctx.lineTo(-(5 / 8 * gs), 0);
  ctx.moveTo((5 / 8 * gs), 0);
  ctx.lineTo(gs, 0);
  ctx.stroke();
  ctx.strokeRect(-(5 / 8 * gs), -(3 / 8 * gs), (5 / 4 * gs), (3 / 4 * gs));
  ctx.beginPath();
  ctx.moveTo(-(1 / 2 * gs), 0);
  ctx.lineTo(-(1 / 4 * gs), -(1 / 6 * gs));
  ctx.lineTo(0, (1 / 6 * gs));
  ctx.lineTo((1 / 4 * gs), -(1 / 6 * gs));
  ctx.lineTo((1 / 2 * gs), 0);
  ctx.stroke();
});
