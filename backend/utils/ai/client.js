import OpenAI from 'openai';

// DeepSeek 客户端（兼容 OpenAI SDK），全后端共享单一实例
export const aiClient = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const DEFAULT_MODEL = 'deepseek-chat';