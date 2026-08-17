<template>
    <div class="experiment-view">
        <!-- 筛选条件 -->
        <div class="filter-bar">
            <div class="filter-group">
                <span>时间范围：</span>
                <select v-model="timeRange" class="filter-select">
                    <option value="all">全部时间</option>
                    <option value="7">最近7天</option>
                    <option value="30">最近30天</option>
                </select>
                <span class="filter-divider">|</span>
                <span>实验筛选：</span>
                <select v-model="selectedExperiment" class="filter-select">
                    <option value="all">全部实验</option>
                    <option v-for="exp in experiments" :value="exp.id">{{ exp.title }}</option>
                </select>
            </div>
        </div>

        <!-- 图表展示区 -->
        <div class="chart-grid">
            <!-- 实验完成率分布（仅显示全部实验时） -->
            <div class="chart-card" v-if="selectedExperiment === 'all'">
                <h3>实验完成率分布</h3>
                <div class="chart-container" ref="completionChart"></div>
            </div>

            <!-- 学习进度展示（分图表/表格模式） -->
            <div class="chart-card">
                <h3>学习进度详情</h3>
                <div v-if="selectedExperiment === 'all'" class="chart-container" ref="progressChart"></div>
                <div v-else class="progress-list">
                    <div class="progress-item" v-for="student in studentProgress" :key="student.id">
                        <span class="name">{{ student.realname }}</span>
                        <div class="progress-bar">
                            <div class="inner" :style="{ width: student.progress + '%' }"></div>
                            <span class="percentage">{{ student.progress }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 实验难度分布 -->
            <div class="chart-card" v-if="selectedExperiment === 'all'">
                <h3>实验难度分布</h3>
                <div class="chart-container" ref="difficultyChart"></div>
            </div>

            <!-- 操作行为统计 -->
            <div class="chart-card" v-if="selectedExperiment != 'all'">
                <h3>目标完成情况</h3>
                <div class="chart-container" ref="operationChart"></div>
            </div>
        </div>
    </div>
</template>

<script>
// 按需引入 ECharts（大幅减小包体：~1MB → ~400KB）
import * as echarts from 'echarts/core';
import { PieChart, LineChart } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([PieChart, LineChart, TooltipComponent, GridComponent, CanvasRenderer]);
import api from '../api';
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

export default {
    setup() {
        const timeRange = ref('all');
        const selectedExperiment = ref('all');
        const experiments = ref([]);
        const studentProgress = ref([])
        // 图表ref
        const completionChart = ref(null);
        const progressChart = ref(null);
        const difficultyChart = ref(null);
        const operationChart = ref(null);

        // 添加图表实例引用
        const charts = ref({
            completion: null,
            progress: null,
            difficulty: null,
            operation: null
        });

        // 初始化图表
        const initCharts = () => {
            nextTick(() => {
                try {
                    if (selectedExperiment.value === 'all') {
                        charts.value.completion = echarts.init(completionChart.value);
                        charts.value.progress = echarts.init(progressChart.value);
                        charts.value.difficulty = echarts.init(difficultyChart.value);
                    } else {
                        charts.value.operation = echarts.init(operationChart.value);
                    }
                } catch (error) {
                    console.error('图表初始化失败:', error);
                }
            });
        };
        let resizeDebounce = null;
        const handleResize = () => {
            // 防抖：仅调整已有图表尺寸，不重新加载数据（原实现每次 resize 都重建图表+重发请求）
            clearTimeout(resizeDebounce);
            resizeDebounce = setTimeout(() => {
                Object.values(charts.value).forEach(chart => {
                    if (chart !== null && !chart.isDisposed) {
                        chart.resize();
                    }
                });
            }, 300);
        };
        onMounted(() => {
            initCharts();
            loadExperiments();
            loadAnalysisData();
            window.addEventListener('resize', handleResize);
        });
        // 添加组件卸载时的清理
        onUnmounted(() => {
            clearTimeout(resizeDebounce);
            Object.values(charts.value).forEach(chart => chart?.dispose());
            window.removeEventListener('resize', handleResize);
        });

        // 获取实验数据
        const loadExperiments = async () => {
            try {
                const response = await api.get('/experiments/all');
                experiments.value = response.data?.data || [];
            } catch (error) {
                console.error('获取实验列表失败:', error);
            }
        };

        // 获取分析数据
        const loadAnalysisData = async () => {
            try {
                studentProgress.value = [];
                const params = { timeRange: timeRange.value, exp_id: selectedExperiment.value }; 
                if (selectedExperiment.value === 'all') {
                    const [completionRes, progressRes, difficultyRes] = await Promise.all([
                        api.get('/analysis/completion', { params }),
                        api.get('/analysis/progress-trend', { params }),
                        api.get('/analysis/difficulty', { params })
                    ]);

                    updateCharts({
                        completion: completionRes.data.data,
                        progress: progressRes.data.data,
                        difficulty: difficultyRes.data.data
                    });
                } else {
                    const [operationRes, studentsRes] = await Promise.all([
                        api.get('/analysis/operations', { params }),
                        api.get(`/experiments/${selectedExperiment.value}/students`, { params })
                    ]);
                    const studentData = studentsRes.data?.data || []; // 双重解构后端返回的{ data: [...] }
                    studentProgress.value = studentData.sort((a, b) => b.progress - a.progress);
                    updateCharts({
                        operations: operationRes.data.data
                    });
                }
            } catch (error) {
                console.error('获取数据失败:', error);
            }
        };

        const updateCharts = (data) => {
            // 完成率饼图
            if (data.completion && charts.value.completion) {
                const dataCount = data.completion.length;
                charts.value.completion.setOption({
                    color: generateBlueColors(dataCount),
                    tooltip: { trigger: 'item' },
                    series: [{
                        type: 'pie',
                        center: ['50%', '50%'],
                        data: data.completion.map(item => ({
                            name: item.title,
                            value: item.completed_users
                        }))
                    }]

                });
            }
            if (data.progress && charts.value.progress) {
                // 学习趋势折线图
                charts.value.progress.setOption({
                    xAxis: {
                        type: 'time',
                        boundaryGap: false  // 防止数据点被截断
                    },
                    yAxis: {
                        type: 'value',
                        max: 100,
                        min: 0
                    },
                    series: [{
                        name: '平均进度',  // 必须的series名称
                        type: 'line',
                        center: ['50%', '50%'],
                        data: (data.progress || []).map(item => [
                            new Date(item.date),  // 确保日期转换
                            Number(item.avg_progress || 0)  // 确保数值类型
                        ]),
                        smooth: true  // 添加平滑曲线
                    }]
                });
            }
            // 难度分布饼图roseType: 'radius',
            if (data.difficulty && charts.value.difficulty) {
                charts.value.difficulty.setOption({
                    color: generateBlueColors(data.difficulty.length),
                    tooltip: { trigger: 'item' },
                    center: ['50%', '50%'],
                    series: [{
                        type: 'pie',
                        data: data.difficulty.map(item => ({
                            name: item.name,
                            value: item.value
                        })),
                        label: {
                            formatter: '{b}: {d}%'
                        }
                    }]
                });
            }
            // 操作行为饼图
            if (data.operations && charts.value.operation) {
                charts.value.operation.setOption({
                    color: generateBlueColors(data.operations.length),
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    series: [{
                        name: '目标完成情况',
                        type: 'pie',
                        center: ['50%', '50%'],
                        radius: '70%',
                        data: (data.operations || []).map(item => ({
                            name: item.operation_type || '未知目标',
                            value: item.count
                        })),
                        label: {
                            formatter: '{b|{b}}\n{d}%',
                            rich: {
                                b: {
                                    fontSize: 14,
                                    lineHeight: 20
                                }
                            }
                        },
                        itemStyle: {
                            borderColor: '#fff',
                            borderWidth: 2
                        }
                    }]
                });
            }
        };
        // 重加载
        const reloadData = () => {
            // 销毁旧图表
            Object.values(charts.value).forEach(chart => chart?.dispose());
            charts.value = {
                completion: null,
                progress: null,
                difficulty: null,
                operation: null
            };
            // 重新初始化图表
            initCharts();
            loadAnalysisData();
        }
        watch([timeRange, selectedExperiment], () => {
            reloadData();
        });
        const generateBlueColors = (count) => {
            const colors = [];
            const baseHue = 210; // 蓝色基准色相
            const addingSaturation = 30 / (count - 1); // 饱和度增量
            const addingLightness = 50 / (count - 1); // 明度增量
            for (let i = 0; i < count; i++) {
                const saturation = 60 + (i * addingSaturation); // 饱和度递增
                const lightness = 40 + (i * addingLightness);  // 明度递增
                colors.push(`hsl(${baseHue}, ${saturation}%, ${lightness}%)`);
            }
            return colors;
        };
        return {
            timeRange,
            selectedExperiment,
            experiments,
            completionChart,
            progressChart,
            difficultyChart,
            operationChart,
            studentProgress
        };
    }
}
</script>

<style scoped>


.filter-bar {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    padding: 20px;
}

.chart-card {
    min-width: 0;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
}

.chart-card:hover {
    transform: translateY(-5px);
}

.chart-card h3 {
    margin: 0 0 15px 0;
    color: #2c3e50;
}

.chart-container {
    width: 100%;
    height: 300px;
    min-width: 0;
}

.chart-container div {
    width: 100%;
}

.chart-container canvas {
    width: 100%;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 15px;
}

.filter-select {
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #dcdfe6;
}

.filter-divider {
    color: #dcdfe6;
    margin: 0 10px;
}

.progress-list {
    padding: 15px;
}

.progress-item {
    margin: 12px 0;
    transition: transform 0.3s ease;
}

.progress-item:hover {
    transform: translateX(10px); 
}

.progress-bar {
    display: flex;
    align-items: center;
    height: 28px;
    background: #f0f0f0;
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    transition: transform 0.3s ease;
}

.progress-bar .inner {
    height: 100%;
    background: #1976d2;
    transition: width 0.6s ease transform 0.3s ease;
}

.progress-bar .percentage {
    position: absolute;
    color: white;
    -webkit-text-stroke: 0.6px #1976d2;
    right: 10px;
    font-size: 1em;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
