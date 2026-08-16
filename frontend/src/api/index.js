import axios from 'axios';

// 开发模式：Vite dev server(5173) 直连后端(5550)
// 生产模式：后端同时托管页面与 API，使用同源相对路径（对外只需转发一个端口）
const API_BASE = import.meta.env.DEV ? 'http://localhost:5550/api' : '/api';

// 创建可复用的axios实例
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000, 
});

// AI 接口专用实例：DeepSeek 非流式响应较慢，放宽超时
const aiApi = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 60000,
});

const attachAuth = config => {
    const token = localStorage.getItem('token');
    if (token) { 
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

api.interceptors.request.use(attachAuth);
aiApi.interceptors.request.use(attachAuth);

export function isAnswerEqual(ans1, ans2) {
  const toArr = v => {
    if (v === null || v === undefined) return [];
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.map(Number);
        return [Number(parsed)];
      } catch {
        return [Number(v)];
      }
    }
    if (typeof v === 'number') return [v];
    if (Array.isArray(v)) return v.map(Number);
    return [];
  };
  const arr1 = toArr(ans1).sort();
  const arr2 = toArr(ans2).sort();
  return JSON.stringify(arr1) === JSON.stringify(arr2);
}

export default api;
export { aiApi };