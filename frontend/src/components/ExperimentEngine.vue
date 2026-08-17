<template>
  <div class="engine-container" ref="container" data-guide="engine-container">
    <!-- 左侧工具栏（加大+可滚动） -->
    <div class="engine-sidebar" data-guide="sidebar">
      <div class="sidebar-header">元件</div>
      <div class="sidebar-components">
        <button
          v-for="comp in availableComponents"
          :key="comp"
          :class="['sidebar-btn', { active: selectedType === comp }]"
          @click="selectComponent(comp)"
          :title="getLabel(comp)"
          :data-guide="'component-btn'"
          :data-type="comp"
        >
          <img :src="getIconUrl(comp)" class="sidebar-icon" />
          <span class="sidebar-label">{{ getLabel(comp) }}</span>
        </button>
      </div>
      <div class="sidebar-divider"></div>
      <div class="sidebar-actions">
        <button class="sidebar-btn" @click="undoLast" title="撤销" data-guide="undo">
          <span class="sidebar-icon" style="font-size:22px;">↩</span>
          <span class="sidebar-label">撤销</span>
        </button>
        <button class="sidebar-btn" @click="toggleDelete" :class="{ active: isDeleteMode }" title="删除" data-guide="delete">
          <span class="sidebar-icon" style="font-size:22px;">🗑</span>
          <span class="sidebar-label">删除</span>
        </button>
        <button class="sidebar-btn" @click="showOscilloscope = !showOscilloscope" :class="{ active: showOscilloscope }" title="示波器" data-guide="oscilloscope">
          <span class="sidebar-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 10h2v7H7v-7zm4-3h2v10h-2V7zm4 6h2v4h-2v-4z"/>
            </svg>
          </span>
          <span class="sidebar-label">示波器</span>
        </button>
      </div>
      <!-- 导入/导出（调试用，由 showDebugTools 控制） -->
      <div class="sidebar-divider" v-if="showDebugTools"></div>
      <div class="sidebar-actions" v-if="showDebugTools">
        <button class="sidebar-btn" @click="exportCircuit" title="导出电路">
          <span class="sidebar-icon" style="font-size:20px;">📤</span>
          <span class="sidebar-label">导出</span>
        </button>
        <button class="sidebar-btn" @click="importCircuit" title="导入电路">
          <span class="sidebar-icon" style="font-size:20px;">📥</span>
          <span class="sidebar-label">导入</span>
        </button>
      </div>
    </div>

    <!-- 主区域（画布四周留白） -->
    <div class="engine-main">
      <div class="canvas-wrapper" data-guide="canvas">
        <canvas ref="canvas" class="engine-canvas" :style="{ cursor: canvasCursor }"></canvas>
      </div>
      <div class="grid-control" data-guide="grid-control">
        <label>网格</label>
        <input type="range" min="10" max="50" v-model.number="gridSize" title="网格大小" />
        <span class="status-hint">{{ hintText }}</span>
      </div>
    </div>

    <!-- 引脚信息提示 -->
    <div v-if="pinInfo.visible" class="pin-tooltip"
      :style="{ left: pinInfo.x + 'px', top: pinInfo.y + 'px' }">
      <div class="pin-tooltip-title">{{ pinInfo.compLabel }}</div>
      <div class="pin-tooltip-row">电压: <b>{{ pinInfo.voltage }}V</b></div>
      <div class="pin-tooltip-row">电流: <b>{{ pinInfo.current }}mA</b></div>
    </div>

    <!-- 示波器面板（可拖拽） -->
    <div v-if="showOscilloscope" class="oscilloscope-panel" :style="{ left: oscPanelX + 'px', top: oscPanelY + 'px' }">
      <div class="osc-header" @mousedown="onOscDragStart">
        <span>示波器</span>
        <select v-model="oscChannel" class="osc-channel-select">
          <option value="">选择节点...</option>
          <option v-for="(_, key) in voltageHistory" :key="key" :value="key">{{ key }}</option>
        </select>
        <button class="osc-close" @click="showOscilloscope = false">✕</button>
      </div>
      <canvas ref="oscCanvas" class="osc-canvas"></canvas>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { GoalEngine } from '../engine/goal-system.js';
import { SimulationEngine } from '../engine/simulation-engine.js';
import { drawComponent, drawWire, drawGrid as engineDrawGrid } from '../engine/circuit-draw.js';
import { getComponentPins, getActualPins, findNearestPin } from '../engine/circuit-component.js';
import { getAllNodesAndEdges } from '../engine/circuit-core.js';
import { ComponentRegistry } from '../engine/component-registry.js';

const props = defineProps({
  config: { type: Object, required: true },
  showDebugTools: { type: Boolean, default: false },
});

const emit = defineEmits(['goal-achieved', 'progress-update', 'engine-ready', 'circuit-info']);

// ======== DOM refs ========
const container = ref(null);
const canvas = ref(null);
const oscCanvas = ref(null);

// ======== 响应式状态 ========
const gridSize = ref(40);
const selectedType = ref(null);
const isDeleteMode = ref(false);
const goalResults = ref([]);
const goalProgress = ref(0);
const showOscilloscope = ref(false);
const oscChannel = ref('');
const voltageHistory = {}; // 普通对象，非 reactive（避免 Vue 追踪海量属性导致内存泄漏）

// 引脚信息弹窗
const pinInfo = reactive({
  visible: false, x: 0, y: 0,
  compLabel: '', voltage: '--', current: '--',
});

// ======== 常量 ========
const CANVAS_PADDING = 20;

// ======== 非响应式状态 ========
let ctx = null;
let oscCtx = null;
let components = [];
let simEngine = null;
let tempComponent = null;
let wireStartGrid = null;
let wireMouseGrid = null; // 导线预览目标格点
let wireBendPoints = [];  // 导线中间曲折点列表
let currentMouseX = 0;
let currentMouseY = 0;
let goalEngine = null;
let resizeObserver = null;
let oscAnimId = null;
let oscVoltageBuffer = [];
let componentRegistry = new ComponentRegistry();

// 示波器面板拖拽
const oscPanelX = ref(12);
const oscPanelY = ref(52);
let oscDragStartX = 0;
let oscDragStartY = 0;
let oscPanelStartX = 0;
let oscPanelStartY = 0;
let isOscDragging = false;

// 画布平移
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;

// 记录待放置元件的旋转角度（独立于 tempComponent，避免被 onMouseMove 覆盖）
let pendingRotation = 0;
// 缓存上一次发射的电路结构 JSON（用于变化检测）
let _prevCircuitInfoJson = '';
// 上一次发射电路结构的时刻（节流用）
let _lastCircuitInfoTime = 0;
// 缓存上一次目标结果 JSON（避免 60fps 触发响应式更新）
let _prevGoalsJson = '';

// 暴露方法给父组件
defineExpose({
  /** 获取当前电路的所有元件（含预设+用户添加） */
  getComponents: () => components,
  /** 当前选中的元件类型（引导用） */
  selectedType,
  /** 当前电路元件数量（引导用） */
  componentCount: computed(() => components.length),
  /** 从保存的元件列表恢复电路（替换当前电路，保留预设ID） */
  restoreComponents: (savedComponents) => {
    if (!Array.isArray(savedComponents) || savedComponents.length === 0) return;
    componentRegistry.reset();
    components.length = 0;
    savedComponents.forEach(comp => {
      if (comp.type !== 'wire') {
        comp.id = componentRegistry.generateId(comp.type, comp.id);
      }
      components.push(comp);
    });
    simEngine.setComponents(components);
  },
});

// ======== 计算属性 ========
const availableComponents = computed(() => props.config.availableComponents || []);

// 底部状态栏提示
const hintText = computed(() => {
  if (isDeleteMode.value) return '🗑 删除模式：左键点击元件删除 | 再次点击🗑退出';
  if (selectedType.value === 'wire') {
    if (wireStartGrid) {
      return '🔗 连线中：左键网格添加曲折点 | 左键点击引脚完成连线 | 右键/Esc取消';
    }
    return '🔗 连线模式：左键点击元件引脚开始连线 | 点击其他工具取消';
  }
  if (selectedType.value) {
    const name = labels[selectedType.value] || selectedType.value;
    return `📐 放置「${name}」：左键放置 | 右键/R键旋转 | 点击其他工具取消`;
  }
  return '🖱 Ctrl+滚轮缩放 | 右键拖拽平移画布 | 左键点击开关可切换状态';
});

// 画布光标样式
const canvasCursor = computed(() => {
  if (isPanning) return 'grabbing';
  if (isDeleteMode.value) return 'pointer';
  if (selectedType.value) return 'crosshair';
  return 'grab';
});

// 元件标签映射
const labels = {
  wire: '导线', battery: '电源', ground: '接地', switch: '开关',
  resistor: '电阻', capacitor: '电容', bulb: '灯泡', diode: '二极管',
  'transistor-npn': 'NPN', 'transistor-pnp': 'PNP',
  'and-gate': '与门', 'or-gate': '或门', 'not-gate': '非门',
  'nand-gate': '与非门', 'nor-gate': '或非门',
  inductor: '电感', photoresistor: '光敏电阻', potentiometer: '变阻器',
  buzzer: '蜂鸣器', fuse: '保险丝',
};

const iconMap = {
  wire: 'wire.png', battery: 'battery.png', ground: 'ground.png',
  switch: 'switch.png', resistor: 'resistance.png', capacitor: 'capacitance.png',
  bulb: 'bulb.png', diode: 'diode.png',
  'transistor-npn': 'transistor_npn.png', 'transistor-pnp': 'transistor_pnp.png',
  'and-gate': 'and-gate.png', 'or-gate': 'or-gate.png',
  'not-gate': 'not-gate.png', 'nand-gate': 'nand-gate.png', 'nor-gate': 'nor-gate.png',
  inductor: 'wire.png', photoresistor: 'resistance.png', potentiometer: 'resistance.png',
  buzzer: 'bulb.png', fuse: 'switch.png',
};

function getIconUrl(type) { return `/button_icons/${iconMap[type] || 'wire.png'}`; }
function getLabel(type) { return labels[type] || type; }

const snap_ = (val) => Math.round(val / gridSize.value) * gridSize.value;

// ======== 工具栏 ========
function selectComponent(type) {
  selectedType.value = selectedType.value === type ? null : type;
  isDeleteMode.value = false;
  pendingRotation = 0;
  tempComponent = null;
  wireStartGrid = null;
  wireMouseGrid = null;
  wireBendPoints = [];
}

function toggleDelete() {
  isDeleteMode.value = !isDeleteMode.value;
  selectedType.value = null;
  wireStartGrid = null;
  wireMouseGrid = null;
  wireBendPoints = [];
}

// ======== Canvas 尺寸自适应 ========
function resizeCanvas() {
  if (!canvas.value) return;
  const w = canvas.value.clientWidth;
  const h = canvas.value.clientHeight;
  if (w > 0 && h > 0 && (canvas.value.width !== w || canvas.value.height !== h)) {
    canvas.value.width = w;
    canvas.value.height = h;
  }
}

function setupResizeObserver() {
  if (!canvas.value) return;
  resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(canvas.value);
}

// ======== 初始化 ========
function initCanvas() {
  if (!canvas.value) return;
  ctx = canvas.value.getContext('2d');
  if (!ctx) return;

  // 初始尺寸同步
  resizeCanvas();

  // 用 requestAnimationFrame 确保布局完成后再同步一次
  requestAnimationFrame(() => resizeCanvas());

  setupResizeObserver();

  // 加载预设电路 + 注册 ID
  componentRegistry.reset();
  if (props.config.presetCircuit) {
    components = JSON.parse(JSON.stringify(props.config.presetCircuit.components || []));
    componentRegistry.registerPreset(components);
  }

  // 初始化目标引擎
  goalEngine = new GoalEngine(props.config);
  goalEngine.onGoal('goal_achieved', (payload) => {
    emit('goal-achieved', payload);
    updateGoals();
  });
  updateGoals();
  emit('engine-ready', { goalEngine });

  // 初始化仿真引擎
  simEngine = new SimulationEngine({
    gridSize: gridSize.value,
    goalEngine,
    onRender: (frame) => {
      if (goalEngine && frame.voltages) {
        goalEngine.setVoltages(frame.voltages);
      }
      // 追踪电压历史
      trackVoltageHistory(frame.voltages);
      draw(frame.components, frame);

      // 目标/进度仅在变化时更新响应式状态并上报（避免 60fps 触发 Vue 响应式与父组件回调）
      const goalsJson = JSON.stringify(frame.goals);
      if (goalsJson !== _prevGoalsJson) {
        _prevGoalsJson = goalsJson;
        goalResults.value = frame.goals;
        goalProgress.value = frame.progress;
        emit('progress-update', frame.progress);
      }

      // 发射电路结构信息（供 AI 使用）：降频到 ~4Hz，避免每帧重建拓扑
      if (frame.components && frame.components.length > 0) {
        const now = performance.now();
        if (now - _lastCircuitInfoTime > 250) {
          _lastCircuitInfoTime = now;
          const info = getAllNodesAndEdges(frame.components, gridSize.value);
          const infoJson = JSON.stringify({ nodes: info.nodes, edges: info.edges });
          if (infoJson !== _prevCircuitInfoJson) {
            _prevCircuitInfoJson = infoJson;
            // 构建带引脚详情的元件列表
            const gs = gridSize.value;
            const componentDetails = frame.components
              .filter(c => c.type !== 'wire')
              .map(c => {
                const pins = getActualPins(c, gs);
                const pinDefs = getComponentPins(gs)[c.type] || [];
                return {
                  id: c.id,
                  type: c.type,
                  xGrid: c.xGrid, yGrid: c.yGrid, rotation: c.rotation || 0,
                  value: c.value, state: c.state,
                  lit: c.lit,
                  pins: pins.map((p, i) => ({
                    label: pinDefs[i]?.label || `${i + 1}`,
                    x: Math.round(p.x), y: Math.round(p.y),
                    voltage: simEngine?.getVoltage(`${Math.round(p.x / gs) * gs},${Math.round(p.y / gs) * gs}`) || 0,
                  })),
                };
              });
            emit('circuit-info', {
              nodes: info.nodes,
              edges: info.edges,
              compIdMap: Object.fromEntries(info.compIdMap),
              nodeKeyMap: Object.fromEntries(info.nodeKeyMap),
              components: componentDetails,
            });
          }
        }
      }
    },
  });
  simEngine.setComponents(components);
  simEngine.start();

  // 事件绑定
  canvas.value.addEventListener('mousemove', onMouseMove);
  canvas.value.addEventListener('click', onCanvasClick);
  canvas.value.addEventListener('contextmenu', onRightClick);
  canvas.value.addEventListener('mouseleave', onMouseLeave);
  canvas.value.addEventListener('wheel', onWheel, { passive: false });
  canvas.value.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);
}

// ======== 电压历史追踪（供示波器使用）=======
const OSC_BUFFER_SIZE = 300;

function trackVoltageHistory(voltages) {
  if (!voltages) return;
  // 清除已被删除的节点键
  for (const key of Object.keys(voltageHistory)) {
    if (!(key in voltages)) delete voltageHistory[key];
  }
  // 收集当前节点数据
  for (const key of Object.keys(voltages)) {
    if (!voltageHistory[key]) {
      voltageHistory[key] = [];
    }
    voltageHistory[key].push(voltages[key]);
    // 批量裁剪：避免每帧 shift() 的 O(n) 头删开销
    if (voltageHistory[key].length > OSC_BUFFER_SIZE * 2) {
      voltageHistory[key].splice(0, voltageHistory[key].length - OSC_BUFFER_SIZE);
    }
  }
}

// ======== 渲染函数 ========
function draw(comps, frame) {
  if (!ctx || !canvas.value) return;
  const gs = gridSize.value;
  const w = canvas.value.width;
  const h = canvas.value.height;

  ctx.clearRect(0, 0, w, h);

  const viewW = w - CANVAS_PADDING * 2;
  const viewH = h - CANVAS_PADDING * 2;

  // ---- 第 1 层：网格背景（固定于视口，仅响应缩放） ----
  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);
  ctx.beginPath();
  ctx.rect(0, 0, viewW, viewH);
  ctx.clip();
  engineDrawGrid(ctx, { width: viewW, height: viewH }, gs, 0, 0);
  ctx.restore();

  // ---- 第 2 层：元件 + 导线（跟随平移偏移） ----
  ctx.save();
  ctx.translate(CANVAS_PADDING + offsetX, CANVAS_PADDING + offsetY);

  // 裁剪到可见区域（世界坐标）
  ctx.beginPath();
  ctx.rect(-offsetX, -offsetY, viewW, viewH);
  ctx.clip();

  // 导线 + 元件
  if (comps) {
    const wireSegments = [];
    comps.forEach(comp => {
      if (comp.type === 'wire') {
        const segs = getWireSegments(comp, gs);
        wireSegments.push({ comp, segs });
        drawWirePath(ctx, gs, comp);
      } else {
        drawComponent(ctx, comp, gs, getComponentPins, { lit: comp.lit });
      }
    });
    drawWireDecorations(ctx, wireSegments, gs);
  }

  // 导线预览（虚线，支持曲折点）
  if (wireStartGrid) {
    const cur = wireMouseGrid || wireStartGrid;
    ctx.save();
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    // 构建完整路径：起点 → bendPoints → 鼠标位置
    const allPoints = [
      { x: wireStartGrid.xGrid * gs, y: wireStartGrid.yGrid * gs },
      ...wireBendPoints.map(bp => ({ x: bp.xGrid * gs, y: bp.yGrid * gs })),
      { x: cur.xGrid * gs, y: cur.yGrid * gs },
    ];
    ctx.beginPath();
    ctx.moveTo(allPoints[0].x, allPoints[0].y);
    for (let i = 0; i < allPoints.length - 1; i++) {
      const a = allPoints[i], b = allPoints[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        ctx.lineTo(b.x, a.y);
      } else {
        ctx.lineTo(a.x, b.y);
      }
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    // 所有已确认的点画小圆
    ctx.fillStyle = '#1976d2';
    ctx.setLineDash([]);
    for (let i = 0; i < allPoints.length - 1; i++) {
      ctx.beginPath();
      ctx.arc(allPoints[i].x, allPoints[i].y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (tempComponent) {
    drawComponent(ctx, tempComponent, gs, getComponentPins, { lit: false });
  }

  ctx.restore();
}

// ======== 导线交叉渲染辅助 ========

/** 获取导线的所有像素坐标线段 */
function getWireSegments(comp, gs) {
  const segs = [];
  const points = [{ x: comp.xGrid * gs, y: comp.yGrid * gs }];
  if (comp.bendPoints && comp.bendPoints.length > 0) {
    comp.bendPoints.forEach(bp => points.push({ x: bp.xGrid * gs, y: bp.yGrid * gs }));
  }
  points.push({ x: comp.x2Grid * gs, y: comp.y2Grid * gs });

  for (let i = 0; i < points.length - 1; i++) {
    // 每段拆分为水平和垂直两段（L形折线）
    const a = points[i], b = points[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      const mid = { x: b.x, y: a.y };
      segs.push({ a: { ...a }, b: { ...mid } });
      segs.push({ a: { ...mid }, b: { ...b } });
    } else {
      const mid = { x: a.x, y: b.y };
      segs.push({ a: { ...a }, b: { ...mid } });
      segs.push({ a: { ...mid }, b: { ...b } });
    }
  }
  return segs;
}

/** 绘制导线路径（不含端点圆点，由 decorate 统一处理） */
function drawWirePath(ctx, gs, comp) {
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const points = [{ x: comp.xGrid * gs, y: comp.yGrid * gs }];
  if (comp.bendPoints && comp.bendPoints.length > 0) {
    comp.bendPoints.forEach(bp => points.push({ x: bp.xGrid * gs, y: bp.yGrid * gs }));
  }
  points.push({ x: comp.x2Grid * gs, y: comp.y2Grid * gs });

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      ctx.lineTo(b.x, a.y);
    } else {
      ctx.lineTo(a.x, b.y);
    }
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
}

/** 线段相交检测（仅检测水平与垂直段相交） */
function segmentIntersection(s1, s2) {
  const h1 = s1.a.y === s1.b.y; // s1 是否水平
  const h2 = s2.a.y === s2.b.y; // s2 是否水平
  if (h1 === h2) return null;   // 同向不交叉（忽略共线）

  const horz = h1 ? s1 : s2;
  const vert = h1 ? s2 : s1;

  const hx1 = Math.min(horz.a.x, horz.b.x), hx2 = Math.max(horz.a.x, horz.b.x);
  const vy1 = Math.min(vert.a.y, vert.b.y), vy2 = Math.max(vert.a.y, vert.b.y);
  const hx = vert.a.x, vy = horz.a.y;

  if (hx > hx1 && hx < hx2 && vy > vy1 && vy < vy2) {
    return { x: hx, y: vy };
  }
  return null;
}

/** 判断两个导线是否共享端点（在同一网格点连接） */
function wiresShareEndpoint(segsA, segsB, gs) {
  const epsA = new Set();
  for (const seg of segsA) {
    epsA.add(`${Math.round(seg.a.x / gs)},${Math.round(seg.a.y / gs)}`);
    epsA.add(`${Math.round(seg.b.x / gs)},${Math.round(seg.b.y / gs)}`);
  }
  for (const seg of segsB) {
    if (epsA.has(`${Math.round(seg.a.x / gs)},${Math.round(seg.a.y / gs)}`)) return true;
    if (epsA.has(`${Math.round(seg.b.x / gs)},${Math.round(seg.b.y / gs)}`)) return true;
  }
  return false;
}

/** 绘制导线连接点和交叉装饰 */
function drawWireDecorations(ctx, wireSegments, gs) {
  // 1. 收集所有端点（含折点），检测多线交汇
  const endpointMap = new Map(); // key -> [{wireIdx, segIdx, isEndpoint}]
  const allSegments = [];        // {a, b, wireIdx, segIdx}

  wireSegments.forEach(({ comp, segs }, wIdx) => {
    segs.forEach((seg, sIdx) => {
      allSegments.push({ ...seg, wireIdx: wIdx, segIdx: sIdx });
    });
  });

  // 2. 绘制所有导线端点圆点
  ctx.fillStyle = '#333';
  wireSegments.forEach(({ comp, segs }) => {
    // 起点
    const sx = comp.xGrid * gs, sy = comp.yGrid * gs;
    ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, Math.PI * 2); ctx.fill();
    // 终点
    const ex = comp.x2Grid * gs, ey = comp.y2Grid * gs;
    ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
    // 弯曲节点
    if (comp.bendPoints) {
      comp.bendPoints.forEach(bp => {
        ctx.beginPath();
        ctx.arc(bp.xGrid * gs, bp.yGrid * gs, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });

  // 3. 检测线段交叉：不同导线且不共享端点 → 画跨越弧
  const drawnCrossings = new Set();
  for (let i = 0; i < allSegments.length; i++) {
    for (let j = i + 1; j < allSegments.length; j++) {
      if (allSegments[i].wireIdx === allSegments[j].wireIdx) continue;
      const pt = segmentIntersection(allSegments[i], allSegments[j]);
      if (!pt) continue;

      const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
      if (drawnCrossings.has(key)) continue;

      // 检查是否共享端点（共享端点 = 连接点，不是交叉）
      const segsA = wireSegments[allSegments[i].wireIdx].segs;
      const segsB = wireSegments[allSegments[j].wireIdx].segs;
      if (wiresShareEndpoint(segsA, segsB, gs)) continue;

      drawnCrossings.add(key);
      // 在交叉点画小半圆弧表示跨越（画在垂直线段上）
      const seg = allSegments[i].a.y === allSegments[i].b.y ? allSegments[j] : allSegments[i];
      const isVert = seg.a.x === seg.b.x;
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (isVert) {
        ctx.arc(pt.x, pt.y, 5, -Math.PI / 2, Math.PI / 2, false);
      } else {
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI, false);
      }
      ctx.stroke();
      // 重绘底层线段被遮盖的部分
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (isVert) {
        ctx.arc(pt.x, pt.y, 5, -Math.PI / 2, Math.PI / 2, false);
      } else {
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI, false);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ======== 坐标工具 ========
/** 将 canvas 像素坐标转换为引擎网格坐标（减去内边距和画布平移偏移） */
function pixelToGrid(px, py) {
  const gs = gridSize.value;
  return {
    xGrid: Math.round((px - CANVAS_PADDING - offsetX) / gs),
    yGrid: Math.round((py - CANVAS_PADDING - offsetY) / gs),
  };
}

// ======== 鼠标事件 ========
function onMouseMove(e) {
  if (!canvas.value) return;
  const rect = canvas.value.getBoundingClientRect();
  currentMouseX = e.clientX - rect.left;
  currentMouseY = e.clientY - rect.top;

  // 右键拖拽平移
  if (isPanning) {
    offsetX = panStartOffsetX + (currentMouseX - panStartX);
    offsetY = panStartOffsetY + (currentMouseY - panStartY);
    return;
  }

  const { xGrid, yGrid } = pixelToGrid(currentMouseX, currentMouseY);

  // 导线预览：追踪鼠标格点
  if (selectedType.value === 'wire') {
    wireMouseGrid = { xGrid, yGrid };
  }

  // 临时元件预览（保持 pendingRotation 不被覆盖）
  if (selectedType.value && selectedType.value !== 'wire') {
    if (!tempComponent) {
      tempComponent = {
        xGrid, yGrid,
        type: selectedType.value,
        rotation: pendingRotation,
      };
    } else {
      tempComponent.xGrid = xGrid;
      tempComponent.yGrid = yGrid;
    }
  }

  // 检测是否靠近引脚（显示电压信息）
  detectPinHover();
}

function detectPinHover() {
  if (!canvas.value || !simEngine || components.length === 0) {
    pinInfo.visible = false;
    return;
  }

  const gs = gridSize.value;
  let found = false;

  // ---- 先检测元件引脚 ----
  for (const comp of components) {
    if (comp.type === 'wire') continue;
    const pins = getActualPins(comp, gs);
    const pinDefs = getComponentPins(gs)[comp.type] || [];
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      const cx = pin.x + CANVAS_PADDING + offsetX;
      const cy = pin.y + CANVAS_PADDING + offsetY;
      const dist = Math.hypot(currentMouseX - cx, currentMouseY - cy);
      if (dist < 12) {
        const key = `${snap_(pin.x)},${snap_(pin.y)}`;
        const v = simEngine.getVoltage(key);
        const pinLabel = pinDefs[i]?.label || '';
        const compLabel = (labels[comp.type] || comp.type) + (comp.id ? ` (${comp.id})` : '') + (pinLabel ? ` [${pinLabel}]` : '');
        // 计算电流：对两端元件用欧姆定律
        let current = '--';
        if (pins.length >= 2 && comp.value) {
          const k1 = `${snap_(pins[0].x)},${snap_(pins[0].y)}`;
          const k2 = `${snap_(pins[pins.length - 1].x)},${snap_(pins[pins.length - 1].y)}`;
          const v1 = simEngine.getVoltage(k1);
          const v2 = simEngine.getVoltage(k2);
          const vDiff = Math.abs(v1 - v2);
          if (comp.type === 'resistor' || comp.type === 'bulb') {
            current = (vDiff / comp.value * 1000).toFixed(2);
          } else if (comp.type === 'diode') {
            current = vDiff > 0.6 ? ((vDiff - 0.6) / 10 * 1000).toFixed(2) : '0.00';
          }
        }

        pinInfo.visible = true;
        pinInfo.x = currentMouseX + 15;
        pinInfo.y = currentMouseY - 10;
        pinInfo.compLabel = compLabel;
        pinInfo.voltage = v.toFixed(3);
        pinInfo.current = current;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // ---- 再检测导线端点 ----
  if (!found) {
    for (const comp of components) {
      if (comp.type !== 'wire') continue;
      const endpoints = [
        { x: comp.xGrid * gs, y: comp.yGrid * gs, label: '端点A' },
        { x: comp.x2Grid * gs, y: comp.y2Grid * gs, label: '端点B' },
      ];
      // 也检查弯曲节点
      if (comp.bendPoints) {
        comp.bendPoints.forEach((bp, idx) => {
          endpoints.push({ x: bp.xGrid * gs, y: bp.yGrid * gs, label: `拐点${idx + 1}` });
        });
      }
      for (const ep of endpoints) {
        const cx = ep.x + CANVAS_PADDING + offsetX;
        const cy = ep.y + CANVAS_PADDING + offsetY;
        const dist = Math.hypot(currentMouseX - cx, currentMouseY - cy);
        if (dist < 12) {
          const key = `${snap_(ep.x)},${snap_(ep.y)}`;
          const v = simEngine.getVoltage(key);
          pinInfo.visible = true;
          pinInfo.x = currentMouseX + 15;
          pinInfo.y = currentMouseY - 10;
          pinInfo.compLabel = `导线 ${ep.label}`;
          pinInfo.voltage = v.toFixed(3);
          pinInfo.current = '--'; // 导线电流需支路分析
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  if (!found) {
    pinInfo.visible = false;
  }
}

function onCanvasClick(e) {
  if (!ctx || !canvas.value) return;

  // 未选择工具时，点击已有开关可切换状态
  if (!isDeleteMode.value && !selectedType.value) {
    const gs = gridSize.value;
    const { xGrid, yGrid } = pixelToGrid(currentMouseX, currentMouseY);
    for (const c of components) {
      if (c.type === 'switch' && c.xGrid === xGrid && c.yGrid === yGrid) {
        c.state = c.state === 'closed' ? 'open' : 'closed';
        if (goalEngine) goalEngine.fireEvent('switch:toggle', { component: c, state: c.state });
        if (simEngine) simEngine.markDirty();
        return;
      }
    }
  }

  // ---- 删除模式：点击已有元件将其删除 ----
  if (isDeleteMode.value) {
    const gs = gridSize.value;
    const { xGrid, yGrid } = pixelToGrid(currentMouseX, currentMouseY);
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      // 元件中心匹配
      let isMatch = (c.xGrid === xGrid && c.yGrid === yGrid);
      // 导线额外匹配端点 + 弯曲节点
      if (!isMatch && c.type === 'wire') {
        isMatch = (c.x2Grid === xGrid && c.y2Grid === yGrid);
        if (!isMatch && c.bendPoints) {
          isMatch = c.bendPoints.some(bp => bp.xGrid === xGrid && bp.yGrid === yGrid);
        }
      }
      if (!isMatch) continue;
      if (c.type !== 'wire') componentRegistry.removeId(c.id);
      const removedType = c.type;
      components.splice(i, 1);
      if (goalEngine) goalEngine.fireEvent('component:remove:' + removedType, { component: c });
      if (simEngine) simEngine.reset();
      break;
    }
    return;
  }

  if (!selectedType.value) return;

  const gs = gridSize.value;
  const { xGrid, yGrid } = pixelToGrid(currentMouseX, currentMouseY);

  if (selectedType.value === 'wire') {
    // 吸附到最近的元件引脚（返回 { xGrid, yGrid, isPin } ）
    const snapToPin = (xG, yG) => {
      const gs = gridSize.value;
      let nearest = { xGrid: xG, yGrid: yG, isPin: false };
      let minDist = gs * 1.2;
      for (const comp of components) {
        if (comp.type === 'wire') continue;
        const pins = getActualPins(comp, gs);
        for (const pin of pins) {
          const px = Math.round(pin.x / gs);
          const py = Math.round(pin.y / gs);
          const dist = Math.hypot(px - xG, py - yG);
          if (dist < minDist) {
            minDist = dist;
            nearest = { xGrid: px, yGrid: py, isPin: true };
          }
        }
      }
      // 未吸附到引脚但靠近元件中心时，吸附到最近引脚
      if (!nearest.isPin) {
        for (const comp of components) {
          if (comp.type === 'wire') continue;
          const dist = Math.hypot((comp.xGrid || 0) - xG, (comp.yGrid || 0) - yG);
          if (dist < 0.5) {
            const pins = getActualPins(comp, gs);
            let minPinDist = Infinity;
            for (const pin of pins) {
              const px = Math.round(pin.x / gs);
              const py = Math.round(pin.y / gs);
              const d = Math.hypot(px - xG, py - yG);
              if (d < minPinDist) {
                minPinDist = d;
                nearest = { xGrid: px, yGrid: py, isPin: true };
              }
            }
            break;
          }
        }
      }
      return nearest;
    };

    // 起点吸附
    if (!wireStartGrid) {
      const snapped = snapToPin(xGrid, yGrid);
      wireStartGrid = snapped;
      wireBendPoints = [];
      return;
    }

    // 终点吸附：检测是否在元件引脚上
    const snappedEnd = snapToPin(xGrid, yGrid);
    const isOnPin = snappedEnd.isPin;

    // 避免零长度线段
    const lastPoint = wireBendPoints.length > 0
      ? wireBendPoints[wireBendPoints.length - 1]
      : wireStartGrid;
    const sameAsLast = snappedEnd.xGrid === lastPoint.xGrid && snappedEnd.yGrid === lastPoint.yGrid;

    if (!sameAsLast) {
      if (isOnPin) {
        // 点击在引脚上 → 自动结束布线
        const wireComp = {
          type: 'wire',
          xGrid: wireStartGrid.xGrid,
          yGrid: wireStartGrid.yGrid,
          x2Grid: snappedEnd.xGrid,
          y2Grid: snappedEnd.yGrid,
        };
        if (wireBendPoints.length > 0) {
          wireComp.bendPoints = [...wireBendPoints];
        }
        components.push(wireComp);
        wireStartGrid = null;
        wireMouseGrid = null;
        wireBendPoints = [];
        if (goalEngine) goalEngine.fireEvent('component:add:wire', { component: wireComp });
        if (simEngine) simEngine.markDirty();
        return;
      } else {
        // 不在引脚上 → 添加曲折点
        wireBendPoints.push({ xGrid: snappedEnd.xGrid, yGrid: snappedEnd.yGrid });
      }
    }
    return;
  }

  const newComp = {
    xGrid, yGrid,
    type: selectedType.value,
    rotation: pendingRotation,
    state: (selectedType.value === 'switch' || selectedType.value === 'fuse') ? 'closed' : undefined,
    value: (['resistor', 'bulb', 'photoresistor', 'potentiometer', 'buzzer'].includes(selectedType.value)) ? 100
         : (selectedType.value === 'inductor') ? 10
         : (selectedType.value === 'capacitor') ? 100 : undefined,
    beta: (selectedType.value === 'transistor-npn' || selectedType.value === 'transistor-pnp') ? 100 : undefined,
    lit: false,
  };
  // 分配唯一 ID
  newComp.id = componentRegistry.generateId(newComp.type);
  components.push(newComp);
  if (goalEngine) goalEngine.fireEvent('component:add:' + newComp.type, { component: newComp });
  if (simEngine) simEngine.markDirty();
  tempComponent = null;
  pendingRotation = 0;
  selectedType.value = null;
}

// ======== 示波器面板拖拽 ========
function onOscDragStart(e) {
  // 点击 select/button 时不拖拽，避免干扰下拉和关闭
  const tag = e.target.tagName;
  if (tag === 'SELECT' || tag === 'OPTION' || tag === 'BUTTON') return;
  isOscDragging = true;
  oscDragStartX = e.clientX;
  oscDragStartY = e.clientY;
  oscPanelStartX = oscPanelX.value;
  oscPanelStartY = oscPanelY.value;
  window.addEventListener('mousemove', onOscDragMove);
  window.addEventListener('mouseup', onOscDragEnd);
}

function onOscDragMove(e) {
  if (!isOscDragging) return;
  oscPanelX.value = Math.max(0, oscPanelStartX + (e.clientX - oscDragStartX));
  oscPanelY.value = Math.max(0, oscPanelStartY + (e.clientY - oscDragStartY));
}

function onOscDragEnd() {
  isOscDragging = false;
  window.removeEventListener('mousemove', onOscDragMove);
  window.removeEventListener('mouseup', onOscDragEnd);
}

// ======== 画布平移（右键拖拽） ========
function onMouseDown(e) {
  if (e.button === 2) {
    // 右键：不在放置模式且不在连线中 → 开始平移
    if (!selectedType.value && !isDeleteMode.value && !wireStartGrid) {
      e.preventDefault();
      isPanning = true;
      panStartX = currentMouseX;
      panStartY = currentMouseY;
      panStartOffsetX = offsetX;
      panStartOffsetY = offsetY;
    }
  }
}

function onMouseUp(e) {
  if (e.button === 2 && isPanning) {
    isPanning = false;
    // 松手时吸附到网格，确保元件与背景网格对齐
    const gs = gridSize.value;
    offsetX = Math.round(offsetX / gs) * gs;
    offsetY = Math.round(offsetY / gs) * gs;
  }
}

function onRightClick(e) {
  e.preventDefault();
  // 布线模式中右键：取消当前布线
  if (wireStartGrid) {
    wireStartGrid = null;
    wireMouseGrid = null;
    wireBendPoints = [];
    return;
  }
  // 放置元件模式下右键：旋转待放置元件
  if (selectedType.value && selectedType.value !== 'wire') {
    pendingRotation = (pendingRotation + 90) % 360;
    if (tempComponent) {
      tempComponent.rotation = pendingRotation;
    }
  }
  // 否则：右键用于平移画布（由 onMouseDown/onMouseUp 处理）
}

function onMouseLeave() {
  tempComponent = null;
  wireMouseGrid = null;
  pinInfo.visible = false;
  isPanning = false;
  // 不清理 wireStartGrid/wireBendPoints，离开画布再回来时可继续布线
}

// ======== 滚轮缩放（Ctrl+滚轮，以鼠标为中心） ========
function onWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const rect = canvas.value.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldGS = gridSize.value;
    const delta = e.deltaY > 0 ? -2 : 2;
    const newGS = Math.max(10, Math.min(50, oldGS + delta));
    if (newGS === oldGS) return;

    // 鼠标在世界坐标系中的位置（缩放前）
    const worldX = (mx - CANVAS_PADDING - offsetX) / oldGS;
    const worldY = (my - CANVAS_PADDING - offsetY) / oldGS;
    // 更新网格大小
    gridSize.value = newGS;
    // 调整偏移，使世界坐标中的同一点保持在鼠标下方
    offsetX = mx - CANVAS_PADDING - worldX * newGS;
    offsetY = my - CANVAS_PADDING - worldY * newGS;
  }
}

// ======== 键盘快捷键 ========
function onKeyDown(e) {
  // Ctrl+S：导出电路
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    exportCircuit();
    return;
  }
  // Ctrl+Z：撤销
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLast();
    return;
  }
  // Delete / Backspace：删除模式
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 不阻止默认（输入框中仍需正常删除），仅在画布区域生效
    if (document.activeElement === canvas.value || document.activeElement === document.body) {
      e.preventDefault();
      isDeleteMode.value = !isDeleteMode.value;
      selectedType.value = null;
    }
    return;
  }
  // R 键：旋转待放置元件
  if (e.key === 'r' || e.key === 'R') {
    if (document.activeElement === canvas.value || document.activeElement === document.body) {
      e.preventDefault();
      pendingRotation = (pendingRotation + 90) % 360;
      if (tempComponent) {
        tempComponent.rotation = pendingRotation;
      }
    }
    return;
  }
  // Escape：取消当前操作
  if (e.key === 'Escape') {
    selectedType.value = null;
    isDeleteMode.value = false;
    tempComponent = null;
    wireStartGrid = null;
    wireMouseGrid = null;
    wireBendPoints = [];
    pendingRotation = 0;
  }
}

function undoLast() {
  const removed = components.pop();
  if (removed) componentRegistry.removeId(removed.id);
  if (simEngine) simEngine.markDirty();
}

// ======== 电路导入/导出 ========
function exportCircuit() {
  const data = JSON.stringify(components, null, 2);
  console.log('📤 导出电路数据:', data);
  // 同时提供文件下载
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `circuit_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importCircuit() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) {
          alert('无效的电路文件：数据格式错误');
          return;
        }
        // 替换当前电路并重置注册表
        componentRegistry.reset();
        components.length = 0;
        imported.forEach(comp => {
          if (comp.type !== 'wire') {
            comp.id = componentRegistry.generateId(comp.type, comp.id);
          }
          components.push(comp);
        });
        simEngine.setComponents(components);
        if (goalEngine) goalEngine.fireEvent('circuit:imported', {});
      } catch (err) {
        alert('导入失败：' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function updateGoals() {
  if (!goalEngine) return;
  goalResults.value = goalEngine.getResults();
  goalProgress.value = goalEngine.getProgress();
}

// ======== 示波器渲染 ========
function drawOscilloscope() {
  if (!oscCanvas.value) return;
  if (!oscCtx) oscCtx = oscCanvas.value.getContext('2d');
  const c = oscCtx;
  const w = oscCanvas.value.width;
  const h = oscCanvas.value.height;

  c.clearRect(0, 0, w, h);

  // 背景
  c.fillStyle = '#0a0a1a';
  c.fillRect(0, 0, w, h);

  // 网格
  c.strokeStyle = '#1a2a3a';
  c.lineWidth = 1;
  for (let x = 0; x <= w; x += 30) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
  }
  for (let y = 0; y <= h; y += 30) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
  }

  // 中线
  c.strokeStyle = '#2a4a6a';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();

  // 无信号提示
  if (!oscChannel.value || !voltageHistory[oscChannel.value]) {
    c.fillStyle = '#556';
    c.font = '14px sans-serif';
    c.textAlign = 'center';
    c.fillText('无信号', w / 2, h / 2);
    c.textAlign = 'start';
    oscAnimId = requestAnimationFrame(drawOscilloscope);
    return;
  }

  // 绘制波形（只取最近 OSC_BUFFER_SIZE 个采样点）
  const data = voltageHistory[oscChannel.value];
  const len = data.length;
  if (len < 2) {
    oscAnimId = requestAnimationFrame(drawOscilloscope);
    return;
  }
  const start = Math.max(0, len - OSC_BUFFER_SIZE);

  c.strokeStyle = '#00ff88';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = start; i < len; i++) {
    const x = ((i - start) / OSC_BUFFER_SIZE) * w;
    // 电压映射：0-5V → 底部到顶部
    const yNorm = Math.max(0, Math.min(1, data[i] / 5));
    const y = h - yNorm * h;
    if (i === start) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();

  // 显示当前值
  c.fillStyle = '#00ff88';
  c.font = '11px monospace';
  const lastV = data[len - 1];
  c.fillText(`${lastV.toFixed(3)}V`, 6, 14);

  // 显示通道名
  c.fillStyle = '#88aacc';
  c.fillText(oscChannel.value, 6, h - 6);

  oscAnimId = requestAnimationFrame(drawOscilloscope);
}

// 监听示波器开关 + 通道变化
import { watch } from 'vue';

// 网格大小变化时同步仿真引擎（修复电压键不匹配 bug）
watch(gridSize, (newSize) => {
  if (simEngine) {
    simEngine.GRID_SIZE = newSize;
    simEngine.reset();
    // 清空电压历史（坐标键已随 gridSize 改变）
    for (const key of Object.keys(voltageHistory)) {
      delete voltageHistory[key];
    }
    _prevCircuitInfoJson = '';
    // 通知目标引擎重建
    if (goalEngine) goalEngine.fireEvent('grid:changed', { gridSize: newSize });
  }
});

watch(showOscilloscope, (val) => {
  if (val) {
    nextTick(() => {
      if (oscCanvas.value) {
        oscCanvas.value.width = oscCanvas.value.clientWidth || 280;
        oscCanvas.value.height = oscCanvas.value.clientHeight || 160;
      }
      drawOscilloscope();
    });
  } else {
    if (oscAnimId) cancelAnimationFrame(oscAnimId);
  }
});

// ======== 生命周期 ========
onMounted(() => {
  initCanvas();
});

onBeforeUnmount(() => {
  if (simEngine) simEngine.stop();
  if (resizeObserver) resizeObserver.disconnect();
  if (oscAnimId) cancelAnimationFrame(oscAnimId);
  if (canvas.value) {
    canvas.value.removeEventListener('mousemove', onMouseMove);
    canvas.value.removeEventListener('click', onCanvasClick);
    canvas.value.removeEventListener('contextmenu', onRightClick);
    canvas.value.removeEventListener('mouseleave', onMouseLeave);
    canvas.value.removeEventListener('wheel', onWheel);
    canvas.value.removeEventListener('mousedown', onMouseDown);
  }
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('keydown', onKeyDown);
  // 拖拽残留清理
  if (isOscDragging) onOscDragEnd();
});

</script>

<style scoped>
.engine-container {
  width: 100%;
  height: 100%;
  display: flex;
  background: #fff;
  overflow: hidden;
  position: relative;
}

/* ---- 左侧边栏（加大+可滚动） ---- */
.engine-sidebar {
  width: 96px;
  min-width: 96px;
  display: flex;
  flex-direction: column;
  background: #f0f3f7;
  border-right: 1px solid #dce1e8;
  overflow: hidden;
  user-select: none;
}

.sidebar-header {
  padding: 12px 0 6px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  letter-spacing: 2px;
  border-bottom: 1px solid #dce1e8;
}

.sidebar-components {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  scrollbar-width: thin;
}

.sidebar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 82px;
  padding: 8px 2px 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  color: #555;
  transition: all 0.15s;
}
.sidebar-btn:hover {
  background: #e4eaf3;
  border-color: #c5d5ea;
  color: #1976d2;
}
.sidebar-btn.active {
  background: #1976d2;
  border-color: #1976d2;
  color: #fff;
}
.sidebar-btn.active .sidebar-icon {
  filter: brightness(10);
}

.sidebar-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.sidebar-label {
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  font-size: 11px;
}

.sidebar-divider {
  width: 64px;
  height: 1px;
  background: #d0d7e4;
  margin: 4px auto;
  flex-shrink: 0;
}

.sidebar-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 8px;
}

/* ---- 主区域 ---- */
.engine-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fb;
  padding: 10px;
  min-height: 0;
}

.engine-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.grid-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: #fafbfc;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #888;
  flex-shrink: 0;
}
.grid-control label {
  white-space: nowrap;
}
.grid-control input[type="range"] {
  width: 120px;
  accent-color: #1976d2;
}
.grid-control .save-hint,
.grid-control .status-hint {
  margin-left: auto;
  font-size: 11px;
  color: #aaa;
  cursor: default;
  user-select: none;
}
.status-hint {
  color: #999;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- 引脚信息提示 ---- */
.pin-tooltip {
  position: fixed;
  z-index: 500;
  background: rgba(30, 30, 40, 0.94);
  color: #eee;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  min-width: 100px;
}
.pin-tooltip-title {
  font-weight: 600;
  color: #5ab5ff;
  margin-bottom: 2px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 2px;
}
.pin-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.pin-tooltip-row b {
  color: #7fdbff;
}

/* ---- 示波器面板（可拖拽） ---- */
.oscilloscope-panel {
  position: absolute;
  right: auto;
  bottom: auto;
  width: 300px;
  height: 200px;
  background: #0d0d1a;
  border-radius: 8px;
  border: 1px solid #2a3a4a;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  z-index: 400;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.osc-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #1a2a3a;
  color: #88aacc;
  font-size: 11px;
  font-weight: 600;
  cursor: grab;
  user-select: none;
}
.osc-header:active {
  cursor: grabbing;
}
.osc-channel-select {
  flex: 1;
  background: #0d1a2a;
  color: #aac;
  border: 1px solid #2a4a6a;
  border-radius: 3px;
  font-size: 10px;
  padding: 2px 4px;
}
.osc-close {
  background: none;
  border: none;
  color: #88aacc;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
}
.osc-canvas {
  flex: 1;
  width: 100%;
}


</style>
