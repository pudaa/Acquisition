<template>
  <div class="profile-view">
    <h2>个人信息</h2>
    <form @submit.prevent="handleSave">
      <div class="form-group">
        <label>头像：</label>
        <div class="avatar-upload">
          <img :src="user?.avatar || '/images/default_head.png'" class="avatar-img" />
          <input type="file" accept="image/*" @change="onAvatarChange" />
        </div>
      </div>
      <div class="form-group">
        <label>昵称：</label>
        <input v-model="form.realname" type="text" required />
      </div>
      <div class="form-group">
        <label>学号/工号：</label>
        <input v-model="form.username" type="text" disabled />
      </div>
      <div class="form-group">
        <label>角色：</label>
        <input :value="roleLabel" type="text" disabled />
      </div>
      <div class="form-group">
        <label>班级：</label>
        <input :value="user?.class_id ? (user?.class_name || '未命名班级') : '未加入班级'" type="text" disabled />
      </div>
      <div class="form-group">
        <label>重置密码：</label>
        <input v-model="form.newPassword" type="password" placeholder="请输入新密码" />
      </div>
      <button type="submit" class="save-btn">保存修改</button>
    </form>
    <div v-if="msg" class="msg">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../api';

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const form = reactive({
  realname: user.value?.realname || '',
  username: user.value?.username || '',
  avatar: user.value?.avatar || '',
  newPassword: ''
});
console.log(user.value);
const avatarPreview = ref('');
const msg = ref('');
const roleLabel = computed(() => user.value?.role === 'teacher' ? '教师' : '学生');

const onAvatarChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    avatarPreview.value = ev.target.result;
  };
  reader.readAsDataURL(file);
  form.avatarFile = file;
};

const handleSave = async () => {
  try {
    let avatarUrl = form.avatar;
    if (form.avatarFile) {
      // 上传头像
      const fd = new FormData();
      fd.append('avatar', form.avatarFile);
      const res = await api.post('/auth/upload-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      avatarUrl = res.data.url;
    }
    // 组装请求体
    const payload = {
      realname: form.realname,
      avatar: avatarUrl
    };
    if (form.newPassword && form.newPassword.length >= 6) {
      payload.newPassword = form.newPassword;
    }
    const res = await api.post('/auth/update-profile', payload);
    user.value.realname = form.realname;
    user.value.avatar = avatarUrl;
    localStorage.setItem('user', JSON.stringify(user.value));
    msg.value = '保存成功';
    form.newPassword = '';
    setTimeout(() => msg.value = '', 2000);
  } catch (e) {
    msg.value = '保存失败';
  }
};
</script>

<style scoped>
.profile-view {
  max-width: 120rem;
  margin: 2rem auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px #e3e8f7;
  padding: 2rem 2.5rem;
}
.profile-view h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}
.form-group {
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
}
.form-group label {
  width: 90px;
  color: #305fce;
  font-weight: 500;
}
.form-group input[type="text"],
.form-group input[type="password"] {
  flex: 1;
  padding: 0.5rem 0.8rem;
  border-radius: 5px;
  border: 1px solid #d0d7e4;
  font-size: 1rem;
}
.avatar-upload {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.avatar-upload input[type="file"] {
  padding: 8px 12px;
  /* width: 70%; */
  border: 1px solid #d0d7e4;
  border-radius: 5px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.avatar-upload input[type="file"]:hover {
  border-color: #305fce;
}

.avatar-upload input[type="file"]::file-selector-button {
  background-color: #305fce;
  color: white;
  border: none;
  font-size: 1rem;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.avatar-upload input[type="file"]::file-selector-button:hover {
  background-color: #264ea2;
}
.avatar-img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #d0d7e4;
}
.save-btn {
  width: 100%;
  background: #305fce;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.7rem 0;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 1.2rem;
}
.msg {
  text-align: center;
  color: #305fce;
  margin-top: 1rem;
}
</style>
