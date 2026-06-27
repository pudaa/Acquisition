<template>
  <div 
    class="experiment-introduction" 
    v-if="visible"
    :style="{ zIndex: 1000 }"
  >
    <div class="intro-content">
      <div v-if="loading" class="loading">
        <div class="loading-content">加载中...</div>
      </div>

      <div v-else class="intro-content-inner">
        <h2 class="exp-title">{{ experiment?.title }}</h2>
        <section v-if="experiment?.introduce" class="intro-section">
          <div class="section-title-with-icon">
            <svg t="1750989089409" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2616" width="26" height="26">
              <path d="M0 81.408v854.016h501.76v-115.2H104.448V191.488h815.104v350.208H1024V81.408H0z" p-id="2617"></path>
              <path d="M209.408 295.424h478.72v108.032H209.408zM209.408 514.56h272.896v108.032H209.408zM619.008 999.424h150.528v-146.432h-150.528v146.432zM618.496 785.408h150.528v-146.432h-150.528v146.432zM839.168 999.424h150.528v-146.432h-150.528v146.432zM839.168 785.408h150.528v-146.432h-150.528v146.432z" p-id="2618"></path>
            </svg>
              <h3>实验介绍</h3>
          </div>
          <p>{{ experiment.introduce }}</p>
        </section>
          
        <section v-if="elementList.length" class="intro-section">
          <div class="section-title-with-icon">
            <svg t="1750989448911" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2781" width="24" height="24">
              <path d="M501.76 524.8v496.64L45.568 797.184V269.312L501.76 524.8z m481.792 274.432l-443.392 222.208 1.024-496.64 442.88-256-0.512 530.432z m-856.064-368.64v310.784l280.576 131.072v-289.792L127.488 430.592z m506.88 152.576v288.256l265.216-131.072V430.592l-265.216 152.576z m328.704-356.352l-447.488 264.192-450.048-256L522.24 0l440.832 226.816zM257.024 233.984L517.12 379.392l270.848-150.016-267.776-130.048-263.168 134.656z" p-id="2782"></path>
            </svg>
            <h3>涉及电子元件</h3>
          </div>
          <ul>
            <li v-for="el in elementList" :key="el.id">
              <strong>{{ el.name }}</strong>：{{ el.introduction }}
            </li> 
          </ul>
        </section>
         
        <section v-if="experiment?.prepare" class="intro-section">
          <div class="section-title-with-icon">
            <svg t="1750987239803" class="icon prepare-icon" viewBox="0 0 1024 1024" version="1.1"
              xmlns="http://www.w3.org/2000/svg" p-id="1505" width="24" height="24">
              <path d="M356.352 838.144l30.208-175.616-127.488-124.416 176.128-25.6L514.048 353.28l78.848 159.744 176.128 25.6-127.488 124.416 30.208 175.616-157.696-82.944-157.696 82.432z m157.696-166.4l59.392 31.232-11.264-66.048 48.128-47.104-66.56-9.728-29.696-60.416-29.696 60.416-66.56 9.728 48.128 47.104-11.264 66.048 59.392-31.232z"
                p-id="1506" fill="#2c2c2c"></path>
              <path d="M816.64 116.224V33.28H204.8v82.944H20.48v883.2h981.504V116.224h-185.344z m-517.12 8.704h421.888v83.968H299.52V124.928z m598.528 771.584H124.416V219.648H204.8v80.384h611.84V219.648h81.408v676.864z"
                p-id="1507" fill="#2c2c2c"></path>
            </svg>
            <h3>学习前准备</h3>
          </div>
          <p class="prepare-text">{{ experiment.prepare }}</p>
        </section>


        <section v-if="experiment?.guidance" class="intro-section">
          <div class="section-title-with-icon">
            <svg t="1750989765639" class="icon guidance-icon" viewBox="0 0 1024 1024" version="1.1"
              xmlns="http://www.w3.org/2000/svg" p-id="3003" width="24" height="24">
              <path d="M908.288 3.072v479.744h-92.672l0.512-387.584H161.28v774.656h327.168V962.56h-419.84V3.072h839.68z" p-id="3004"></path>
              <path d="M968.192 542.72v479.744l-209.92-119.808-209.92 119.808V542.72h419.84z m-88.064 83.968h-249.344v244.736l124.416-68.096 124.416 68.096v-244.736zM231.424 431.616h179.712v94.72H231.424zM745.984 236.032v101.376H231.424V236.032h514.56z" p-id="3005"></path>
            </svg>
            <h3>操作指导</h3>
          </div>
          <p class="guidance-text">{{ experiment.guidance }}</p>
        </section>


        <section v-if="experiment?.steps?.length" class="intro-section">
          <div class="section-title-with-icon">
            <svg t="1750988103220" class="icon target-icon" viewBox="0 0 1024 1024" version="1.1"
              xmlns="http://www.w3.org/2000/svg" p-id="2449" width="24" height="24">
              <path d="M1005.056 1009.152H20.48V115.2h984.576v893.952zM124.928 904.704h775.68V219.648H124.928v685.056z" p-id="2450"></path>
              <path d="M255.488 14.848h117.248v297.984H255.488V14.848z m393.216 0h117.248v297.984h-117.248V14.848zM239.104 453.12h547.328v119.808H239.104zM238.592 671.744h547.328v119.808H238.592z" p-id="2451"></path>
            </svg>
            <h3>实验目标</h3>
          </div>
          <ul>
            <li v-for="(step, idx) in experiment.steps" :key="idx">
              {{ step.title}}
            </li>
          </ul>
        </section>

        

        <button class="start-btn" @click="handleStart">进入学习</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const props = defineProps({
  expId: {
    type: [String, Number],
    required: true
  }
});

const experiment = ref({});
const elementList = ref([]);
const visible = ref(true);
const loading = ref(true);
const emit = defineEmits(['close']);
const handleStart = () => {
  visible.value = false;
  // 可根据需要 emit 事件通知父组件
  // emit('start')
  emit('close');
};

onMounted(async () => {
  // 获取实验信息
  const { data } = await api.get(`/experiments/${props.expId}/info`);
  // console.log('Experiment data:', data);
  
  experiment.value = data?.data || {};

  // 解析元件ID列表
  let elementIds = [];
  try {
    elementIds = Array.isArray(experiment.value.element)
      ? experiment.value.element
      : JSON.parse(experiment.value.element || '[]');
  } catch {
    elementIds = [];
  }

  // 获取元件信息
  if (elementIds.length) {
    const { data: elData } = await api.get('/experiments/elements', { params: { ids: elementIds.join(',') } });
    elementList.value = elData?.data || [];
  } 
  loading.value = false;
});
</script>

<style scoped>
.experiment-introduction {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.intro-content {
  background: #fff;
  border-radius: 16px;
  padding: 36px 5px 28px 25px;
  width: 100vw;
  height: 95vh;
  max-width: 1100px;
  max-height: 900px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  font-size: 1.1em;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.section-title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1.5px solid #1976d2;
  padding-bottom: 4px;
  margin-bottom: 10px;
}
.prepare-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.exp-title {
  text-align: center;
  margin-bottom: 18px;
  flex-shrink: 0;
  color: #1976d2;
}
.intro-content > .intro-section {
  border-bottom: 3px solid #e0e0e0;
  padding-bottom: 14px;
  margin-bottom: 14px;
  
}
.intro-content > .intro-section:last-of-type {
  border-bottom: none;
  margin-bottom: 24px;
}
.intro-content {
  position: relative;
}
.intro-content .start-btn {
  display: block;
  margin:50px auto;
  padding: 12px 36px;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.start-btn:hover {
  background: #1565c0;
}
.intro-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 95vh;
  max-height: 900px;
}
.intro-content-inner {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-left: 30px;
  min-height: 0;
  max-height: 100%;
  /* padding-right: 8px;  */
  /* 自定义滚动条样式 */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #b0b0b0 #f5f5f5; /* Firefox */
}

/* Chrome/Edge/Safari */
.intro-content-inner::-webkit-scrollbar {
  width: 6px;
  background: #f5f5f5;
}
.intro-content-inner::-webkit-scrollbar-thumb {
  background: #b0b0b0;
  border-radius: 4px;
}
.loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}
.loading-content {
    padding: 20px 40px;
    color: black;
    font-size: 1.3em;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
   
}
/* 让文本中的\n换行符生效 */
.guidance-text, .prepare-text {
    white-space: pre-line;
}

h3 {
  margin-bottom: 2px;
  background: none;
  color: #222;
  padding: 6px 0 6px 0;
  border-radius: 0;
  margin-bottom: 1px;
  display: block;
  font-weight: bold;
  font-size: 1.1em;
  width: 100%;
  box-sizing: border-box;
}
.intro-content-inner > .intro-section {
  padding: 14px;
  margin-bottom: 14px;
  margin-right: 45px;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}
.intro-content-inner > .intro-section:last-of-type {
  border-bottom: none;
  margin-bottom: 24px;
}
ul {
  padding-left: 20px;
}
</style>