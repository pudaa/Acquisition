<template>
  <div v-show="show" class="cloud-transition-overlay" @click="handleClick">
    <canvas ref="canvas" class="cloud-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const canvas = ref(null)
let animationId = null
let clouds = []
let ctx = null
let startTime = 0

class Cloud {
  constructor(canvasWidth, canvasHeight) {
    // 初始位置在屏幕内部
    this.x = Math.random() * canvasWidth
    this.y = Math.random() * canvasHeight
    this.size = 100 + Math.random() * 100
    this.speed = 8 + Math.random() * 5
    this.amplitude = 10 + Math.random() * 30
    this.waveOffset = Math.random() * Math.PI * 2
    this.opacity = 0.9 + Math.random() * 0.1 
    // 初始位置在屏幕内部
    this.x = Math.random() * canvasWidth
    this.y = Math.random() * canvasHeight
    this.size = 400 + Math.random() * 100
    this.speed = 5 + Math.random() * 5
    this.amplitude = 10 + Math.random() * 30
    this.waveOffset = Math.random() * Math.PI * 2
    this.opacity = 0.9 + Math.random() * 0.1 
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${this.size*10}" height="${this.size*5}" viewBox="0 0 142 142">
        <path d="M 50.70 96.30 C 52.90 95.90 54.90 95.20 56.70 94.10 C 61.10 102.10 70.30 106.80 79.80 105.20 C 90.50 103.40 98.10 94.20 98.20 83.70 C 100.70 84.50 103.40 84.70 106.10 84.30 C 115.20 82.70 121.30 74.10 119.80 65.00 C 118.40 56.90 111.50 51.20 103.60 51.10 L 103.50 50.70 L 44.50 60.80 L 38.10 61.90 L 38.30 63.10 C 32.10 66.80 28.50 74.10 29.80 81.60 C 31.60 91.30 40.90 97.90 50.70 96.30 Z" fill="#ffffff" fill-rule="nonzero" stroke="none"/>
        <path d="M 104.70 45.00 C 102.30 45.00 100.00 45.40 97.90 46.20 C 94.60 36.90 85.80 30.20 75.40 30.20 C 63.70 30.20 54.00 38.60 51.90 49.70 C 49.40 48.40 46.60 47.70 43.60 47.70 C 33.70 47.70 25.60 55.80 25.60 65.70 C 25.60 74.50 31.90 81.80 40.20 83.40 L 40.20 83.90 L 104.70 83.90 L 111.70 83.90 L 111.70 82.60 C 118.90 79.80 124.10 72.70 124.10 64.50 C 124.10 53.70 115.40 45.00 104.70 45.00 Z" fill="#ffffff" fill-rule="nonzero" stroke="none"/>
      </svg>
    `
    
    const img = new Image()
    img.src = 'data:image/svg+xml;base64,' + btoa(svgString) // 编码为base64
    this.image = img
  }

  update(time) {
    // 如果完全移出屏幕，则冻结
    if (this.y + this.size < -this.size) {
      return
    }
    // 垂直移动 - 云朵向上飘
    this.y -= this.speed
    
    // 水平波浪移动
    this.x += Math.sin(time * 0.002 + this.waveOffset) * (this.amplitude / 10)
    
    // 保持在画布范围内，允许适当的水平溢出
    if (this.x < -this.size-100) {
      this.x = canvas.value.width + this.size
    } else if (this.x > canvas.value.width + this.size + 100) {
      this.x = -this.size
    }
  }

  draw(ctx) {
    ctx.globalAlpha = this.opacity
    ctx.drawImage(
        this.image, 
        this.x - this.size, 
        this.y - this.size * 0.5, 
        this.size * 2, 
        this.size
      )
  }
  reset(canvasHeight) {
    this.y = Math.random() * canvasHeight
    this.x = Math.random() * canvas.value.width * 1.2
  }
}

const initClouds = () => {
  if (!canvas.value) return
  
  const canvasWidth = canvas.value.width
  const canvasHeight = canvas.value.height
  clouds = []
  
  // 根据屏幕大小创建适当数量的云朵，限制最大数量
  const cloudCount = Math.min(Math.floor((canvasWidth * canvasHeight) / 10000), 50)
  
  for (let i = 0; i < cloudCount; i++) {
    clouds.push(new Cloud(canvasWidth, canvasHeight))
  }
}

const resizeCanvas = () => {
  if (!canvas.value) return
  
  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight
  initClouds()
}

const animate = (time) => {
  if (!ctx || !canvas.value) return
  
  // 清空画布（使用透明背景）
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  
  // 更新和绘制云朵
  clouds.forEach(cloud => {
    cloud.update(time)
    cloud.draw(ctx)
  })
  
  animationId = requestAnimationFrame(animate)
}

const handleClick = () => {
  emit('close')
}
const stopAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

onMounted(() => {
  if (!canvas.value) return
  
  ctx = canvas.value.getContext('2d')
  resizeCanvas()
  
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  stopAnimation()
  window.removeEventListener('resize', resizeCanvas)
})


// 监听 show 属性变化
watch(() => props.show, (newVal) => {
  if (newVal) {
    // 停止可能正在运行的动画
    stopAnimation()
    
    // 重新初始化云朵
    initClouds()
    
    // 重置开始时间
    startTime = performance.now()
    
    // 开始新动画
    animationId = requestAnimationFrame(animate)
  } else {
    stopAnimation()
  }
}, { immediate: true })
</script>

<style scoped>
.cloud-transition-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  pointer-events: auto;
  background: transparent; /* 改为透明背景 */
  /* backdrop-filter: blur(2px); 添加轻微模糊效果增强云朵遮挡感 */
}

.cloud-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>