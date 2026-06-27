<template>
  <div id="app">
    <h1>Virtual Circuit Lab Quiz</h1>
    <button @click="getNextQuestion">Get Next Question</button>
    <div v-if="currentQuestion">
      <h2>{{ currentQuestion.question_text }}</h2>
      <div v-for="option in currentQuestion.options.split(',')" :key="option">
        <label>
          <input type="radio" :name="currentQuestion.id" :value="option" v-model="currentAnswer">
          {{ option }}
        </label>
      </div>
      <button @click="submitAnswer">Submit Answer</button>
    </div>
    <div v-if="analysis">
      <h2>Quiz Analysis</h2>
      <div v-for="(result, objective) in analysis" :key="objective">
        <h3>{{ objective }}</h3>
        <p>Correct: {{ result.correct }}</p>
        <p>Total: {{ result.total }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      currentQuestion: null,
      currentAnswer: null,
      previousAnswers: [],
      analysis: null
    };
  },
  methods: {
    async getNextQuestion() {
      const response = await axios.post('http://localhost:3000/getNextQuestion', {
        studentId: 'student1',
        previousAnswers: this.previousAnswers
      });
      this.currentQuestion = response.data;
    },
    async submitAnswer() {
      if (!this.currentAnswer) {
        alert('Please select an answer');
        return;
      }

      this.previousAnswers.push({
        questionId: this.currentQuestion.id,
        selectedOption: this.currentAnswer
      });

      this.currentAnswer = null;
      this.currentQuestion = null;

      const response = await axios.post('http://localhost:3000/getNextQuestion', {
        studentId: 'student1',
        previousAnswers: this.previousAnswers
      });
      if (response.status === 404) {
        this.analysis = await this.submitQuiz();
      } else {
        this.currentQuestion = response.data;
      }
    },
    async submitQuiz() {
      const response = await axios.post('http://localhost:3000/submitQuiz', {
        studentId: 'student1',
        answers: this.previousAnswers
      });
      return response.data;
    }
  }
};
</script>