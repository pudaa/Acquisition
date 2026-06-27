<template>

    <div class="experiment-learning">
        <div position="relative">
            <div id="guide-container" :style="{ display: showGuide ? 'none':'block'}">
                <iframe 
                    id="guide-iframe" 
                    class="guideIframe"
                    src="/introduction/实验引导.html" 
                    title="操作引导动画"
                    @load="onGuideLoad"
                ></iframe>
            </div>
        </div>
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
            <!-- 问号按钮 -->
            <button class="help-button" @click="toggleGuide">
                ?
            </button>
        </div>

        <div class="learning-img">
            <img 
                src="/images/experiment2.jpg" 
                alt="实验背景"
                loading="lazy"
            />
        </div>


        <div class="iframe-container">
            <iframe 
                ref="expIframe"
                :src="experimentContentUrl" 
                class="experiment-iframe"
                allowfullscreen
                @load="onIframeLoad"
            ></iframe>
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
            :expId="expId"
            :iframe-data="iframeData"
            :screenshot-url="aiScreenshotUrl"
        />  
        
        <!-- 实验简介弹窗（首次进入显示） -->
        <ExperimentIntroductionPanel
            v-if="showIntroPanel"
            :expId="expId"
            @close="showIntroPanel = false"
        />
    </div>
</template>

<script>
import api from '@/api';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ExperimentReport from '@/assets/js/experiment-report.js';
import AIChatWindow from '@/components/AIChatWindow.vue'; 
import PracticePanel from '../components/PracticePanel.vue';
import ExperimentIntroductionPanel from '../components/ExperimentIntroductionPanel.vue'; 


export default {
    // 在ExperimentLearningView.vue中添加
    onGuideLoad() {
        // console.log('引导动画加载完成');
        // 检查iframe内容
        const iframe = document.getElementById('guide-iframe');
        // console.log('iframe内容:', iframe.contentDocument);
    },
    data() {
        return {
            experiment_title: '',
            experimentContentUrl: '',
            loading: true,
            currentProgress: 0,
            operationData: [],
            showCompleteDialog: false,
            showDownloadDialog: false,
            showPractice:false,
            expId: this.$route.query.expId,
            startTime: null, // 实验开始时间
            goals: [
                { id: 'oscillator', title: '完成多谐振荡器的搭建', done: false, action: 'GOAL_OSCILLATOR', weight: 3, finishTime: null, duration: null },
                { id: 'bulb', title: '成功让灯泡发光', done: false, action: 'GOAL_BULB_LIT', weight: 1, finishTime: null, duration: null },
                { id: 'resistor', title: '使用不少于4个电阻', done: false, action: 'GOAL_RESISTOR_4', weight: 1, finishTime: null, duration: null },
            ],
            dragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isLocked: false,
            showChatWindow: false,
            showIntroPanel: true, // 控制简介弹窗显示
            iframeData: null,
            showGuide: true, // 控制引导动画显示
            aiScreenshotUrl: null, // AI助手截图
            behaviorlogs: null, // 用于存储 AI 分析结果
        }
    },
    components: {
        AIChatWindow,
        PracticePanel,
        ExperimentIntroductionPanel
    },
    created() {
        const { expId } = this.$route.query;
        this.experimentContentUrl = `/experiments/${expId}/index.html`;
        this.startTime = new Date().toISOString();
        this.operationData = [];
        this.fetchExperimentGoals(expId);

        window.addEventListener('message', this.handleIframeMessage);
    },
    beforeUnmount() {
        window.removeEventListener('message', this.handleIframeMessage);
    },
    methods: {
        
        async goToExperimentFeeling() {
            // 发送请求让子页面上传用户日志
            await new Promise((resolve) => {
                const iframe = this.$refs.expIframe;
                if (iframe && iframe.contentWindow) {
                    // 监听一次日志返回
                    const onUserLog = (event) => {
                        if (!event.origin.startsWith(window.location.origin)) return;
                        if (event.data.type === 'UPLOAD_USER_LOG') {
                            // 打印日志内容
                            // console.log('收到子页面log:', event.data.log);
                            window.removeEventListener('message', onUserLog);
                            this.behaviorlogs = event.data.log; // 保存日志数据
                            resolve();
                        }
                    };
                    window.addEventListener('message', onUserLog);
                    // 发送日志请求
                    iframe.contentWindow.postMessage({ type: 'UPLOAD_USER_LOG' }, window.location.origin);
                    // 超时兜底，防止子页面无响应
                    setTimeout(() => {
                        window.removeEventListener('message', onUserLog);
                        resolve();
                    }, 1000);
                } else {
                    resolve();
                }
            });
            this.$router.push({
                name: 'ExperimentFeeling',
                query: {
                    expId: this.$route.query.expId,
                    expTitle: this.experiment_title,
                    goals: JSON.stringify(this.goals),
                    operations: JSON.stringify(this.operationData),
                    progress: this.currentProgress,
                    startTime: this.startTime,
                    endTime: new Date().toISOString(),
                    practiceScore: localStorage.getItem(`practice_score_${this.$route.query.expId}`) || 0,
                    screenshotUrl: this.screenshotUrl || '',
                    behaviorlogs: JSON.stringify(this.behaviorlogs),
                    
                },
            });
        },

        // AI助手按钮点击，先请求截图再显示窗口
  
        handleAIAssistantClick() {
            // 发送截图请求
            const iframe = this.$refs.expIframe;
            if (iframe && iframe.contentWindow) {
                // 监听一次截图返回
                const onScreenshot = (event) => {
                    if (!event.origin.startsWith(window.location.origin)) return;
                    if (event.data.type === 'EXPERIMENT_SCREENSHOT' && event.data.image) {
                        this.aiScreenshotUrl = event.data.image;
                        window.removeEventListener('message', onScreenshot);
                        this.showChatWindow = true;
                    }
                };
                window.addEventListener('message', onScreenshot);
                // 发送截图请求
                iframe.contentWindow.postMessage({ type: 'EXPERIMENT_COMPLETE' }, window.location.origin);
            } else {
                // iframe未加载，直接显示AI助手
                this.showChatWindow = true;
            }
        },
    

        // 切换引导动画显示状态
        toggleGuide() {
            this.showGuide = !this.showGuide; // 切换显示状态
        },
        // 隐藏引导动画
        hideGuide() {
            this.showGuide = !this.showGuide; // 隐藏 iframe
        },
        onIframeLoad() {
            this.loading = false;
            const iframe = this.$refs.expIframe;
            try {
                if (!iframe.contentWindow.document.getElementById('trail-effect-script')) {
                    const script = iframe.contentWindow.document.createElement('script');
                    script.id = 'trail-effect-script';
                    script.type = 'text/javascript';
                    script.src = '/js/trail-effect.js';
                    script.onload = () => {
                        if (iframe.contentWindow.TrailEffect) {
                            iframe.contentWindow.trailEffect = new iframe.contentWindow.TrailEffect();
                        }
                    };
                    iframe.contentWindow.document.body.appendChild(script);
                } else {
                    if (iframe.contentWindow.TrailEffect) {
                        iframe.contentWindow.trailEffect = new iframe.contentWindow.TrailEffect();
                    }
                }
            } catch (e) {
                // console.warn('拖尾效果注入失败:', e);
            }
        },
        // 统一消息处理方法
        handleIframeMessage(event) {
            
            // 验证消息来源
            if (!event.origin.startsWith(window.location.origin)) return;
            // 接收canvas截图
            if (event.data.type === 'EXPERIMENT_SCREENSHOT' && event.data.image) {
                // console.log('接收到截图:', event.data.image);
                this.screenshotUrl = event.data.image;
                return;
            }
            if (event.data.type === 'UPLOAD_USER_LOG') {
                //console.log('学生行为记录:',event.data.log);
                return;
            }

            if (event.data.type === 'CLOSE_GUIDE') {
                // console.log('关闭引导动画');
                this.showGuide = false;
                this.hideGuide();
                return;
            }

            if (event.data.type === 'CIRCUIT_INFO') {
                this.iframeData = event.data;
                //console.log('接收到电路信息:', event.data);
            }
            switch (event.data.type) {
                case 'PROGRESS_UPDATE': // 更新实验进度
                    // if (Array.isArray(event.data.doneGoals)) {
                    //     this.goals.forEach(goal => {
                    //         if (event.data.doneGoals.includes(goal.id)) {
                    //             this.setGoalDone(goal.id, false); // 不重复保存进度
                    //         }
                    //     });
                    // }
                    // 动态按权重计算进度
                    this.currentProgress = this.calcProgress();
                    this.saveLearningProgress();
                    break;
                case 'OPERATION_RECORD': // 记录操作
                    this.recordOperation(event.data);
                    // console.log('记录操作:', event.data);
                    const matchedGoal = this.goals.find(g => g.action === event.data.action);
                    // console.log('匹配目标:', matchedGoal, event.data.action);
                    if (matchedGoal) this.setGoalDone(matchedGoal.id);
                    break;
                case 'EXPERIMENT_COMPLETE': // 实验完成
                    this.goals.forEach(goal => this.setGoalDone(goal.id, false));
                    this.currentProgress = 100;
                    // this.handleExperimentComplete();
                    break;
            }
        },
        // 发送消息给实验内容
        sendMessageToExp(message) {
            const iframe = this.$refs.expIframe;
            if (iframe && iframe.contentWindow) {
                // 使用正确的目标源
                iframe.contentWindow.postMessage(message, window.location.origin);
            } else {
                console.warn('iframe 未加载完成，无法发送消息');
            }
        },
        // 保存学习进度到后端
        async saveLearningProgress() {
            try {
                await api.post('/experiments/save-progress', {
                    expId: this.$route.query.expId,
                    progress: this.currentProgress,
                    operations: this.operationData,
                    goals: this.goals
                });
            } catch (error) {
                console.error('进度保存失败:', error);
            }
        },
        recordOperation(operation) { // 记录操作
            this.operationData.push({
                ...operation,
                progress: this.currentProgress
            });
            // 自动保存进度
            // this.saveLearningProgress();
        },
        calcProgress() {
            // 按权重动态计算进度
            const totalWeight = this.goals.reduce((sum, g) => sum + (g.weight || 1), 0);
            const doneWeight = this.goals.filter(g => g.done).reduce((sum, g) => sum + (g.weight || 1), 0);
            return totalWeight === 0 ? 0 : Math.round(100 * doneWeight / totalWeight);
        },
        setGoalDone(goalId, save = true) {
            const goal = this.goals.find(g => g.id === goalId);
            if (goal && !goal.done) {
                goal.done = true;
                // 记录完成时间和耗时
                goal.finishTime = new Date().toISOString();
                if (this.startTime) {
                    goal.duration = this.calcGoalDuration(this.startTime, goal.finishTime);
                } else {
                    goal.duration = null;
                }
                this.currentProgress = this.calcProgress();
                if (save) this.saveLearningProgress();
                if (this.currentProgress === 100) this.handleExperimentComplete();
            }
        },
        // 计算目标耗时（分钟）
        calcGoalDuration(start, end) {
            const duration = new Date(end) - new Date(start);
            const minutes = Math.floor(duration / 1000 / 60);
            const hours = Math.floor(minutes / 60);
            return `${hours}小时${minutes % 60}分钟`;
        },
        // 处理实验完成
        async handleExperimentComplete() {
            // 向iframe发送实验完成消息，通知其截图
            console.log('处理实验完成');
            this.sendMessageToExp({ type: 'EXPERIMENT_COMPLETE' });
            await this.saveLearningProgress();
            this.showCompleteDialog = true;
        },
        downloadReport() {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    throw new Error('用户信息获取失败');
                }

                ExperimentReport.exportPDF({
                    user,
                    expId: this.$route.query.expId,
                    expTitle: this.experiment_title,
                    goals: this.goals,
                    operations: this.operationData,
                    score: this.currentProgress,
                    startTime: this.startTime || new Date().toISOString(),
                    endTime: new Date().toISOString(),
                    practiceScore: localStorage.getItem(`practice_score_${this.$route.query.expId}`),
                    screenshotUrl: this.screenshotUrl,
                    analysisResult: analysisResult.answer || 'AI 分析失败，请稍后重试。'
                });
            } catch (error) {
                alert('实验报告导出失败，请稍后重试');
                console.error('实验报告导出失败:', error);
            }
        },
        // 离开确认
        confirmLeave() {
            if (confirm('确定要离开当前实验吗？未保存的进度可能会丢失')) {
                this.$router.go(-1); // 返回上一页
            }
        },
        async fetchExperimentGoals(expId) {
            try {
                const response = await api.get(`/experiments/${expId}/steps`);
                const experimentTitle = await api.get(`/experiments/${expId}/title`);
                this.experiment_title = experimentTitle.data.title;
                const seenIds = new Set();
                this.goals = response.data.steps.steps.map((step, index) => {
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
                        duration: null 
                    };
                });
            } catch (error) {
                console.error('获取实验目标失败:', error);
            }
        },
        
    }
}
</script>

<style scoped>
@import '@/assets/css/home.css';

#guide-container {
    position: fixed;
    z-index: 10000;
    width: 100%;
    height: 100%;
    display: none; 
}
.guideIframe {
    width: 100vw;
    height: 100vh;
    border: none;
    object-fit: cover;
}
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
</style>
