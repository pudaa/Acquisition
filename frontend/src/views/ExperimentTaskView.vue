<template>
    <div class="experiment-view" ref="bgContainer">
        <!-- threejs 背景自动插入 -->
        <!-- 搜索栏 -->
        <div class="search-bar">
            <font-awesome-icon 
                :icon="icons.search" 
                class="search-icon"
            />
            <input 
                v-model="searchQuery"
                placeholder="搜索实验..."
                @input="handleSearch"
            />
        </div>

        <!-- 标签页  -->
        <div class="tab-container">
            <div 
                class="tab-item" 
                :class="{ 'active': activeTab === 'unfinished' }"
                @click="activeTab = 'unfinished'"
            >
                未完成 ({{ unfinishedCount }})
            </div>
            <div 
                class="tab-item"
                :class="{ 'active': activeTab === 'completed' }"
                @click="activeTab = 'completed'"
            >
                已完成 ({{ completedCount }})
            </div>
        </div>

        <!-- 实验列表 -->
        <div class="experiment-grid">
            <div 
                v-for="experiment in filteredExperiments"
                :key="experiment.id"
                class="experiment-card"
                @click="enterExperiment(experiment)"
            >
                <img 
                    :src="experiment.cover" 
                    alt="实验封面"
                    class="cover"
                    loading="lazy"
                    @error="onImgError"
                />
                <div class="info">
                    <h3>{{ experiment.title }}</h3>
                    <p class="meta">
                        <span>⏱️ {{ experiment.duration }}分钟</span>
                    </p>
                    <progress 
                        :value="experiment.progress" 
                        max="100"
                        v-if="activeTab === 'unfinished'"
                    />
                </div>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading">加载中...</div>
    </div>
</template>

<script>
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { debounce } from 'lodash-es';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import api from '../api';
// const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));

export default {
    components: {
        FontAwesomeIcon
    },
    data() {
        return {
            searchQuery: '',
            activeTab: 'unfinished', // 当前激活的标签页
            experiments: [],        // 从后端获取的实验数据
            loading: false,
            page: 1,
            totalPages: 1,
            icons: {
                search: faSearch // 使用正确的图标引用
            },
            user: JSON.parse(localStorage.getItem('user')) || null
        }
    },
    mounted() {
        // 页面加载时加载实验
        this.loadExperiments(); 
    },
    methods: {
        async loadExperiments() {
            this.loading = true;
            try {
                const response = await api.get('/experiments', {
                    params: { 
                        page: this.page,
                        search: this.searchQuery ,
                        pageSize:10
                    }
                });
                console.log('API响应:', response.data);
                
                // 处理单对象数据结构
                const responseData = response.data?.data || [];
                this.experiments = Array.isArray(responseData) 
                    ? responseData 
                    : [responseData].filter(Boolean);
                // 修正分页参数处理
                this.totalPages = Math.max(
                    response.data?.pagination?.total_pages || 1,
                    1 // 确保至少有1页
                );
            } catch (error) {
                console.error('请求错误详情:', error.response || error);
                this.experiments = []; // 确保保持数组类型
            } finally {
                this.loading = false;
            }
        },
        onImgError(event) {
            event.target.src = '/covers/default.png';
        },
        enterExperiment(experiment) {
            console.log("用户", this.user, "进入实验", experiment)
            if (!experiment) {
                console.error("实验数据为空");
                return;
            }
            const userId = this.user?.id; // 获取 ref 的真实值
            if (!userId) {
                console.error("用户未登录或 user.value 为空");
                alert("请先登录！");
                this.$router.push("/login");
                return;
            }
            this.$router.push({
                path: '/learn',
                query: { 
                    expId: experiment.id,
                    studentId: userId // 使用正确的参数名
                }
            });
        }
    },
    computed: {
        // 根据标签页和搜索词过滤实验
        filteredExperiments() {
            return this.experiments.filter(exp => {
                // 添加空值保护
                if (!exp) return false;
                
                const isCompleted = Boolean(exp.is_completed);
                const matchTab = this.activeTab === 'completed' ? isCompleted : !isCompleted;
                return matchTab;
            });
        },
        // 未完成实验计数
        unfinishedCount() {
            return this.experiments.filter(exp => !exp.is_completed).length
        },
        // 已完成实验计数
        completedCount() {
            return this.experiments.filter(exp => exp.is_completed).length
        }
    },
    beforeRouteEnter(to, from, next) {
        // 添加路由守卫验证
        if (!localStorage.getItem('token')) {
            next('/login')
        } else {
            next()
        }
    },
    created() {
        // 初始化防抖函数
        this.debouncedSearch = debounce(async () => {
            this.page = 1;
            await this.loadExperiments();
        }, 500);
    }
}
</script>

<style scoped>
    @import "@/assets/css/experiment.css";
</style>