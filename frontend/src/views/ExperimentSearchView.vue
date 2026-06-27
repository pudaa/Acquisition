<template>
  <div class="experiment-view" ref="bgContainer">
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

    <!-- 实验列表 -->
    <div class="experiment-grid">
      <div 
        v-for="experiment in filteredExperiments"
        :key="experiment.id"
        class="experiment-card"
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
          <button 
            v-if="!experiment.is_added"
            class="add-btn"
            @click="addToTasks(experiment.id)"
          >
           <!-- || experiment.progress === 0 -->
            ＋ 添加至我的任务
          </button>
          <span v-else class="added-label">已在任务中</span>
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
import api from '../api';
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

export default {
  components: {
    FontAwesomeIcon
  },
  data() {
    return {
      searchQuery: '',
      experiments: [],        // 所有实验数据
      loading: false,
      icons: {
        search: faSearch 
      }
    }
  },
  computed: {
    // 根据搜索词过滤实验
    filteredExperiments() {
      return this.experiments.filter(exp => {
        if (!exp) return false;
        return exp.title.toLowerCase().includes(this.searchQuery.toLowerCase());
      });
    }
  },
  created() {
    this.debouncedSearch = debounce(async () => {
      await this.loadExperiments();
    }, 500);
  },
  mounted() {
    this.loadExperiments();
  },
  methods: {
    async loadExperiments() {
      this.loading = true;
      try {
        const response = await api.get('/experiments/all');
        this.experiments = response.data?.data || [];
      } catch (error) {
        console.error('加载失败:', error);
      } finally {
        this.loading = false;
      }
    },
    async addToTasks(experimentId) {
      try {
        const response = await api.post('/experiments/user/tasks', { experimentId });
        if(response.data.code===200){
          alert('已添加至我的任务');
          await this.loadExperiments();
        }else{
          alert('添加失败'+response.data.error);
        }
      } catch (error) {
        // 针对已存在的情况单独提示
        if (error.response && error.response.status === 400) {
          alert('该实验已在任务列表中');
        } else {
          alert('添加失败: ' + (error.response?.data?.error || error.message));
        }
        console.error('添加失败:', error);
      }
    },
    handleSearch() {
      this.debouncedSearch();
    },
    onImgError(event) {
        event.target.src = '/covers/default.png';
    }  
  }
}
</script>

<style scoped>
.add-btn {
  width: 100%;
  padding: 8px;
  margin-top: 12px;
  background: #00a1d6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.add-btn:hover {
  opacity: 0.9;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}
</style>

