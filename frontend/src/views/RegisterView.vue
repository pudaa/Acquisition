<template>
  <div class="register-container">
    <div class="register-img">
      <img 
            src="/images/register.jpg" 
            alt="注册封面"
            loading="lazy"
          />
    </div>
    <div class="register-form">
      <h2>用户注册</h2>
      <div class="register-inputs">
        <form @submit.prevent="handleRegister">
          <input v-model="realname" type="realname" placeholder="姓名">
          <input v-model="username" type="text" placeholder="学号/学号">
          <input v-model="password" type="password" placeholder="密码">
          <input v-model="repassword" type="password" placeholder="确认密码">
          <button type="submit">注册</button>
        </form>
      </div>
      <p>已有账号？<RouterLink to="/login">登录</RouterLink></p>
    </div>
  </div>
</template>

<script setup>
  import { RouterLink } from 'vue-router';
  import { ref } from 'vue';
  import { useRouter } from 'vue-router'; // 添加路由实例
  import api from '../api';

  const router = useRouter();
  const realname = ref(''); 
  const username = ref('');
  const password = ref('');
  const repassword = ref('');
  const handleRegister = async (event) => {
    event.preventDefault();
    if (!username.value || !password.value || !repassword.value || !realname.value) {
      alert('请填写所有字段');
      return;
    }else if (password.value !== repassword.value) {
      alert('请输入相同的密码');
      return;
    }
    
    try {
      const response = await api.post('/auth/register', {
        username: username.value,
        password: password.value,
        realname: realname.value  // 添加姓名参数
      });
  
      if (response.data.success !== 201) {
        throw new Error(response.data.error || '注册失败');
      }
      // alert('注册成功');
      setTimeout(() => {
        router.push('/login');
      }, 100);
    } catch (error) {
      // 显示服务器返回的具体错误信息
      const errorMsg = error.response?.data?.error || error.message;
      alert(errorMsg.replace(/^Error: /, ''));
    }
  };
</script>

<style scoped>
.register-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.register-img{
  flex:1;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.register-img img{
  width: 100%;
  height: 100%;
  object-fit: cover; 
}
.register-form {
  position: relative;
  z-index: 2; /* 表单在上层 */
  background: rgba(234, 242, 255, 0.7); /* 添加半透明背景让文字更清晰 */
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 添加阴影效果 */
}
.register-form h2 {   /* 用户注册 */
  margin-bottom: 1rem;
  font-size: 3rem;
  text-align: center;
  color: #3084ce; 
}
.register-form input {    /* 输入框 */
  border: 1px solid #cccccc8a; /* 边框 */
  border-radius: 5px; /* 圆角 */
  padding: 1rem; /* 内边距 */
  margin-bottom: 1rem; /* 底部外边距 */
  width: 20rem; /* 宽度 */
  height: 3.2rem;
  font-size: 1rem;
}
.register-form button {  /* 注册按钮 */
  margin:auto;
  width: 20rem; /* 宽度 */
  height: 3.5rem; /* 高度 */
  background-color: #106fdc89; /* 背景颜色 */
  color: white; /* 文字颜色 */
  border: none; /* 无边框 */
  border-radius: 5px; /* 圆角 */
  padding: 0.7rem; /* 内边距 */ 
  font-size: 1.5rem;
  align-items: center; /* 垂直居中 */;
}
.register-form button:hover {  /* 注册按钮 */
  background-color: #3084ce; /* 背景颜色 */
  cursor: pointer; /* 鼠标悬停时显示指针 */
}
.register-form button:active {  /* 注册按钮 */
  background-color: #3084ce; /* 背景颜色 */
  transform: scale(0.98); /* 按下时缩小 */
  transition: transform 0.1s; /* 动画效果 */
}
.register-form p {  /* 注册按钮 */
  text-align: left;
  font-size: 1rem; /* 字体大小 */
  margin-top: 0.2rem;
}

</style>
