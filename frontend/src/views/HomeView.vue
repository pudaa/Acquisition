<template>
  <div class="layout-container">
    <!-- 左侧导航栏 -->
    <nav class="sidebar">
      <div class="user-info" @click="goProfile">
        <img 
          :src="user?.avatar || defaultAvatar"
          class="user-avatar"
          @error="handleAvatarError"
        >
        <transition name="slide-fade">
          <div v-if="isSidebarExpanded" class="user-meta">
            <h3>{{ userName }}</h3>
            <h3>{{ userRole }}</h3>
          </div>
        </transition>
      </div>
      
      <div class="nav-container">
        
        <!-- 教师专属导航 -->
        <template v-if="isTeacher">
          <RouterLink to="/experiment/manage" custom v-slot="{ navigate }"> 
            <button @click="navigate" class="nav-btn"><img src="/button_icons/管理员搜索.png" class="nav-icon">学生成绩</button>
          </RouterLink>
          <RouterLink to="/experiment/viewing" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/查看.png" class="nav-icon">实验查看</button>
          </RouterLink>
          <RouterLink to="/experiment/upload" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/上传.png" class="nav-icon">实验上传</button>
          </RouterLink>
          <RouterLink to="/discussion" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/讨论区.png" class="nav-icon">讨论区</button>
          </RouterLink>
          <RouterLink to="/class/manage" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/班级管理.png" class="nav-icon">班级管理</button>
          </RouterLink>
        </template>
        
        <!-- 学生导航 -->
        <template v-else>
          <RouterLink to="/experiment/search" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/列表.png" class="nav-icon">实验列表</button>
          </RouterLink>
          <RouterLink to="/experiment/tasks" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/任务.png" class="nav-icon">实验任务</button>
          </RouterLink>
          <RouterLink to="/discussion" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/讨论区.png" class="nav-icon">讨论区</button>
          </RouterLink>
          <RouterLink to="/correction-notebook" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn"><img src="/button_icons/查看.png" class="nav-icon">错题本</button>
          </RouterLink>
          <!-- <RouterLink to="/experiment/explain" custom v-slot="{ navigate }">
            <button @click="navigate" class="nav-btn">实验说明</button>
          </RouterLink> -->
        </template>
      </div>

      <div class="nav-bottom">
        <button class="nav-btn" @click="handleLogout">
          <img src="/button_icons/退出.png" class="nav-icon">
          {{ user ? '退出登录' : '立即登录' }}
        </button>
      </div>
    </nav>

    <!-- 右侧内容栏 -->
    <main class="content-area" ref="bgContainer">
      <!-- 顶部标题栏 -->
      <div class="content-header">
        <h2>{{ currentPageTitle }}</h2>
      </div>
      <!-- 页面内容 --> 
      <RouterView />
    </main>

    <!-- AI助手悬浮按钮（通用模式：不携带电路信息） -->
    <button 
        class="ai-assistant"
        @click="showChatWindow = !showChatWindow"
      >
    <!-- AI助手 -->
    </button>
    <AIChatWindow v-model="showChatWindow" mode="general" />
  </div>
</template>

<style scoped>
  @import '@/assets/css/home.css';
</style>
<style>
  @import '@/assets/css/threejs-wave-bg.css';

</style>

<script setup>
import { ref, computed,onMounted, onUnmounted, watch } from 'vue';
import { jwtDecode } from 'jwt-decode'; 
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router';
import AIChatWindow from '@/components/AIChatWindow.vue';

const route = useRoute()
const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const userName = computed(() => user.value?.realname || '未登录');
const userRole = computed(() => {
  const roleMap = { student: '学生', teacher: '教师' };
  return roleMap[user.value?.role] || '未登录';
});
const isTeacher = computed(() => user.value?.role === 'teacher');
const isSidebarExpanded = ref(true);
const defaultAvatar = '/images/default_head.png';
const showChatWindow = ref(false);

const currentPageTitle = computed(() => {
  const titleMap = {
    '/experiment/tasks': '实验任务',
    '/experiment/manage': '学生成绩',
    '/experiment/viewing': '实验查看',
    '/experiment/search': '实验列表',
    '/experiment/test': '实验测验',
    '/experiment/upload': '实验上传',
    '/discussion': '讨论区',
    '/class/manage': '班级管理',
    '/correction-notebook': '错题本',
  }
  const lastMatched = route.matched[route.matched.length - 1]
  // console.log(lastMatched);
  return titleMap[lastMatched?.path] || '虚拟实验平台'
})

const unwatch = watch(// 监听用户信息变化
  () => localStorage.getItem('user'),
  (newUser) => {
    if (newUser) {
      // 解析新的用户信息并创建新对象
      const parsedUser = JSON.parse(newUser);
      user.value = { ...parsedUser };
    } else {
      user.value = null;
    }
  },
  { deep: true, immediate: true }
);

const handleLogout = () => {// 退出登录
  localStorage.removeItem('user');
  user.value = null;
  router.push('/login');
};

const handleAvatarError = (e) => {
    e.target.src = "/images/default_head.png";
  };
  let tokenCheckTimer = null;
  const bgContainer = ref(null)
  let waveBg = null
  onMounted(async () => {
    startTokenCheck();
    // 动态加载 three.js 波浪背景（three 体积大，独立分包避免拖慢首屏）
    const { createWaveBackground } = await import('@/assets/js/threejs-wave-bg');
    waveBg = createWaveBackground(bgContainer.value)
});

onUnmounted(() => {
  clearInterval(tokenCheckTimer);
  waveBg?.dispose?.();
  unwatch();
});

// 添加token检查方法
const checkTokenExpiration = () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    
    // 提前30秒检测过期
    if (decoded.exp - now < 30) {
      handleTokenExpired();
    }
  } catch (e) {
    console.error('Token解析失败:', e);
    handleTokenExpired();
  }
};

const handleTokenExpired = () => {
  if (confirm('登录已过期，请重新登录')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }
};

const startTokenCheck = () => {
  tokenCheckTimer = setInterval(checkTokenExpiration, 5 * 60 * 1000);
  checkTokenExpiration();
};

const goProfile = () => {
  router.push('/profile');
};

</script>