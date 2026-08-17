<template>
    <div class="experiment-learning">
        <div class="top-bar" v-if="!showIntroPanel">
            <div class="back-button" @click="confirmLeave">
                <div class="back-btn-icon">
                    <svg t="1750992239888" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7675" width="30" height="30"><path d="M643.79 293.4H265.44l85-73.12 0.15-0.13c17.91-15.84 20-42.41 4.67-60.48l-0.21-0.24c-15.84-17.91-42.41-20-60.48-4.67l-179.9 154.83a35.11 35.11 0 0 0-1.44 51.9l180.65 173.83a43 43 0 1 0 59.44-62.06l-97-93.68h387.47c105.88 0 191.72 85.83 191.72 191.71V595c0 105.88-85.84 191.71-191.72 191.71H322.65a42.69 42.69 0 0 0-42.85 42.73c-0.07 23.64 19.93 43 43.58 43h320.41c153.48 0 277.89-124.42 277.89-277.89v-23.72c0-152.97-124.68-277.43-277.89-277.43z" fill="#ffffff" p-id="7676"></path></svg>
                </div>
                <span>返回</span>
            </div>
            <div class="experiment-title">
                <span>{{ experiment_title }}</span>
            </div>
            <button class="help-button" @click="toggleGuide" title="操作引导">?</button>
        </div>

        <div class="learning-img">
            <img src="/images/experiment2.jpg" alt="实验背景" loading="lazy" />
        </div>

        <!-- 替换 iframe 为 ExperimentEngine -->
        <div class="engine-wrapper" v-if="experimentConfig">
            <ExperimentEngine
                ref="engineRef"
                :config="experimentConfig"
                show-debug-tools
                @goal-achieved="onGoalAchieved"
                @progress-update="onProgressUpdate"
                @engine-ready="onEngineReady"
                @circuit-info="onCircuitInfo"
            />
        </div>

        <div v-if="loading" class="loading">
            <div class="loading-content">实验加载中...</div>
        </div>

        <div class="goal-panel">
            <div class="goal-panel-label">学习目标</div>
            <div class="goal-title">学习目标</div>
            <ul>
                <li v-for="goal in goals" :key="goal.id" :class="{done: goal.done}">
                    <span>{{ goal.title }}</span>
                    <span v-if="goal.done" class="goal-done">✔</span>
                </li>
            </ul>
            <div class="btn-container">
                <button 
                    class="practice-btn"
                    @click="showPractice = true"
                    v-if="!showPractice"
                >
                    开始练习
                </button>
                <button 
                    v-if="showDownloadDialog" 
                    class="download-button" 
                    @click="goToExperimentFeeling"
                >
                    完成实验报告
                </button>
            </div>
        </div>
        <div v-if="showCompleteDialog" class="complete-dialog">
            <div class="dialog-content">
                <h2>实验已完成！</h2>
                <p>恭喜你完成所有实验目标。</p>
                <button @click="goToExperimentFeeling"> 完成实验报告</button>
                <button @click="confirmLeave">返回上一页</button>
                <button @click="showCompleteDialog = false ; showDownloadDialog=true">继续学习</button>
            </div>
        </div>
        
        <div class="practice-container" v-if="showPractice">
            <PracticePanel 
                :expId="expId"
                @close="showPractice = false"
            />
        </div>
        <button 
            class="ai-assistant"
            @click="handleAIAssistantClick"
        >
        <!-- AI助手 -->
        </button>

        <AIChatWindow 
            v-model="showChatWindow" 
            mode="experiment"
            :expId="expId"
            :iframe-data="iframeData"
            :screenshot-url="aiScreenshotUrl"
        />  
        
        <!-- 实验简介弹窗（首次进入显示） -->
        <ExperimentIntroductionPanel
            v-if="showIntroPanel"
            :expId="expId"
            @close="onIntroPanelClose"
        />

        <!-- 交互式操作引导（driver.js） -->
        <ExperimentGuide
            ref="guideRef"
            :engine-ref="engineRef"
            @finished="onGuideFinished"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api';
import ExperimentReport from '@/assets/js/experiment-report.js';
import AIChatWindow from '@/components/AIChatWindow.vue';
import PracticePanel from '../components/PracticePanel.vue';
import ExperimentIntroductionPanel from '../components/ExperimentIntroductionPanel.vue';
import ExperimentEngine from '../components/ExperimentEngine.vue';
import ExperimentGuide from '../components/ExperimentGuide.vue';

const engineRef = ref(null);
const guideRef = ref(null);
const route = useRoute();
const router = useRouter();

// ======== 响应式状态 ========
const experiment_title = ref('');
const experimentConfig = ref(null);
const loading = ref(true);
const currentProgress = ref(0);
const operationData = ref([]);
const showCompleteDialog = ref(false);
const showDownloadDialog = ref(false);
const showPractice = ref(false);
const startTime = ref(null);
const goals = ref([]);
const showChatWindow = ref(false);
const showIntroPanel = ref(true);
const aiScreenshotUrl = ref(null);
const iframeData = ref(null);
const behaviorlogs = ref(null);
const screenshotUrl = ref('');
const expId = route.query.expId;

// ======== 生命周期 ========
onMounted(() => {
    startTime.value = new Date().toISOString();
    loadExperimentConfig(expId);
});

// ======== 实验配置加载 ========
async function loadExperimentConfig(id) {
    try {
        const { data } = await api.get(`/experiments/${id}/config`);
        if (data.data?.engineMode && data.data?.config) {
            experimentConfig.value = data.data.config;
        } else {
            console.warn('实验没有引擎配置，请先运行 seed 脚本');
            experimentConfig.value = null;
        }
        fetchExperimentGoals(id);
        loading.value = false;
    } catch (err) {
        console.error('加载实验配置失败:', err);
        loading.value = false;
    }
}

async function fetchExperimentGoals(id) {
    try {
        const response = await api.get(`/experiments/${id}/steps`);
        const experimentTitle = await api.get(`/experiments/${id}/title`);
        experiment_title.value = experimentTitle.data.title;
        const seenIds = new Set();
        goals.value = response.data.steps.steps.map((step) => {
            if (seenIds.has(step.id)) {
                console.warn('发现重复的实验步骤ID:', step.id);
            }
            seenIds.add(step.id);
            return {
                id: step.id,
                title: step.title,
                done: false,
                weight: step.weight || 1,
                action: step.action || '',
                finishTime: null,
                duration: null,
            };
        });
    } catch (error) {
        console.error('获取实验目标失败:', error);
    }
}

// ======== 引擎回调 ========
function onGoalAchieved(data) {
    if (data && data.id) {
        let displayGoal = null;
        displayGoal = goals.value.find(g => g.action === data.id);
        if (!displayGoal) {
            displayGoal = goals.value.find(g => g.id === data.id);
        }
        if (!displayGoal && experimentConfig.value?.goals) {
            const engineIdx = experimentConfig.value.goals.findIndex(g => g.id === data.id);
            if (engineIdx >= 0 && goals.value[engineIdx]) {
                displayGoal = goals.value[engineIdx];
            }
        }
        if (displayGoal && !displayGoal.done) {
            setGoalDone(displayGoal.id, true);
        }
    }
    // 目标完成时保存进度 + 当前电路拓扑（用于恢复）
    saveLearningProgress(true);
}

function onProgressUpdate(progress) {
    currentProgress.value = progress;
    // 同步引擎进度到 goals（通过 action 字段匹配）
    if (goals.value.length > 0 && experimentConfig.value?.goals) {
        const engineGoals = experimentConfig.value.goals;
        engineGoals.forEach((eg) => {
            if (eg.done) {
                const displayGoal = goals.value.find(g => g.action === eg.id);
                if (displayGoal && !displayGoal.done) {
                    displayGoal.done = true;
                }
            }
        });
    }
}

function onEngineReady() {
    console.log('引擎就绪');
    // 引擎就绪后，尝试恢复保存的电路
    restoreCircuit();
}

// ======== 电路恢复 ========
async function restoreCircuit() {
    try {
        // 所有目标已完成时跳过恢复（已完成实验重新进入应从头开始）
        if (goals.value.length > 0 && goals.value.every(g => g.done)) {
            console.log('实验已完成，跳过电路恢复');
            return;
        }
        const { data } = await api.get(`/experiments/${expId}/saved-circuit`);
        if (data?.circuit_components && Array.isArray(data.circuit_components) && data.circuit_components.length > 0) {
            console.log(`恢复电路: ${data.circuit_components.length} 个元件`);
            setTimeout(() => {
                if (engineRef.value) {
                    engineRef.value.restoreComponents(data.circuit_components);
                }
            }, 100);
        }
    } catch (err) {
        // 没有保存的电路或请求失败，忽略
    }
}

// ======== AI 电路数据转发 ========
function onCircuitInfo(data) {
    iframeData.value = data;
}

// ======== 键盘快捷键 ========
function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (engineRef.value) {
            const comps = engineRef.value.getComponents();
            saveLearningProgress(true, comps);
        }
    }
}
onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown);
});

// ======== 目标管理 ========
function setGoalDone(goalId, save = true) {
    const goal = goals.value.find(g => g.id === goalId);
    if (goal && !goal.done) {
        goal.done = true;
        goal.finishTime = new Date().toISOString();
        goal.duration = startTime.value ? calcGoalDuration(startTime.value, goal.finishTime) : null;
        currentProgress.value = calcProgress();
        if (save) saveLearningProgress();
        if (currentProgress.value === 100) handleExperimentComplete();
    }
}

function calcProgress() {
    const totalWeight = goals.value.reduce((sum, g) => sum + (g.weight || 1), 0);
    const doneWeight = goals.value.filter(g => g.done).reduce((sum, g) => sum + (g.weight || 1), 0);
    return totalWeight === 0 ? 0 : Math.round(100 * doneWeight / totalWeight);
}

function calcGoalDuration(start, end) {
    const duration = new Date(end) - new Date(start);
    const minutes = Math.floor(duration / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分钟`;
}

async function handleExperimentComplete() {
    console.log('处理实验完成');
    await saveLearningProgress(true);
    showCompleteDialog.value = true;
}

// ======== 进度保存（带电路拓扑）========
async function saveLearningProgress(includeCircuit = false, manualComponents = null) {
    const payload = {
        expId,
        progress: currentProgress.value,
        operations: operationData.value,
        goals: goals.value,
    };
    if (includeCircuit) {
        let comps = manualComponents;
        if (!comps && engineRef.value) {
            comps = engineRef.value.getComponents();
        }
        if (comps) {
            payload.circuit_components = JSON.parse(JSON.stringify(comps));
        }
    }
    try {
        await api.post('/experiments/save-progress', payload);
    } catch (error) {
        console.error('进度保存失败:', error);
    }
}

function recordOperation(operation) {
    operationData.value.push({
        ...operation,
        progress: currentProgress.value,
    });
}

// ======== 导航 ========
async function goToExperimentFeeling() {
    router.push({
        name: 'ExperimentFeeling',
        query: {
            expId,
            expTitle: experiment_title.value,
            goals: JSON.stringify(goals.value),
            operations: JSON.stringify(operationData.value),
            progress: currentProgress.value,
            startTime: startTime.value,
            endTime: new Date().toISOString(),
            practiceScore: localStorage.getItem(`practice_score_${expId}`) || 0,
            screenshotUrl: screenshotUrl.value || '',
            behaviorlogs: JSON.stringify(behaviorlogs.value),
        },
    });
}

function confirmLeave() {
    if (confirm('确定要离开当前实验吗？未保存的进度可能会丢失')) {
        router.go(-1);
    }
}

function downloadReport() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) throw new Error('用户信息获取失败');

        ExperimentReport.exportPDF({
            user,
            expId,
            expTitle: experiment_title.value,
            goals: goals.value,
            operations: operationData.value,
            score: currentProgress.value,
            startTime: startTime.value || new Date().toISOString(),
            endTime: new Date().toISOString(),
            practiceScore: localStorage.getItem(`practice_score_${expId}`),
            screenshotUrl: screenshotUrl.value,
            analysisResult: 'AI 分析失败，请稍后重试。',
        });
    } catch (error) {
        alert('实验报告导出失败，请稍后重试');
        console.error('实验报告导出失败:', error);
    }
}

// ======== UI 交互 ========
function handleAIAssistantClick() {
    showChatWindow.value = true;
}

// 点击 "?" 按钮：随时重新触发操作引导
function toggleGuide() {
    guideRef.value?.start();
}

// 简介弹窗关闭：首次进入时自动触发操作引导
function onIntroPanelClose() {
    showIntroPanel.value = false;
    const guideKey = `guide_done_${expId}`;
    if (!localStorage.getItem(guideKey)) {
        setTimeout(() => {
            guideRef.value?.start();
        }, 300);
    }
}

// 引导完成：记录到 localStorage，避免下次进入重复弹出
function onGuideFinished() {
    const guideKey = `guide_done_${expId}`;
    localStorage.setItem(guideKey, '1');
}
</script>

<style scoped>
.learning-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 0 20px;
    position: relative;
}
.learning-title {
    font-size: 24px;
}
.learning-img{
    flex:1;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
.learning-img img{
    width: 100%;
    height: 100%;
    object-fit: cover; 
}

.experiment-title {
    color: #fff;
    font-size: 1.8em;
    font-weight: bold;
    text-shadow: 1px 1px 4px rgba(0,0,0,0.2);
    position: relative;
    z-index: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: none;
    -webkit-user-select: none;
    user-select: none;
}

.experiment-learning {
    height: 100%;
    position: relative;
}

/* 引擎容器：覆盖在背景图上，避开顶部导航栏 */
.engine-wrapper {
    position: absolute;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    background: #fff;
    overflow: hidden;
}

.experiment-iframe {
    width: 100%;
    height: 100%;
    border: none;
    z-index: 200;
}

.iframe-container {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 200;
    scrollbar-width: none;
    top: 70px;
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
    background: #3084ce;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.back-button {
    position: absolute;
    left: 32px;
    background: transparent;
    color: #fff;
    box-shadow: none;
    border-radius: 4px;
    font-size: 1.2em;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    transition: background 0.2s;
    -webkit-user-select: none;
    user-select: none;
}

.back-button:hover {
    background: rgba(255,255,255,0.12);
}

.back-button span {
    opacity: 1;
    visibility: visible;
    margin-left: 0;
    color: #fff;
    font-size: 1em;
}
.back-btn-icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    padding-bottom: 1px;
    user-select: none;
}


.goal-panel {
    position: fixed;
    user-select: none;
    right: -16rem; /* 初始缩进到右侧，面板只露出一小部分 */
    top: 50%;
    transform: translateY(-50%);
    background: #fff;
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 2px 8px rgba(0,0,0,0.08);
    padding: 18px 24px 18px 18px;
    min-width: 220px;
    width: 16rem;
    z-index: 300;
    transition: right 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s, background 0.3s;
    overflow: visible;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
}
.goal-panel-label {
    position: absolute;
    left: -1.9em;
    top: 50%;
    height: 7em; 
    transform: translateY(-50%);
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 1.2em;
    color: #1976d2;
    letter-spacing: 0.2em;
    background: #fff;
    border-radius: 8px 0 0 8px;
    padding: 10px 4px 10px 4px;
    box-shadow: -2px 2px 8px rgba(0,0,0,0.08);
    z-index: 300;
    pointer-events: auto;
    opacity: 1;
    transition: opacity 0.3s;
    display: flex;
    align-items: center; 
    justify-content: center;
    transition-delay: 0.4s;
}

.goal-panel:hover .goal-panel-label {
    opacity: 0;
    transition: opacity 0.3s;
}

.goal-panel:hover {
    right: 0; 
    background: #fff;
    box-shadow: -2px 2px 16px rgba(0,0,0,0.16);
}
.goal-title {
    writing-mode: unset;
    transform: none;
    font-size: 1.2em;
    margin-bottom: 12px;
    margin-top: 0;
    color: #1976d2;
    height: auto;
    line-height: normal;
    text-align: left;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s 0.2s, visibility 0.3s 0.2s;
}

.goal-panel ul,
.practice-btn,
.download-button {
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s 0.2s, visibility 0.3s 0.2s;
}
.goal-panel:hover ul,
.goal-panel:hover .practice-btn,
.goal-panel:hover .download-button {
    opacity: 1;
    visibility: visible;
}
.goal-panel:hover .goal-title {
    opacity: 1;
    visibility: visible;
}
.goal-title {
    margin-bottom: 12px;
}
.goal-panel ul {
    margin-bottom: 10px;
}
.goal-panel li {
    margin-bottom: 10px;
    font-size: 1em;
    display: flex;
    align-items: center;
}
.goal-panel li.done {
    color: #1976d2;
    text-decoration: line-through;
}
.btn-container{
    display: flex;
    flex-direction: row;
}
.drag-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 40px;
  background:  #f0f0f0 url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24"><path d="M8 5h2v2H8zm0 6h2v2H8zm0 6h2v2H8zm6-12h2v2h-2zm0 6h2v2h-2zm0 6h2v2h-2z"/></svg>') no-repeat center;
  background-size: 18px;
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
}
.goal-done {
    margin-left: 8px;
    color: #43a047;
    font-size: 1.2em;
}
.complete-dialog {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.dialog-content {
    background: #fff;
    border-radius: 10px;
    padding: 32px 48px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    text-align: center;
}
.dialog-content button {
    margin: 18px 16px 0 16px;
    padding: 10px 20px;
    font-size: 1.1em;
    border-radius: 5px;
    border: none;
    background: #1976d2;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
}
.dialog-content button:hover {
    background: #1251a3;
}
.practice-btn {
    padding: 10px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    background-color: #1976d2;
    color: white;
}
.download-button {
    padding: 10px 15px;
    margin-left: 5px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
    background-color: #1976d2;
    color: white;
}
.practice-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5); 
    z-index: 1000;
}

.top-bar {
    width: 100%;
    height: 64px;
    background: rgba(25, 118, 210, 0.95);
    display: flex;
    align-items: center;
    justify-content: center; /* 居中内容 */
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1001;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    padding: 0 32px;
}

.help-button {
    position: absolute;
    right: 32px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 1.5em;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: background 0.3s;
}

.help-button:hover {
    background: #1251a3;
}

/* AI 助手按钮 — 纯色小球，右侧半收，hover 展开 */
.ai-assistant {
  position: fixed;
  z-index: 10000;
  border-radius: 50%;
    bottom: 30px;
    right: -20px;
    width: 40px;
    height: 40px;
  border: none;
    background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
  box-shadow: 0 4px 12px rgba(102, 166, 255, 0.3);
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
.ai-assistant::after {
    content: "AI";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
    font-size: 18px;
  pointer-events: none;
}
.ai-assistant:hover {
  right: 0;
  transform: rotate(360deg) scale(1.1);
}
</style>
