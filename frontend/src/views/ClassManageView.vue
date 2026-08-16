<template>
  <div class="class-manage-view">
    <!-- 班级名称标题 -->
    <div class="class-title-row">
      <h2 v-if="!editingClassName" class="class-title" @dblclick="startEditClassName">{{ className || '未命名班级' }}</h2>
      <input v-else
        v-model="editClassName"
        class="class-title-input"
        @blur="saveClassName"
        @keyup.enter="saveClassName"
        @keyup.esc="cancelEditClassName"
        ref="classNameInput"
      />
      <button class="add-student-btn" @click="showAddDialog = true">＋ 添加学生</button>
    </div>

    <!-- 学生列表 -->
    <div class="student-list">
      <div class="list-header">
        <div>姓名</div>
        <div>学号</div>
        <div>操作</div>
      </div>
      <div v-if="students.length === 0" class="empty-tip">暂无学生</div>
      <div v-for="student in students" :key="student.id" class="student-item">
        <div>{{ student.realname }}</div>
        <div>{{ student.username }}</div>
        <div>
          <button class="remove-btn" @click="removeStudent(student.username)">移出班级</button>
        </div>
      </div>
    </div>

    <!-- 添加学生弹窗 -->
    <div v-if="showAddDialog" class="dialog-overlay">
      <div class="add-dialog">
        <h3>添加学生</h3>
        <input v-model="studentId" placeholder="请输入学号" class="dialog-input" @keyup.enter="addStudent" />
        <div class="dialog-actions">
          <button class="dialog-confirm" @click="addStudent">添加</button>
          <button class="dialog-cancel" @click="closeAddDialog">取消</button>
        </div>
        <div v-if="msg" class="msg">{{ msg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import api from '../api';
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const className = ref('');
const editClassName = ref('');
const editingClassName = ref(false);
const classNameInput = ref(null);
const studentId = ref('');
const students = ref([]);
const msg = ref('');
const showAddDialog = ref(false);

function startEditClassName() {
  editingClassName.value = true;
  editClassName.value = className.value;
  nextTick(() => {
    classNameInput.value && classNameInput.value.focus();
  });
}
function saveClassName() {
  if (!editClassName.value.trim()) {
    showMsg('班级名不能为空');
    return;
  }
  updateClassName(editClassName.value);
  editingClassName.value = false;
}
function cancelEditClassName() {
  editingClassName.value = false;
}

async function fetchCurrentClassName() {
  try {
    const res = await api.get('/class/info');
    className.value = res.data.class?.name || '';
  } catch (e) {
    showMsg('获取班级名失败');
  }
}

async function loadStudents() {
  try {
    const res = await api.get('/class/students');
    students.value = res.data;
  } catch (e) {
    showMsg('加载学生失败');
  }
}

async function updateClassName(newName) {
  if (!newName.trim()) {
    showMsg('班级名不能为空');
    return;
  }
  try {
    await api.put('/class/update-classname', { newClassName: newName });
    user.value.class_name = newName;
    // 若教师还没有班级，更新后重新拉取班级信息以获取 class_id
    const info = await api.get('/class/info');
    if (info.data.class) {
      user.value.class_id = info.data.class.id;
    }
    localStorage.setItem('user', JSON.stringify(user.value));
    className.value = newName;
    showMsg('班级名更新成功');
    loadStudents();
  } catch (e) {
    showMsg(e.response?.data?.error || '更新失败');
  }
}

async function addStudent() {
  if (!studentId.value.trim()) {
    showMsg('请输入学号');
    return;
  }
  try {
    await api.post('/class/add-student', { studentId: studentId.value });
    studentId.value = '';
    await loadStudents();
    showMsg('添加成功');
    closeAddDialog();
  } catch (e) {
    showMsg(e.response?.data?.error || '添加失败');
  }
}

async function removeStudent(username) {
  try {
    await api.delete(`/class/remove-student/${username}`);
    await loadStudents();
    showMsg('移除成功');
  } catch (e) {
    console.log(e.response);
    showMsg(e.response?.data?.error || '移除失败');
  }
}

function closeAddDialog() {
  showAddDialog.value = false;
  studentId.value = '';
  msg.value = '';
}

function showMsg(message) {
  msg.value = message;
  setTimeout(() => {
    msg.value = '';
  }, 2000);
}

onMounted(() => {
  loadStudents();
  fetchCurrentClassName();
});
</script>

<style scoped>
.class-manage-view {
  width: 100%;
  height: 10%;
  padding: 2vw 2vw 2vw 2vw;
  box-sizing: border-box;
  background: none;
  overflow-y: scroll;
  scrollbar-width: none;
}
.class-title-row {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
}
.class-title {
  font-size: 2.2rem;
  font-weight: bold;
  margin: 0;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}
.class-title:hover {
  color: #1565c0;
}
.class-title-input {
  font-size: 2.2rem;
  font-weight: bold;
  border: none;
  border-bottom: 2px solid #5ab5ff;
  outline: none;
  background: transparent;
  width: 320px;
  margin-right: 1rem;
}
.add-student-btn {
  margin-left: auto;
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #5ab5ff, #2d8bff);
  color: #fff;
  cursor: pointer;
  transition: background 0.3s;
}
.add-student-btn:hover {
  background: linear-gradient(135deg, #2d8bff, #5ab5ff);
}
.student-list {
  margin: 0 auto;
  border-radius: 10px;
  overflow: hidden;
  background: #f5f7fa;
  box-shadow: 0 2px 8px rgba(90,181,255,0.08);
}
.list-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  background: #e3f2fd;
  padding: 16px 24px;
  font-weight: bold;
  font-size: 1.1rem;
  color: #1565c0;
}
.student-item {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e7ef;
  background: #fff;
  font-size: 1.05rem;
  transition: background 0.2s;
}
.student-item:last-child {
  border-bottom: none;
}
.student-item:hover {
  background: #f0f7ff;
}
.remove-btn {
  padding: 0.4rem 1.2rem;
  background: #ffebee;
  color: #d84315;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.remove-btn:hover {
  background: #ffcdd2;
}
.empty-tip {
  text-align: center;
  color: #aaa;
  padding: 2rem 0;
  font-size: 1.1rem;
}
.dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.add-dialog {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem 2rem 2rem 2rem;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(90,181,255,0.18);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.add-dialog h3 {
  margin-bottom: 1.5rem;
  color: #1565c0;
  font-size: 1.3rem;
  text-align: center;
}
.dialog-input {
  padding: 0.7rem 1rem;
  font-size: 1.1rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 1.2rem;
  outline: none;
  transition: border 0.2s;
}
.dialog-input:focus {
  border-color: #5ab5ff;
}
.dialog-actions {
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}
.dialog-confirm {
  background: linear-gradient(135deg, #5ab5ff, #2d8bff);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}
.dialog-confirm:hover {
  background: linear-gradient(135deg, #2d8bff, #5ab5ff);
}
.dialog-cancel {
  background: #f5f7fa;
  color: #64748b;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}
.dialog-cancel:hover {
  background: #e3e8ef;
}
.msg {
  color: #d84315;
  margin-top: 1rem;
  text-align: center;
  font-size: 1rem;
}
</style>