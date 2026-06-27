<template>
  <div class="experiment-view">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <font-awesome-icon :icon="icons.search" class="search-icon" />
      <input 
        v-model="searchQuery"
        placeholder="搜索学生..."
        @input="handleSearch"
      />
    </div>

    <!-- 学生列表 -->
    <div class="student-list">
      <!-- 表头 -->
      <div class="list-header">
        <div>姓名</div>
        <div>学号</div>
        <div>平均完成率</div>
        <div>学习详情</div>
      </div>

      <!-- 学生项 -->
      <div 
        v-for="student in filteredStudents" 
        :key="student.user_id"
        class="student-item"
      >
        <div class="student-info" @click="toggleExpand(student)">
          <div>{{ student.realname }}</div>
          <div>{{ student.username || '未设置' }}</div>
          <div>{{ student.average_progress.toFixed(1) }}%</div> 
          <div>
              {{ expandedStudent === student.user_id ? '收起' : '展开' }}
          </div>
        </div>

        <!-- 展开内容 -->
        <div 
          v-if="expandedStudent === student.user_id"
          class="expanded-content"
        >
          <div class="task-toolbar">
            <input
              v-model="searchTaskQuery"
              placeholder="搜索当前学生的实验"
              class="search-input"
              >
            <button @click="showAddDialog(student)" class="add-experiment">
              添加实验任务
            </button>
          </div>
          <div class="experiment-list">
            <div 
              v-for="task in filteredStudentTasks" 
              :key="task.id"
              class="experiment-card"
            >
              <h3>{{ task.title }}</h3>
              <div class="meta">
                <span class="difficulty" :data-difficulty="task.difficulty">{{ task.difficulty }}</span>
                <div class="progress-bar">
                    <span class="percentage">{{ task.progress }}%</span>
                    <div class="inner" :style="{ width: task.progress + '%' }"></div>
                </div>
                <div class="practice-stats-bar" style="margin-top: 8px;">
                  <template v-if="practiceRatePerExp[expandedStudent] && practiceRatePerExp[expandedStudent][task.id]">
                    <span>答题正确率：</span>
                    <span class="practice-rate">
                      {{
                        practiceRatePerExp[expandedStudent][task.id].total > 0
                          ? ((practiceRatePerExp[expandedStudent][task.id].correct / practiceRatePerExp[expandedStudent][task.id].total * 100).toFixed(1) + '%')
                          : '未答题'
                      }}
                    </span>
                    <span v-if="practiceRatePerExp[expandedStudent][task.id].total > 0" class="practice-detail">
                      （{{ practiceRatePerExp[expandedStudent][task.id].correct }}/{{ practiceRatePerExp[expandedStudent][task.id].total }}）
                    </span>
                  </template>
                  <template v-else>
                    <span>答题正确率：未答题</span>
                  </template>
                </div>
              </div>
            </div>
            
          </div>

          
        </div>
      </div>
    </div>

    <!-- 添加实验弹窗 -->
    <div v-if="showDialog" class="dialog-overlay">
      <div class="experiment-dialog">
        <div class="dialog-header">
          <h3>为 {{ selectedStudent?.username }} 添加实验</h3>
          <input 
            v-model="expSearchQuery" 
            placeholder="搜索实验..."
            class="search-input"
          />
        </div>
        
        <div class="experiment-grid">
          <div 
            v-for="exp in filteredExperiments"
            :key="exp.exp_id"
            class="add-experiment-card"
          >
            <div class="exp-info">
              <h4>{{ exp.title }}</h4>
              <img :src="exp.cover" alt="实验封面">
            </div>
            <button 
              @click="addExperimentToStudent(exp)"
              class="add-btn"
            >
              ＋ 添加
            </button>
          </div>
        </div>

        <button 
          @click="showDialog = false"
          class="close-btn"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { ref, computed, onMounted } from 'vue'
import api from '../api'
import _ from 'lodash'

export default {
  setup() {
    const searchQuery = ref('')
    const expSearchQuery = ref('')
    const expandedStudent = ref(null)
    const selectedStudent = ref(null)
    const showDialog = ref(false)
    const students = ref([])
    const experiments = ref([])
    const studentTasks = ref([])
    const searchTaskQuery = ref('');
    const practiceRate = ref({}); // { [user_id]: { total, correct } }
    const practiceRatePerExp = ref({}); 
    const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
    // 获取学生列表
    const loadStudents = async () => {
      try {
        const res = await api.get('/teacher/students', { 
          params: { role: 'student' } 
        })
        console.log("学生数据",res.data.data)
        students.value = res.data.data
      } catch (error) {
        console.error('获取学生列表失败:', error)
      }
    }

    // 获取可添加实验
    const loadExperiments = async () => {
      try {
        const res = await api.get('/experiments/all')
        console.log("实验信息",res.data.data)
        experiments.value = res.data.data
      } catch (error) {
        console.error('获取实验列表失败:', error)
      }
    }
    const loadStudentTasks = async (student) => {
        try {
            const res = await api.get(`/teacher/students/${student.user_id}/experiments`);
            studentTasks.value = res.data.data;
        } catch (error) {
            console.error('刷新任务列表失败:', error);
        }
    };
    // 添加实验任务
    const addExperimentToStudent = async (experiment) => {
      try {
        await api.post(`/teacher/students/${selectedStudent.value.user_id}/experiments`, {
            expId: experiment.id,
        })
        alert('添加成功')
        loadStudentTasks(selectedStudent.value)
      } catch (error) {
        alert(error.response?.data?.error || '添加失败')
      }
    }

    // 显示添加对话框
    const showAddDialog = async (student) => {
      selectedStudent.value = student
      showDialog.value = true
      await loadExperiments()
    }

    // 过滤逻辑
    const filteredStudents = computed(() => {
      return students.value.filter(s => 
        (s.class_name === user.value.class_name) &&
        (
          s.realname.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          s.username?.includes(searchQuery.value)
        )
      )
    })
    const filteredStudentTasks = computed(() => {
      return studentTasks.value.filter(task =>
        task.title.toLowerCase().includes(searchTaskQuery.value.toLowerCase())
      );
    });

    const filteredExperiments = computed(() => {
        // console.log('计算过滤实验', {
        //     experiments: experiments.value,
        //     tasks: studentTasks.value.length,
        //     search: expSearchQuery.value
        // })
        return experiments.value.filter(exp => 
            !studentTasks.value.some(t => t.id === exp.id) &&
            exp.title.toLowerCase().includes(expSearchQuery.value.toLowerCase())
        )
    })

    const loadPracticeRate = async (student) => {
      try {
        const res = await api.get(`/teacher/students/${student.user_id}/practice-rate`);
        practiceRate.value[student.user_id] = res.data.data;
      } catch (e) {
        practiceRate.value[student.user_id] = null;
      }
    };

    const loadPracticeRatePerExp = async (student, tasks) => {
      if (!practiceRatePerExp.value[student.user_id]) {
        practiceRatePerExp.value[student.user_id] = {};
      }
      for (const task of tasks) {
        try {
          const res = await api.get(`/teacher/students/${student.user_id}/experiments/${task.id}/practice-rate`);
          practiceRatePerExp.value[student.user_id][task.id] = res.data.data;
        } catch (e) {
          practiceRatePerExp.value[student.user_id][task.id] = null;
        }
      }
    };

    const toggleExpand = async (student) => {
      if (expandedStudent.value === student.user_id) {
        expandedStudent.value = null
      } else {
        expandedStudent.value = student.user_id
        try {
          const res = await api.get(`/teacher/students/${student.user_id}/experiments`)
          studentTasks.value = res.data.data
          await loadPracticeRatePerExp(student, studentTasks.value); 
        } catch (error) {
          console.error('获取学生实验失败:', error)
        }
        await loadPracticeRate(student);
      }
    }

    onMounted(() => {
      loadStudents()
      loadExperiments()
    })

    return {
      icons: { search: faSearch },
      searchQuery,
      searchTaskQuery,
      expSearchQuery,
      filteredStudents,
      filteredExperiments, 
      filteredStudentTasks,
      experiments,
      studentTasks,
      expandedStudent,
      toggleExpand,
      selectedStudent,
      showDialog,
      loadStudents,
      loadStudentTasks,
      showAddDialog,
      addExperimentToStudent,
      practiceRate,
      practiceRatePerExp,
    }
  }
}
</script>

<style scoped>
@import "@/assets/css/experiment.css";

.student-list {
  width: 98%;
  height: 90%;
  margin: auto;
  border-radius: 8px;
  overflow: scroll;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  scrollbar-width: none;
}
.student-list::-webkit-scrollbar {
  display: none; 
}

.list-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #e3f2fd;
  color: #1565c0;
  padding: 16px 24px;
  font-weight: bold;
  font-size: 1.1rem;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.student-item {
  border-bottom: 1px solid #e0e7ef;
  background: #fff;
  font-size: 1.05rem;
  transition: background 0.2s;
  align-items: center;
  padding: 4px 12px;
}
.student-item:hover {
  background: #f0f7ff;
}

.student-info {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  padding: 12px;
  cursor: pointer;
}
.expanded-content {
  padding: 20px;
  transition: all 0.3s ease-in-out;
}

.task-toolbar {
  display: flex;
  height: 3rem;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 15px;
}


.add-experiment {
  width: 20%;
  height: auto;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 4px; 
  background: #5ab5ff29;
  color: #1565c0;
  cursor: pointer;
  transition: background 0.3s;
}

.add-experiment :hover {
  background: #5ab5ffd5;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.experiment-dialog {
    width: 72%;
    height: 95%;
    padding: 2rem;
    background: linear-gradient(145deg, #f8faff, #ffffff);
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    z-index: 2001;
    overflow-y: scroll;
    scrollbar-width: none;
}

.dialog-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.dialog-header h3 {
    padding: 12px 20px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.3s ease;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: #5ab5ff;
  box-shadow: 0 2px 8px rgba(90, 181, 255, 0.2);
}

.progress-bar {
    width: 100%;
    height: 28px;
    margin-top: 12px;
    background: #f0f2f5;
    border-radius: 14px;
    overflow: hidden;
    position: relative;
}

.progress-bar .inner {
    height: 100%;
    background: linear-gradient(90deg, #5ab5ff29, #5ab5fff4);
    transition: width 0.3s ease;
}

.progress-bar .percentage {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color:  #4993cfe7; 
    font-weight: bold;
    font-size: 1rem;
}
.experiment-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px; 
}

.experiment-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.experiment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
}

.difficulty {
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  background: #f0f4ff;
  color: #2d5dff;
}

.difficulty[data-difficulty="basic"] {
  background: #e8f5e9;
  color: #2e7d32;
}
.difficulty[data-difficulty="intermediate"] {
  background: #e3f2fd;
  color: #1565c0;
}
.difficulty[data-difficulty="advanced"] {
  background: #fbe9e7;
  color: #d84315;
}

.experiment-grid{
  height: 100%;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  padding: 1rem 0;
}

.add-experiment-card {
  height: 19rem;
  min-height: 22rem;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #edf2f7;
  transition: all 0.2s ease;
}

.add-experiment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.exp-info {
  min-height: 100px;
}

.exp-info h4 { 
  font-size: 1.2rem;
}

.exp-info img {
  width: 100%;
  height: 12rem;
  margin-top: 1rem;
  border-radius: 8px;
  object-fit: cover;
}

.add-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #5ab5ff, #2d8bff);
  color: white;
  border: none;
  font-size: 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(90, 181, 255, 0.3);
}

.close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 8px 16px;
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #fff;
  color: #5ab5ff;
  border-color: #5ab5ff;
}

.practice-stats-bar {
  margin-top: 18px;
  padding: 12px 0 0 0;
  font-size: 1.08rem;
  color: #1565c0;
  font-weight: 500;
  border-top: 1px dashed #e3f2fd;
  display: flex;
  align-items: center;
  gap: 8px;
}
.practice-rate {
  font-size: 1.15em;
  font-weight: bold;
  color: #ff9800;
}
.practice-detail {
  color: #888;
  font-size: 0.98em;
}
</style>