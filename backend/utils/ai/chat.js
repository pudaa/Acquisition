import { aiClient, DEFAULT_MODEL } from './client.js';

export const MAX_HISTORY = 10;          // 最多携带的历史消息数
export const MAX_QUESTION_LENGTH = 1000; // 单条问题最大长度
export const MAX_CONTENT_LENGTH = 4000;  // 历史消息单条最大长度

// 历史消息净化：仅保留 user/assistant 角色（防止客户端注入 system 提示词）
export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-MAX_HISTORY)
    .map(m => ({
      role: m.role,
      content: String(m.content ?? '').slice(0, MAX_CONTENT_LENGTH),
    }))
    .filter(m => m.content.trim().length > 0);
}

// 问题校验：返回 { question } 或 { error }
export function validateQuestion(question) {
  if (typeof question !== 'string' || !question.trim()) {
    return { error: '问题不能为空' };
  }
  const q = question.trim();
  if (q.length > MAX_QUESTION_LENGTH) {
    return { error: `问题过长（最多 ${MAX_QUESTION_LENGTH} 字）` };
  }
  return { question: q };
}

// 统一对话入口：组装消息并调用模型
export async function chatWithAI({ systemPrompt, question, history = [], maxTokens = 2048, temperature = 0.7 }) {
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const msg of sanitizeHistory(history)) messages.push(msg);
  messages.push({ role: 'user', content: question });

  const completion = await aiClient.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  });

  return completion.choices[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';
}

// 错误分类（对外只暴露友好信息，不泄漏内部细节）
export function classifyAIError(error) {
  if (error?.status === 401) return 'AI 服务认证失败，请稍后重试';
  if (error?.status === 429) return 'AI 服务请求过于频繁，请稍后重试';
  if (error?.status === 402) return 'AI 服务额度不足，请联系管理员';
  return 'AI 服务请求失败，请稍后重试';
}