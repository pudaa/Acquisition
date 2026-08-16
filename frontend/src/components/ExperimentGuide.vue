<template>
  <!-- 引导组件不渲染可见 DOM，仅通过 driver.js 控制遮罩与气泡 -->
</template>

<script setup>
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { onBeforeUnmount } from 'vue';

const props = defineProps({
  /** 实验引擎组件实例（用于读取 selectedType / componentCount 判断交互进度） */
  engineRef: { type: Object, required: true },
});

const emit = defineEmits(['finished']);

let driverObj = null;
let watchers = [];

/** 等待条件满足后执行回调；带超时兜底，避免用户卡死在交互步骤 */
function waitFor(condition, callback, timeout = 60000) {
  if (condition()) {
    callback();
    return;
  }
  const start = Date.now();
  const timer = setInterval(() => {
    if (condition()) {
      clearInterval(timer);
      callback();
    } else if (Date.now() - start > timeout) {
      clearInterval(timer);
      callback();
    }
  }, 200);
  watchers.push(timer);
}

function cleanupWatchers() {
  watchers.forEach(t => clearInterval(t));
  watchers = [];
}

function buildSteps() {
  return [
    {
      popover: {
        title: '欢迎来到实验学习',
        description: '本引导将带你认识实验操作界面，并亲手搭建一个简单电路。点击「下一步」开始。',
      },
    },
    {
      element: '[data-guide="sidebar"]',
      popover: {
        title: '元件工具栏',
        description: '左侧是元件工具栏，包含电阻、电源、开关等元件。点击元件即可选中，然后在画布上放置。',
      },
    },
    {
      element: '[data-guide="canvas"]',
      popover: {
        title: '电路画布',
        description: '中间是电路画布，用于放置元件和连接导线。右键拖拽可平移画布，Ctrl+滚轮可缩放。',
      },
    },
    {
      element: '[data-guide="grid-control"]',
      popover: {
        title: '网格控制',
        description: '底部是网格大小调节。元件会自动吸附到网格，方便对齐摆放。',
      },
    },
    {
      element: '[data-guide="component-btn"][data-type="resistor"]',
      popover: {
        title: '动手试试：选择电阻',
        description: '点击左侧的「电阻」按钮，选中电阻元件。',
        disableButtons: ['next', 'previous'],
      },
      onHighlightStarted: () => {
        waitFor(() => props.engineRef?.selectedType === 'resistor', () => driverObj?.moveNext());
      },
    },
    {
      element: '[data-guide="canvas"]',
      popover: {
        title: '动手试试：放置电阻',
        description: '现在在画布上点击一下，放置一个电阻。',
        disableButtons: ['next', 'previous'],
      },
      onHighlightStarted: () => {
        const initial = props.engineRef?.componentCount || 0;
        waitFor(() => (props.engineRef?.componentCount || 0) > initial, () => driverObj?.moveNext());
      },
    },
    {
      element: '[data-guide="oscilloscope"]',
      popover: {
        title: '示波器',
        description: '点击示波器按钮，可查看电路中各节点的电压波形，帮助分析电路。',
      },
    },
    {
      element: '[data-guide="undo"]',
      popover: {
        title: '撤销与删除',
        description: '「撤销」可回退上一步操作；「删除」进入删除模式，点击元件即可移除。',
      },
    },
    {
      popover: {
        title: '引导完成',
        description: '你已经掌握了基本操作！现在开始完成实验目标吧。',
      },
    },
  ];
}

function start() {
  if (driverObj?.isActive()) return;
  driverObj = driver({
    showProgress: true,
    animate: true,
    overlayColor: 'rgba(15, 23, 42, 0.8)',
    stagePadding: 10,
    stageRadius: 12,
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    doneBtnText: '完成',
    steps: buildSteps(),
    onDestroyed: () => {
      cleanupWatchers();
      emit('finished');
    },
  });
  driverObj.drive();
}

function destroy() {
  if (driverObj) {
    driverObj.destroy();
    driverObj = null;
  }
}

onBeforeUnmount(() => {
  destroy();
});

defineExpose({ start, destroy });
</script>

<style>
/* 覆盖 driver.js 默认样式，与项目蓝色主题保持一致 */
.driver-popover {
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  font-family: inherit;
}
.driver-popover .driver-popover-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a237e;
}
.driver-popover .driver-popover-description {
  color: #455a64;
  line-height: 1.6;
}
.driver-popover .driver-popover-next-btn {
  background: #1976d2;
  border-color: #1976d2;
  text-shadow: none;
}
.driver-popover .driver-popover-next-btn:hover {
  background: #1565c0;
  border-color: #1565c0;
}
.driver-popover .driver-popover-prev-btn {
  color: #1976d2;
  border-color: #b3d4f5;
}
.driver-popover .driver-popover-close-btn {
  color: #90a4ae;
}
.driver-popover .driver-popover-progress-text {
  color: #78909c;
}
</style>