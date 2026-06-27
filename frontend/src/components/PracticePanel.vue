<template>
  <div class="practice-panel" v-if="showPractice">
    <div class="practice-header">
      <h3>实验练习 ({{ currentQuestion }}/10)</h3>
      <div class="practice-actions">
        <span class="progress-info">
          掌握度: {{ Math.round(masteryScore) }}%
          当前得分: {{ totalScore }}
        </span>
        <button class="cancel-btn" @click="confirmCancel" v-if="!completed">X</button>
      </div>
    </div> 

    <div class="question-card" v-if="currentQuestion <= 10 && question && !completed">
      <h4>{{ question.title }}</h4>
      <div class="options">
        <template v-if="question.type === 'single'">
          <label v-for="(option, index) in question.options" :key="index">
            <input type="radio" v-model="userAnswer" :value="index">
            {{ option }}
          </label>
        </template>
        <template v-else>
          <label v-for="(option, index) in question.options" :key="index">
            <input type="checkbox" v-model="userAnswers" :value="index">
            {{ option }}
          </label>
        </template>
      </div>
      <button @click="submitAnswer" :disabled="!isAnswerValid">提交答案</button>
    </div>

    <div v-else-if="loading" class="loading">
      正在加载题目...
    </div>

    <div v-if="completed" class="practice-result">
      <h3>练习完成!</h3>
      <div class="result-details">
        <p>最终得分: {{ totalScore }}</p>
        <p>掌握度: {{ Math.round(masteryScore) }}%</p>
        <p>完成时间: {{ new Date().toLocaleString() }}</p>
      </div>
      <button @click="$emit('close')">返回实验</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';

const props = defineProps(['expId']);
const emit = defineEmits(['close']);

const showPractice = ref(true);
const currentQuestion = ref(1);
const question = ref(null);
const loading = ref(true);
const userAnswer = ref(null);
const userAnswers = ref([]);
const masteryScore = ref(50); // 初始掌握度50%
const totalScore = ref(0);
const completed = ref(false);
const answeredQuestions = ref([]); // 记录已答题目ID

const isAnswerValid = computed(() => {
  if (!question.value) return false;
  return question.value.type === 'single' 
    ? userAnswer.value !== null 
    : userAnswers.value.length > 0;
});

const confirmCancel = () => {
  if (confirm('确定要取消练习吗？当前进度将不会保存。')) {
    emit('close');
  }
};
// 获取下一题
const fetchNextQuestion = async () => {
  try {
    loading.value = true;
    const res = await api.post('/practice/next-question', {
      expId: props.expId,
      masteryScore: masteryScore.value,
      answeredQuestions: answeredQuestions.value
    });
    
    if (res.data.question) {
      // 检查是否是重复题目
      if (answeredQuestions.value.includes(res.data.question.id)) {
        console.warn('检测到重复题目，重新获取');
        await fetchNextQuestion();
        return;
      }
      
      question.value = res.data.question;
      userAnswer.value = null;
      userAnswers.value = [];
    } else {
      // 如果没有更多题目，完成练习
      if (currentQuestion.value > 0) {
        await finishPractice();
      }
      completed.value = true;
    }
  } catch (e) {
    console.error('获取题目失败:', e);
    if (e.response?.status === 404) {
      // 没有更多题目可用
      if (currentQuestion.value > 0) {
        await finishPractice();
      }
      completed.value = true;
    }
  } finally {
    loading.value = false;
  }
};

// 提交答案
const submitAnswer = async () => {
  if (!isAnswerValid.value) return;
  
  try {
    const answer = question.value.type === 'single' 
      ? [userAnswer.value] 
      : userAnswers.value;
    const res = await api.post('/practice/submit-answer', {
      questionId: question.value.id,
      answer,
      masteryScore: masteryScore.value,
      expId: props.expId
    });
    
    // 更新分数和掌握度
    masteryScore.value = res.data.newMasteryScore;
    totalScore.value += res.data.score;
    
    // 记录已答题目
    answeredQuestions.value.push(question.value.id);
    
    // 判断是否完成练习
    if (currentQuestion.value >= 10) {
      await finishPractice();
    } else {
      currentQuestion.value++;
      await fetchNextQuestion();
    }
  } catch (e) {
    console.error('提交答案失败:', e);
  }
};
// 添加完成练习的方法
const finishPractice = async () => {
  try {
    await api.post('/practice/complete', {
      expId: props.expId,
      totalScore: totalScore.value,
      masteryScore: masteryScore.value
    });
    completed.value = true;
  } catch (e) {
    console.error('保存练习结果失败:', e);
  }
};
const closePractice = () => {
  emit('close');
};

// 初始化
onMounted(() => {
  fetchNextQuestion();
});
</script>
<style scoped>
.practice-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.practice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.practice-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cancel-btn {
  background: #1976d2;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 10rem;
  cursor: pointer;
  font-size: 0.9em;
}

.cancel-btn:hover {
  background: #ff6666;
}
.question-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.options label {
  display: block;
  margin: 10px 0;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

button {
  background: #1976d2;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result-details {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.result-details p {
  margin: 10px 0;
  font-size: 1.1em;
}
</style>