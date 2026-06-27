<template>
  <div class="login-container">
    <div class="login-img">
      <img 
            src="/images/login.jpg" 
            alt="登录封面"
            loading="lazy"
          />
    </div>
    <div class="login-form">
      <h2>LOGIN</h2>
      <div class="login-inputs">
        <p>学&nbsp&nbsp&nbsp号：</p>
          <input v-model="username" placeholder="请输入学号" type="text">
      </div>  
      <div class="login-inputs">  
        <p>密&nbsp&nbsp&nbsp码：</p>
        <input v-model="password" placeholder="请输入密码" type="password">
      </div>
      <button @click="handleLogin">登录</button>
      <div class="to-register">
        <p>没有账号？<RouterLink to="/register">注册</RouterLink></p>
        <p><RouterLink to="/reset">忘记密码？</RouterLink></p>
      </div>
      <div class="instructions">
        <div class="title">
          使 . 用 . 须 . 知
        </div>
        <div class="main-body">
          <div>
              1.
          </div>
          <div>致知虚拟实验平台提供了面向通用技术电路实验的在线仿真环境，为师生提供安全、便捷的电路设计与分析工具。本平台为通用技术实验专用，支持电路设计、仿真与数据分析功能。</div>

        </div>
        <div class="main-body">
            <div>
                2.
            </div>
            <div>
              请使用 Chrome/Firefox/Edge 等主流浏览器，确保网络稳定；实验过程中请勿频繁刷新页面或强制关闭平台，以免数据丢失；严禁上传外部脚本或攻击性代码，违规操作将导致账号停用并追责。
            </div>
        </div>

      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  if (isLoading.value) return;
  
  isLoading.value = true;
  try {
    const response = await api.post('/auth/login', {
      username: username.value,
      password: password.value
    });
    
    // 确保响应包含token字段
    if (!response.data.token) {
      throw new Error('登录响应缺少Token');
    }
    // console.log(response.data.user);
    username.value = ''; 
    password.value = ''; 
    // 存储token和用户信息
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // alert('登录成功');

    router.push('/');
    
  } catch (error) {
    // 统一错误处理
    const errorMsg = error.response?.data?.error || error.message;
    error.value = errorMsg.replace(/^Error: /, '');
    alert(errorMsg.replace(/^Error: /, ''));
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  height: 100vh; 
}
.login-img{
  flex:1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.login-img img{
  width: 100%;
  height: 100%;
  object-fit: cover; 
}
.login-form {
  max-width: 32rem;
  max-height: 30rem;
  padding: 20rem 2rem 0rem 2rem;/* 内边距按照顺序：上、右、下、左 */
  gap: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.login-form h2 {
  margin-bottom: 0.1rem;
  font-size: 3.7rem;
  text-align: center;
  color: #305fce; 
}
.login-inputs{ 
  margin:auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.login-inputs p{ 
  margin-right: 0.2rem;
  font-size: 1.4rem;
  color: #305fce; 
}
.login-form input { 
  border: 1px solid #cccccc8a; 
  border-radius: 5px;
  padding: 1rem; 
  margin-bottom: 0.4rem; 
  width: 20rem;
  height: 3.2rem;
  font-size: 1rem;
}

.login-form button {
  margin:auto;
  width: 26rem;
  height: 3.5rem; 
  background-color: #96bef789; 
  color: white; 
  border: none; 
  border-radius: 5px; 
  padding: 0.7rem; 
  font-size: 1.5rem;
  align-items: center;
}
.login-form button:hover { 
  background-color: #305fce;
  cursor: pointer; 
}
.login-form button:active { 
  background-color: #305fce;
  transform: scale(0.98);
  transition: transform 0.1s;
}
.to-register{ 
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 26rem;
  margin: auto;
}
.to-register p{ 
  font-size: 0.9rem;
}
.instructions {
  text-align: left;
  background: #FAFAFA;
  padding: 1rem;
  margin-top: 0.5rem;
  margin-left: 1rem;
  width:26rem;
  border-radius: 1rem;
}
.instructions .title {
    position: relative;
    text-align: center;
    font-size: 1rem;
    font-weight: 400;
    line-height: 0.24rem;
    color: #595959;
    margin-bottom: 0.08rem;
    margin-top: 0.5rem;
}
.instructions .title::before {
    content: "";
    position: absolute;
    left: 0.24rem;
    top: 0.12rem;
    width: 8rem;
    height: 0.01rem;
    background: #D9D9D9;
}
.instructions .title::after {
    content: "";
    position: absolute;
    right: 0.24rem;
    top: 0.12rem;
    width: 7rem;
    height: 0.01rem;
    background: #D9D9D9;
}
.main-body {
    font-size: 1rem;
    font-weight: 400;
    color: #595959;
    display: flex;
    align-items: flex-start;
    margin-top: 1rem;
}
.error {
  color: #ff4444;
  margin-top: 1rem;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>