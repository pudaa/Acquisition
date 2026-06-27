<template>
  <div id="app">
    <transition name="cloud-transition" mode="out-in">
      <router-view />
    </transition>
    <CloudTransition :show="showCloudTransition" @close="handleCloudTransitionClose" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref  } from 'vue'
import { useRouter } from 'vue-router'
import CloudTransition from './components/CloudTransition.vue'

const showCloudTransition = ref(false)
const router = useRouter()
let transitionTimer = null // 添加定时器引用

router.beforeEach((to, from, next) => {
  if (from.path === '/login' && (to.path === '/' || to.path.startsWith('/experiment'))) {
    showCloudTransition.value = true
    
    // 清理之前的定时器
    if (transitionTimer) {
      clearTimeout(transitionTimer)
    }
    
    // 设置新的定时器
    transitionTimer = setTimeout(() => {
      showCloudTransition.value = false
      transitionTimer = null
    }, 2000)
  }
  
  next()
})

const handleCloudTransitionClose = () => {
  showCloudTransition.value = false
  
  // 清理定时器
  if (transitionTimer) {
    clearTimeout(transitionTimer)
    transitionTimer = null
  }
}

const cheerTexts = [
  '加油！',
  '太棒了！',
  '继续努力！',
  '你真厉害！',
  '做得好！',
  '坚持下去！'
];
const cheerColors = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F', '#8E44AD', '#16A085'];

// import { TrailEffect } from '@/assets/js/trail-effect';
const handleVisibilityChange = () => {
  if (!document.hidden) {
    window.dispatchEvent(new Event('resize'))
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      document.body.style.overflow = ''
    })
  }
}

const handleClick = (e) => {
  const text = document.createElement('span');
  text.innerText = cheerTexts[Math.floor(Math.random() * cheerTexts.length)];
  text.className = 'cheer-effect';
  text.style.left = e.clientX + 'px';
  text.style.top = e.clientY + 'px';
  text.style.color = cheerColors[Math.floor(Math.random() * cheerColors.length)];
  text.style.fontSize = '15px';
  text.style.position = 'absolute';
  text.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
  text.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(text);

  setTimeout(() => {
    text.style.transform = 'translate(-50%, -50%) translateY(-60px) scale(1.5)'; 
    text.style.opacity = '0';
  }, 10);

  setTimeout(() => {
    document.body.removeChild(text);
  }, 900);
};

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('click', handleClick)
  if (window.TrailEffect) {
    window.trailEffect = new TrailEffect()
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('click', handleClick)
  if (window.trailEffect) {
    window.trailEffect.destroy()
    window.trailEffect = null
  }
  
  // 清理定时器
  if (transitionTimer) {
    clearTimeout(transitionTimer)
    transitionTimer = null
  }
})
</script>

<style>
html, body, #app {
  height: 100%;
  width: 100%;   
  margin: 0;
  padding: 0; 
  overflow: hidden; 
}


.cloud-transition-enter-active, .cloud-transition-leave-active {
  transition: opacity 0.5s ease;
}

.cloud-transition-enter-from, .cloud-transition-leave-to {
  opacity: 0;
}

.cloud-transition-enter-to, .cloud-transition-leave-from {
  opacity: 1;
}

.cheer-effect {
  position: fixed;
  pointer-events: none;
  color: #2196f3;
  font-size: 12px;
  font-weight: bold;
  left: 0;
  top: 0;
  transform: translateY(0) scale(1);
  opacity: 1;
  transition: transform 0.8s cubic-bezier(.23,1.02,.64,.99), opacity 0.8s;
  z-index: 9999;
  user-select: none;
}

</style>

<style scoped>
header {
  flex-shrink: 0; 
}
</style>