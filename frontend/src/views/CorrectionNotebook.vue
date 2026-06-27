<template>
  <div class="correction-notebook-view" ref="bgContainer">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <font-awesome-icon 
        :icon="icons.search" 
        class="search-icon"
      />
      <input 
        v-model="searchQuery"
        placeholder="搜索错题..."
        @input="handleSearch"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <!-- 错题列表 -->
    <div class="notebook-list">
      <div 
        v-for="(exp, expIdx) in filteredNotebook" 
        :key="exp.exp_id" 
        class="experiment-group"
      >
        <h2 class="experiment-title highlight-title">{{ exp.experiment_title }}</h2>
        <div 
          v-for="(row, rowIdx) in groupByThree(exp.questions)" 
          :key="rowIdx"
          class="notebook-row"
        >
          <div 
            v-for="item in row"
            :key="item.id || item.question_id"
            class="notebook-card"
          >
            <div class="info">
              <h3>{{ item.title }}</h3>
              <!-- 选项展示 -->
              <ul class="options-list">
                <li 
                  v-for="(opt, idx) in parseOptions(item.options)" 
                  :key="idx"
                  :class="{
                    'user-selected': isUserSelected(idx, item.user_answer)
                  }"
                >
                  <span class="option-label">{{ optionLabel(idx) }}.</span>
                  <span>{{ opt }}</span>
                </li>
              </ul>
              <!-- 学生作答 -->
              <p class="meta">
                <span>我的作答：{{ formatUserAnswer(item.user_answer) }}</span>
              </p>
              <p class="meta correct-answer">
                <span>正确答案：{{ formatUserAnswer(item.correct_answers) }}</span>
              </p>
            </div>
            <div class="card-bottom">
              <button 
                class="review-btn"
                @click="reviewItem(item.id || item.question_id)"
              >
                查看解析
              </button>
            </div>
          </div>
        </div>
        <!-- 分隔线，最后一个实验不显示 -->
        <div v-if="expIdx !== filteredNotebook.length - 1" class="experiment-divider"></div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 解析详情悬浮窗 -->
    <div v-if="showAnalysis" class="analysis-modal">
      <div class="modal-content">
        <button class="close-btn" @click="closeAnalysis">×</button>
        <h3>{{ selectedQuestion.title }}</h3>
        <!-- 选项展示 -->
        <ul class="options-list">
          <li 
            v-for="(opt, idx) in parseOptions(selectedQuestion.options)" 
            :key="idx"
          >
            <span class="option-label">{{ optionLabel(idx) }}.</span>
            <span>{{ opt }}</span>
          </li>
        </ul>
        <p><strong>我的答案：</strong> {{ formatUserAnswer(selectedQuestion.user_answer) }}</p>
        <p><strong>正确答案：</strong> {{ formatUserAnswer(selectedQuestion.correct_answers) }}</p>
        <p><strong>解析：</strong> {{ selectedQuestion.analysis || '暂无解析' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { debounce } from 'lodash-es';
import api, { isAnswerEqual } from '../api'; // 路径根据实际情况调整
import { ref } from 'vue';

export default {
  components: {
    FontAwesomeIcon
  },
  data() {
    return {
      searchQuery: '',
      notebook: [], 
      loading: false,
      icons: {
        search: faSearch 
      },
      showAnalysis: false,
      selectedQuestion: {},
    }
  },
  computed: {
    // 根据搜索词过滤错题（不再判断 is_correct 字段）
    filteredNotebook() {
      const isWrong = (userAnswer, correctAnswers) => {
        return !isAnswerEqual(userAnswer, correctAnswers);
      };
      let list = this.notebook.map(exp => {
        const filteredQuestions = (exp.questions || []).filter(q =>
          isWrong(q.user_answer, q.correct_answers)
        );
        return { ...exp, questions: filteredQuestions };
      });
      if (!this.searchQuery) return list.filter(exp => exp.questions.length > 0);
      const query = this.searchQuery.toLowerCase();
      return list
        .map(exp => {
          const filteredQuestions = (exp.questions || []).filter(q =>
            (q.title || '').toLowerCase().includes(query)
          );
          return {
            ...exp,
            questions: filteredQuestions
          };
        })
        .filter(exp => exp.questions && exp.questions.length > 0);
    }
  },
  created() {
    this.debouncedSearch = debounce(async () => {
      await this.loadNotebook();
    }, 500);
  },
  mounted() {
    this.loadNotebook();
  },
  methods: {
    async loadNotebook() {
      this.loading = true;
      try {
        // 示例接口，请根据实际后端调整
        const response = await api.get('/practice/correction-notebook/all');
        this.notebook = response.data?.data || [];
        console.log('Loaded notebook:', this.notebook);
      } catch (error) {
        console.error('加载失败:', error);
      } finally {
        this.loading = false;
         console.log('Loaded notebook:', this.notebook);
      }
    },
    reviewItem(id) {
      console.log('Clicked question ID:', id);
      console.log('Notebook data:', this.notebook);
      // Find the question in the notebook
      let foundQuestion = null;
      for (const exp of this.notebook) {
        foundQuestion = exp.questions.find(item => String(item.id) === String(id));
        if (foundQuestion) break;
      }

      if (foundQuestion) {
        this.selectedQuestion = foundQuestion;
        this.showAnalysis = true;
        console.log('Selected question:', this.selectedQuestion);
        console.log('Show analysis flag:', this.showAnalysis);
      } else {
        console.warn('Question not found for ID:', id);
      }
    },
    closeAnalysis() {
      this.showAnalysis = false;
      this.selectedQuestion = {};
    },
    handleSearch() {
      this.debouncedSearch();
    },
    onImgError(event) {
      event.target.src = '/covers/default.png';
    },
    // 解析 options 字段为数组
    parseOptions(options) {
      if (!options) return [];
      if (typeof options === 'string') {
        try {
          return JSON.parse(options);
        } catch {
          return [];
        }
      }
      return options;
    },
    // 判断学生是否选中该选项
    isUserSelected(idx, userAnswer) {
      let ans = userAnswer;
      if (typeof ans === 'string') {
        try {
          ans = JSON.parse(ans);
        } catch {
          ans = [ans];
        }
      }
      if (!Array.isArray(ans)) ans = [ans];
      return ans.map(a => Number(a)).includes(idx);
    },
    // A/B/C/D
    optionLabel(idx) {
      return String.fromCharCode(65 + idx);
    },
    formatUserAnswer(userAnswer) {
      let ans = userAnswer;
      if (typeof ans === 'string') {
        try {
          ans = JSON.parse(ans);
        } catch {
          ans = [ans];
        }
      }
      if (!Array.isArray(ans)) ans = [ans];
      return ans.map(a => this.optionLabel(Number(a))).join('，');
    },
    groupByThree(list) {
      const res = [];
      for (let i = 0; i < (list?.length || 0); i += 3) {
        res.push(list.slice(i, i + 3));
      }
      return res;
    },
  }
}
</script>

<style scoped>
.correction-notebook-view {
  width: 100vw;
  min-height: 85vh;
  overflow-y: auto;
  background: #ffffff;
  padding-bottom: 40px;
}
.notebook-list {
  width: 100%;
  max-width: 1400px; 
  margin: 1rem;
  padding-bottom: 40px;
}
.notebook-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 24px;
  justify-content: flex-start;
  max-width: 100%; 
}
.notebook-card {
  flex: 0 0 calc(25% - 18px); /* 每行最多4张卡片，减去gap的影响 */
  width: calc(25% - 18px);
  min-width: 430px;
  max-width: 500px; 
  min-height: 270px;
  background: linear-gradient(135deg, #ffffff 80%, #e3e7ed 100%);
  border-radius: 14px;
  box-shadow: 0 4px 18px rgba(90, 181, 255, 0.10), 0 1.5px 6px rgba(0,0,0,0.06);
  border: 1.5px solid #e0e4ea;
  padding: 20px 18px 16px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  position: relative;
  transition: box-shadow 0.2s;
}
.notebook-card:hover {
  box-shadow: 0 8px 32px rgba(90, 181, 255, 0.18), 0 2px 8px rgba(0,0,0,0.10);
  border-color: #ffd180;
}
.info {
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 140px;
}
.notebook-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #333;
  letter-spacing: 0.5px;
}
.options-list {
  font-size: 15px;
  background: #ffffff;
  border-radius: 8px;
  padding: 8px 10px 8px 10px;
  margin-bottom: 10px;
}
.options-list li {
  padding: 2.5px 0;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.2s;
}
.user-selected {
  background: #ffe0b2;
  border-radius: 4px;
}
.option-label {
  font-weight: bold;
  margin-right: 4px;
  color: #ff9800;
}
.meta, .correct-answer {
  font-size: 14px;
  margin-top: 6px;
  margin-bottom: 0;
  display: flex;
  align-items: center;
}
.meta span {
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 5px;
  padding: 2px 8px;
  margin-right: 8px;
  font-weight: 500;
}
.correct-answer span {
  background: #ffe0b2;
  color: #e65100;
  border-radius: 5px;
  padding: 2px 8px;
  font-weight: 500;
}
.card-bottom {
  width: 100%;
  display: flex;
  align-items: flex-end;
  flex: none;
  margin-top: auto;
}
.review-btn {
  width: 100%;
  padding: 12px 0;
  background: linear-gradient(90deg, #ff9800 70%, #ffd180 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  font-size: 16px;
  font-weight: 600;
  min-height: 44px;
  box-shadow: 0 2px 8px rgba(255,152,0,0.10);
  letter-spacing: 1px;
}
.review-btn:hover {
  opacity: 0.92;
  box-shadow: 0 4px 16px rgba(255,152,0,0.18);
}
.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}
.experiment-group {
  width: 100%;
  margin-bottom: 32px;
}
.experiment-title {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
.experiment-title.highlight-title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 20px;
  color: #fff;
  background: linear-gradient(90deg, #ff9800 60%, #ffd180 100%);
  padding: 14px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(255,152,0,0.10);
  letter-spacing: 1px;
  display: inline-block;
}
.experiment-divider {
  border-bottom: 2px dashed #ffd180;
  margin: 36px 0 24px 0;
  width: 100%;
  height: 0;
  opacity: 0.85;
}
.search-bar {
    position: relative;
    margin: 20px;
    max-width: 500px;
}
.search-icon {
    position: absolute;
    width: 18px;
    height: 18px;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    font-size: 16px;
}
.search-bar input {
    width: 100%;
    padding: 12px 20px 12px 40px;
    border: none;
    border-radius: 20px;
    background: #f5f5f5;
    font-size: 16px;
    outline: none;
    transition: all 0.3s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.search-bar input:focus {
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.analysis-modal {
      position: fixed;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(90, 181, 255, 0.18), 0 2px 8px rgba(0, 0, 0, 0.1);
      width: 40%;
      height: 80%;
      z-index: 1000;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: calc(1rem + 0.5vw); /* 自适应字体大小 */
    }

    .analysis-modal h3 {
      font-size: calc(1.2rem + 0.5vw);
      font-weight: 700;
      margin: 10px;
      color: #333;
      letter-spacing: 0.5px;
    }

    .analysis-modal p {
      font-size: calc(1rem + 0.3vw);
      margin-bottom: 10px;
      color: #555;
    }

    .analysis-modal li {
      font-size: calc(0.8rem + 0.3vw);
      margin-bottom: 10px;
    }

    .analysis-modal .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      font-size: calc(1.5rem + 0.5vw);
      cursor: pointer;
      color: #999;
      transition: color 0.2s;
    }

    .analysis-modal .close-btn:hover {
      color: #ff9800;
    }

    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .close-btn {
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #999;
      z-index: 10;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f5f5f5;
      color: #ff9800;
      transform: rotate(90deg);
    }

    .close-modal-btn {
      padding: 10px 24px;
      background: linear-gradient(90deg, #ff9800 70%, #ffd180 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);
    }

    .close-modal-btn:hover {
      opacity: 0.9;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
      transform: translateY(-1px);
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .modal-content {
        width: 95%;
        max-height: 90vh;
      }
      
      .modal-header {
        padding: 20px 20px 12px;
      }
      
      .modal-body {
        padding: 16px 20px;
      }
      
      .modal-header h3 {
        font-size: 18px;
      }
    }
</style>

<style>
@import '@/assets/css/experiment.css';
</style>