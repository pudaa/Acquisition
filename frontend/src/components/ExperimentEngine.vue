<template>
  <div class="engine-container" ref="container">
    <!-- 左侧工具栏（加大+可滚动） -->
    <div class="engine-sidebar">
      <div class="sidebar-header">元件</div>
      <div class="sidebar-components">
        <button
          v-for="comp in availableComponents"
          :key="comp"
          :class="['sidebar-btn', { active: selectedType === comp }]"
          @click="selectComponent(comp)"
          :title="getLabel(comp)"
        >
          <img :src="getIconUrl(comp)" class="sidebar-icon" />
          <span class="sidebar-label">{{ getLabel(comp) }}</span>
        </button>
      </div>
      <div class="sidebar-divider"></div>
      <div class="sidebar-actions">
        <button class="sidebar-btn" @click="undoLast" title="撤销">
          <span class="sidebar-icon" style="font-size:22px;">↩</span>
          <span class="sidebar-label">撤销</span>
        </button>
        <button class="sidebar-btn" @click="toggleDelete" :class="{ active: isDeleteMode }" title="删除">
          <span class="sidebar-icon" style="font-size:22px;">🗑</span>
          <span class="sidebar-label">删除</span>
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
      <div class="canvas-wrapper">
        <canvas ref="canvas" class="engine-canvas"></canvas>
      </div>
      <div class="grid-control">
        <label>网格</label>
        <input type="range" min="10" max="50" v-model.number="gridSize" title="网格大小" />
        <span class="save-hint" title="Ctrl+S 保存电路">Ctrl+S 保存</span>
      </div>
    </div>

    <!-- 引脚信息提示 -->
    <div v-if="pinInfo.visible" class="pin-tooltip"
      :style="{ left: pinInfo.x + 'px', top: pinInfo.y + 'px' }">
      <div class="pin-tooltip-title">{{ pinInfo.compLabel }}</div>
      <div class="pin-tooltip-row">电压: <b>{{ pinInfo.voltage }}V</b></div>
      <div class="pin-tooltip-row">电流: <b>{{ pinInfo.current }}mA</b></div>
    </div>

    <!-- 示波器面板 -->
    <div v-if="showOscilloscope" class="oscilloscope-panel">
      <div class="osc-header">
        <span>示波器</span>
        <select v-model="oscChannel" class="osc-channel-select">
          <option value="">选择节点...</option>
          <option v-for="(_, key) in voltageHistory" :key="key" :value="key">{{ key }}</option>
        </select>
        <button class="osc-close" @click="showOscilloscope = false">✕</button>
      </div>
      <canvas ref="oscCanvas" class="osc-canvas"></canvas>
    </div>

    <!-- 示波器开关按钮 -->
    <button class="osc-toggle" @click="showOscilloscope = !showOscilloscope" title="示波器">
      �
〰
    </button>
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
let currentMouseX = 0;
let currentMouseY = 0;
let goalEngine = null;
let resizeObserver = null;
let oscAnimId = null;
let oscVoltageBuffer = [];
let componentRegistry = new ComponentRegistry();

// 记录待放置元件的旋转角度（独立于 tempComponent，避免被 onMouseMove 覆盖）
let pendingRotation = 0;
// 缓存上一次发射的电路结构 JSON（用于变化检测）
let _prevCircuitInfoJson = '';

// 暴露方法给父组件
defineExpose({
  /** 获取当前电路的所有元件（含预设+用户添加） */
  getComponents: () => components,
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

// 元件标签映射
const labels = {
  wire: '导线', battery: '电源', ground: '接地', switch: '开关',
  resistor: '电阻', capacitor: '电容', bulb: '灯泡', diode: '二极管',
  'transistor-npn': 'NPN', 'transistor-pnp': 'PNP',
  'and-gate': '与门', 'or-gate': '或门', 'not-gate': '非门',
  'nand-gate': '与非门', 'nor-gate': '或非门',
};

const iconMap = {
  wire: 'wire.png', battery: 'battery.png', ground: 'ground.png',
  switch: 'switch.png', resistor: 'resistance.png', capacitor: 'capacitance.png',
  bulb: 'bulb.png', diode: 'diode.png',
  'transistor-npn': 'transistor_npn.png', 'transistor-pnp': 'transistor_pnp.png',
  'and-gate': 'and-gate.png', 'or-gate': 'or-gate.png',
  'not-gate': 'not-gate.png', 'nand-gate': 'nand-gate.png', 'nor-gate': 'nor-gate.png',
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
}

function toggleDelete() { isDeleteMode.value = !isDeleteMode.value; selectedType.value = null; }

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
      goalResults.value = frame.goals;
      goalProgress.value = frame.progress;
      emit('progress-update', frame.progress);

      // 发射电路结构信息（供 AI 使用，仅在变化时更新）
      if (frame.components && frame.components.length > 0) {
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
    },
  });
  simEngine.setComponents(components);
  simEngine.start();

  // 事件绑定
  canvas.value.addEventListener('mousemove', onMouseMove);
  canvas.value.addEventListener('click', onCanvasClick);
  canvas.value.addEventListener('contextmenu', onRightClick);
  canvas.value.addEventListener('mouseleave', onMouseLeave);
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
    if (voltageHistory[key].length > OSC_BUFFER_SIZE) {
      voltageHistory[key].shift();
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

  // 留出内边距
  ctx.save();
  ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

  // 裁剪区域
  ctx.beginPath();
  ctx.rect(0, 0, w - CANVAS_PADDING * 2, h - CANVAS_PADDING * 2);
  ctx.clip();

  // 网格
  engineDrawGrid(ctx, { width: w - CANVAS_PADDING * 2, height: h - CANVAS_PADDING * 2 }, gs, 0, 0);

  // 导线 + 元件
  if (comps) {
    comps.forEach(comp => {
      if (comp.type === 'wire') {
        drawWire(ctx, gs,
          { x: comp.xGrid * gs, y: comp.yGrid * gs },
          { x: comp.x2Grid * gs, y: comp.y2Grid * gs }
        );
      } else {
        drawComponent(ctx, comp, gs, getComponentPins, { lit: comp.lit });
      }
    });
  }

  // 导线预览（虚线，L形折线，与真实导线绘制一致）
  if (wireStartGrid) {
    const cur = wireMouseGrid || wireStartGrid;
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    const sx = wireStartGrid.xGrid * gs;
    const sy = wireStartGrid.yGrid * gs;
    const ex = cur.xGrid * gs;
    const ey = cur.yGrid * gs;
    const dx = ex - sx;
    const dy = ey - sy;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (Math.abs(dx) > Math.abs(dy)) {
      ctx.lineTo(ex, sy);
    } else {
      ctx.lineTo(sx, ey);
    }
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // 起点圆点
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (tempComponent) {
    drawComponent(ctx, tempComponent, gs, getComponentPins, { lit: false });
  }

  ctx.restore();
}

// ======== 坐标工具 ========
/** 将 canvas 像素坐标转换为引擎网格坐标（减去内边距偏移） */
function pixelToGrid(px, py) {
  const gs = gridSize.value;
  return {
    xGrid: Math.round((px - CANVAS_PADDING) / gs),
    yGrid: Math.round((py - CANVAS_PADDING) / gs),
  };
}

// ======== 鼠标事件 ========
function onMouseMove(e) {
  if (!canvas.value) return;
  const rect = canvas.value.getBoundingClientRect();
  // 坐标已与 canvas 分辨率匹配（resizeCanvas 保持同步）
  currentMouseX = e.clientX - rect.left;
  currentMouseY = e.clientY - rect.top;

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

  for (const comp of components) {
    if (comp.type === 'wire') continue;
    const pins = getActualPins(comp, gs);
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      // 转换到 canvas 坐标（匹配 ctx.translate 偏移）
      const cx = pin.x + CANVAS_PADDING;
      const cy = pin.y + CANVAS_PADDING;
      const dist = Math.hypot(currentMouseX - cx, currentMouseY - cy);
      if (dist < 12) {
        // 构造电压键
        const key = `${snap_(pin.x)},${snap_(pin.y)}`;
        const v = simEngine.getVoltage(key);
        const compLabel = (labels[comp.type] || comp.type) + (comp.id ? ` (${comp.id})` : '');
        // 计算电流（通过电压/电阻近似）
        let current = '--';
        if (comp.value && comp.type === 'resistor') {
          const pins2 = getActualPins(comp, gs);
          if (pins2.length >= 2) {
            const k1 = `${snap_(pins2[0].x)},${snap_(pins2[0].y)}`;
            const k2 = `${snap_(pins2[pins2.length - 1].x)},${snap_(pins2[pins2.length - 1].y)}`;
            const v1 = simEngine.getVoltage(k1);
            const v2 = simEngine.getVoltage(k2);
            current = (Math.abs(v1 - v2) / comp.value * 1000).toFixed(2);
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
      if (c.xGrid === xGrid && c.yGrid === yGrid) {
        // 检查是否匹配：元件匹配中心坐标，导线匹配任意端点
        let isMatch = true;
        if (c.type === 'wire') {
          isMatch = (c.xGrid === xGrid && c.yGrid === yGrid) ||
                    (c.x2Grid === xGrid && c.y2Grid === yGrid);
        }
        if (!isMatch) continue;
        if (c.type !== 'wire') componentRegistry.removeId(c.id);
        const removedType = c.type;
        components.splice(i, 1);
        if (goalEngine) goalEngine.fireEvent('component:remove:' + removedType, { component: c });
        if (simEngine) simEngine.reset();
        break;
      }
    }
    return;
  }

  if (!selectedType.value) return;

  const gs = gridSize.value;
  const { xGrid, yGrid } = pixelToGrid(currentMouseX, currentMouseY);

  if (selectedType.value === 'wire') {
    // 吸附到最近的元件引脚
    // 注意：元件引脚坐标已包含 CANVAS_PADDING 偏移在渲染中处理，
    // 此处 pin.x/y 是引擎坐标（相对于画布原点），与 grid 计算一致
    const snapToPin = (xG, yG) => {
      const gs = gridSize.value;
      let nearest = { xGrid: xG, yGrid: yG };
      // 先尝试精确引脚吸附（阈值覆盖 1 格距离 + 余量）
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
            nearest = { xGrid: px, yGrid: py };
          }
        }
      }
      // 如果未吸附到引脚，但点击位置靠近某个元件的中心，则吸附到该元件的最近引脚
      if (nearest.xGrid === xG && nearest.yGrid === yG) {
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
                nearest = { xGrid: px, yGrid: py };
              }
            }
            break;
          }
        }
      }
      return nearest;
    };

    const snappedStart = wireStartGrid ? wireStartGrid : snapToPin(xGrid, yGrid);
    const snappedEnd = snapToPin(xGrid, yGrid);

    if (!wireStartGrid) {
      wireStartGrid = snappedStart;
      return;
    }
    // 避免零长度导线
    if (snappedStart.xGrid === snappedEnd.xGrid && snappedStart.yGrid === snappedEnd.yGrid) {
      wireStartGrid = null;
      return;
    }
    const wireComp = {
      type: 'wire',
      xGrid: snappedStart.xGrid,
      yGrid: snappedStart.yGrid,
      x2Grid: snappedEnd.xGrid,
      y2Grid: snappedEnd.yGrid,
    };
    components.push(wireComp);
    wireStartGrid = null;
    wireMouseGrid = null;
    if (goalEngine) goalEngine.fireEvent('component:add:wire', { component: wireComp });
    return;
  }

  const newComp = {
    xGrid, yGrid,
    type: selectedType.value,
    rotation: pendingRotation,
    state: selectedType.value === 'switch' ? 'closed' : undefined,
    value: (selectedType.value === 'resistor' || selectedType.value === 'bulb') ? 100 : undefined,
    beta: (selectedType.value === 'transistor-npn' || selectedType.value === 'transistor-pnp') ? 100 : undefined,
    lit: false,
  };
  // 分配唯一 ID
  newComp.id = componentRegistry.generateId(newComp.type);
  components.push(newComp);
  if (goalEngine) goalEngine.fireEvent('component:add:' + newComp.type, { component: newComp });
  tempComponent = null;
  pendingRotation = 0;
  selectedType.value = null;
}

function onRightClick(e) {
  e.preventDefault();
  // 旋转待放置元件
  pendingRotation = (pendingRotation + 90) % 360;
  if (tempComponent) {
    tempComponent.rotation = pendingRotation;
  }
}

function onMouseLeave() {
  tempComponent = null;
  wireMouseGrid = null;
  pinInfo.visible = false;
}

function undoLast() {
  const removed = components.pop();
  if (removed) componentRegistry.removeId(removed.id);
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

  // 绘制波形
  const data = voltageHistory[oscChannel.value];
  const len = data.length;
  if (len < 2) {
    oscAnimId = requestAnimationFrame(drawOscilloscope);
    return;
  }

  c.strokeStyle = '#00ff88';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < len; i++) {
    const x = (i / OSC_BUFFER_SIZE) * w;
    // 电压映射：0-5V → 底部到顶部
    const yNorm = Math.max(0, Math.min(1, data[i] / 5));
    const y = h - yNorm * h;
    if (i === 0) c.moveTo(x, y);
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
  }
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
.grid-control .save-hint {
  margin-left: auto;
  font-size: 11px;
  color: #aaa;
  cursor: default;
  user-select: none;
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

/* ---- 示波器面板 ---- */
.oscilloscope-panel {
  position: absolute;
  right: 12px;
  bottom: 52px;
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

/* ---- 示波器开关按钮 ---- */
.osc-toggle {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #c5d5ea;
  background: #fff;
  font-size: 18px;
  cursor: pointer;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  transition: all 0.15s;
}
.osc-toggle:hover {
  background: #e8f0fe;
  border-color: #1976d2;
}
</style>
