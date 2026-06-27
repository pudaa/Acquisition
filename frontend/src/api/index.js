import axios from 'axios';

// 创建可复用的axios实例
const api = axios.create({
    baseURL: 'http://localhost:5550/api',// http://localhost:5550/api
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000, 
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) { 
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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