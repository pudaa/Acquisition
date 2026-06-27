<template>
  <div class="experiment-upload">
    <form @submit.prevent="handleUpload">
      <!-- 实验基本信息 -->
      <div class="section-title">实验基本信息</div>
      <div class="form-group">
        <label>实验标题：</label>
        <input v-model="form.title" required>
      </div>
      <div class="form-group">
        <label>学科：</label>
        <select v-model="form.subject">
          <option>通用技术</option>
        </select>
      </div>
      <div class="form-group">
        <label>难度等级：</label>
        <select v-model="form.difficulty">
          <option>basic</option>
          <option>intermediate</option>
          <option>advanced</option>
        </select>
      </div>
      <div class="form-group">
        <label>预计完成时间（分钟）：</label>
        <input v-model="form.duration" type="number" required>
      </div>

      <div class="section-title">实验介绍</div>
      <div class="form-group">
        <label>实验介绍：</label>
        <textarea v-model="form.introduce" rows="2" required></textarea>
      </div>

      <div class="section-title">操作指导</div>
      <div class="form-group">
        <label>操作指导：</label>
        <textarea v-model="form.guidance" rows="2" required></textarea>
      </div>

      <div class="section-title">实验目标</div>
      <div v-for="(step, idx) in form.steps" :key="idx" class="form-group step-row">
        <label>目标名称：</label>
        <input v-model="step.title" placeholder="如：成功让灯泡发光" required>
        <label>目标标识：</label>
        <input v-model="step.action" placeholder="如：GOAL_BULB_LIT" required>
        <label>权重：</label>
        <input v-model.number="step.weight" type="number" min="1" style="width:60px;">
        <button type="button" class="del-btn" @click="removeStep(idx)">删除</button>
      </div>
      <button type="button" @click="addStep" style="margin-bottom:10px;">添加目标</button>

      <div class="section-title">元件</div>
      <div class="form-group element-group">
        <label>元件选择：</label>
        <div class="element-checkboxes">
          <label v-for="el in elements" :key="el.id" class="element-checkbox">
            <input type="checkbox" :value="el.id" v-model="form.element" />
            {{ el.name }}
          </label>
        </div>
      </div>
      
      <div class="section-title">实验主文件</div>
      <div class="form-group">
        <label>实验封面（图片）：</label>
        <input type="file" ref="coverInput" accept="image/*" @change="handleCoverChange">
      </div>
      <div class="form-group">
        <label>实验主文件（index.html）：</label>
        <input type="file" ref="htmlInput" accept="text/html" required @change="handleHtmlChange">
      </div>
      <div class="form-group">
        <label>其他资源文件（可选）：</label>
        <input type="file" ref="resourceInput" multiple @change="handleResourceChange">
      </div>

      <button type="submit">提交上传</button>
    </form>
  </div>
</template>


<script>
import api from '@/api';

export default {
  data() {
    return {
      form: {
        title: '',
        subject: '通用技术',
        difficulty: 'basic',
        duration: 30,
        coverFile: null,
        htmlFile: null,
        resourceFiles: [],
        introduce: '',
        guidance: '',
        steps: [],
        element: []
      },
      elements: []
    };
  },
  created() {
    this.fetchElements();
  },
  methods: {
    fetchElements() {
      api.get('/experiments/element-list').then(res => {
        this.elements = res.data.data || [];
      });
    },
    addStep() {
      this.form.steps.push({ title: '', action: '', weight: 1 });
    },
    removeStep(idx) {
      this.form.steps.splice(idx, 1);
    },
    handleCoverChange(e) {
      this.form.coverFile = e.target.files[0];
    },
    handleHtmlChange(e) {
      this.form.htmlFile = e.target.files[0];
    },
    handleResourceChange(e) {
      this.form.resourceFiles = Array.from(e.target.files);
    },
    async handleUpload() {
      const formData = new FormData();
      formData.append('title', this.form.title);
      formData.append('subject', this.form.subject);
      formData.append('difficulty', this.form.difficulty);
      formData.append('duration', this.form.duration);
      formData.append('introduce', this.form.introduce);
      formData.append('guidance', this.form.guidance);
      formData.append('steps', JSON.stringify({ steps: this.form.steps }));
      formData.append('element', JSON.stringify(this.form.element));
      formData.append('cover', this.form.coverFile);
      formData.append('htmlFile', this.form.htmlFile);
      this.form.resourceFiles.forEach(file => {
        formData.append('resources', file);
      });

      try {
        const res = await api.post('/experiments/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('实验上传成功！实验编号：' + res.data.expId);
      } catch (error) {
        alert('上传失败：' + error.response?.data?.error || '未知错误');
      }
    }
  }
};
</script>


<style scoped>
.experiment-upload {
  width: 95%;
  max-height:85%;
  margin: auto;
  padding: auto;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  scrollbar-width: none; /* Firefox */
}
.experiment-upload::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
h2 {
  text-align: center;
  font-weight: bold;
  margin-bottom: 24px;
  color: #5ab5ff;
}
.form-group {
  margin: 18px 0;
  display: flex;
  align-items: center;
}
label {
  width: 140px;
  font-weight: 500;
  color: #333;
}
input, select, textarea {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: #f7f9fa;
  margin-left: 10px;
}
button {
  padding: 10px 20px;
  background: #5ab5ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  margin-top: 24px;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover {
  background: #008bb0;
}
.section-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 24px 0 8px 0;
  border-left: 4px solid #5ab5ff;
  padding-left: 8px;
  color: #5ab5ff;
}
.step-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.step-row label {
  min-width: 80px;
  margin-left: 0;
  margin-right: 4px;
  text-align: right;
}

.step-row input {
  min-width: 120px;
  flex: 1 1 120px;
  margin-left: 0;
  margin-right: 8px;
}

.del-btn {
  width: 70px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #e74c3c;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  margin-left: 8px;
  margin-top: 0;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .step-row {
    flex-direction: column;
    align-items: stretch;
  }
  .step-row label,
  .step-row input,
  .del-btn {
    width: 100%;
    min-width: 0;
    margin-right: 0;
    margin-left: 0;
  }
}
.element-group {
  align-items: flex-start;
}
.element-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.element-checkbox {
  align-items: center;
  font-size: 14px;
  background: #f7f9fa;
  border-radius: 4px;
  padding: 2px 8px;
}
</style>
