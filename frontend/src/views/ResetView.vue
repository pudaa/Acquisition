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
      <h2>临时密码</h2>
      <div class="register-inputs">
        <form @submit.prevent="handleRetrievePassword"> 
          <input v-model="realname" type="text" placeholder="姓名">
          <input v-model="studentId" type="text" placeholder="学号">
          <slide-verify
            @success="isVerified = true"
            slider-text="向右滑动"
            class="slide-verify"
          ></slide-verify>
          <button type="submit">查询</button> 
        </form>
      </div>
      <p>找到密码？<RouterLink to="/login">登录</RouterLink></p>
    </div>
  </div>
</template>

<script setup>
  import { RouterLink } from 'vue-router';
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import SlideVerify from 'vue3-slide-verify';
  import 'vue3-slide-verify/dist/style.css';
  import api from '../api';


  const router = useRouter();
  const studentId = ref('');  // 修改为学号
  const realname = ref('');      // 修改为姓名
  const isVerified = ref(false);

  const handleRetrievePassword = async (event) => {  // 修改函数名
    event.preventDefault();
    if (!isVerified.value) {
      alert('请完成人机验证');
      return;
    }
    if (!studentId.value || !realname.value) {
      alert('请填写所有字段');
      return;
    }
    
    try {
      const { data } = await api.post('/auth/retrieve-password', {  // 修改接口路径
        studentId: studentId.value,
        realname: realname.value
      });
      if (data.error) {
        throw new Error(data.error || '密码找回失败');
      }

      alert(`已重置新密码，请及时修改：${data.password}`);
    } catch (error) {
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
  padding: 2rem 5rem 2rem 5rem; /* 内边距 */
  border-radius: 15px;
  max-width: 30rem;
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
.register-inputs{
  width: 20rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.slide-verify{
  height: 14rem; 
  /* 居中 */
  margin: auto;
  margin-bottom: 0.8rem;
}

/* 滑块轨道样式 */
.slide-verify :deep(.slide-verify-slider) {
  background: #c2dcee95;
  border-radius: 8px;
}

/* 滑块按钮样式 */
.slide-verify :deep(.slide-verify-slider-button) {
  background: #3084ce;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 提示文字样式 */
.slide-verify :deep(.slide-verify-slider-text) {
  font-size: 1rem;
  color: #3084ce;
}

</style>
