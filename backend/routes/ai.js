import express from 'express';
import OpenAI from 'openai';
import auth from '../middleware/auth.js';

const router = express.Router();

// DeepSeek 客户端（兼容 OpenAI SDK）
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// 组装系统 Prompt
function buildSystemPrompt(expTitle, circuitData) {
  let circuitContext = '';
  if (circuitData) {
    const { nodes, edges, compIdMap, nodeKeyMap } = circuitData;
    circuitContext = [
      `【实验名称】：${expTitle || '电路实验'}`,
      nodes && nodes.length ? `【电气节点位置】：${JSON.stringify(nodes)}` : '',
      edges && edges.length ? `【元件连接关系】：${JSON.stringify(edges)}` : '',
      compIdMap ? `【节点连通域】：${JSON.stringify(compIdMap)}` : '',
      nodeKeyMap ? `【引脚节点映射】：${JSON.stringify(nodeKeyMap)}` : '',
    ].filter(Boolean).join('\n');
  }

  return `你是一个电路实验智能助手，帮助中学生理解电路知识和完成实验。

${circuitContext ? `下面是本次实验的结构化背景信息，请结合这些信息理解用户的问题：\n${circuitContext}\n` : ''}
请根据上述信息，结合用户的具体问题，给出面向学生的电路知识讲解。回答应以科普和教学为主，例如解释元件的作用、原理、在本电路中的应用位置和功能等。

注意事项：
- 不要涉及任何虚拟实验代码或实现细节
- 不要直接复述原始结构化数据内容（如 JSON 对象、编号等）
- 用通俗易懂的语言进行解释和说明
- 回答简洁清晰，适合中学生理解`;
}

// 对话接口
router.post('/chat', auth, async (req, res) => {
  try {
    const { question, circuitData, expTitle, history } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    // 检查 API Key 是否配置
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({
        error: 'AI 服务未配置（DEEPSEEK_API_KEY 未设置）',
      });
    }

    // 组装消息列表
    const messages = [
      { role: 'system', content: buildSystemPrompt(expTitle, circuitData) },
    ];

    // 添加历史消息（最多保留最近 10 条）
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // 添加当前问题
    messages.push({ role: 'user', content: question });

    console.log(`[AI] 发送请求到 DeepSeek，消息数: ${messages.length}`);

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: false,
    });

    const answer = completion.choices[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';

    console.log(`[AI] 收到回复，长度: ${answer.length} 字符`);

    res.json({ answer });

  } catch (error) {
    console.error('[AI] 请求失败:', error.message);

    // 区分错误类型
    if (error.status === 401) {
      return res.status(500).json({ error: 'AI 服务认证失败，请检查 API Key 配置' });
    }
    if (error.status === 429) {
      return res.status(500).json({ error: 'AI 服务请求过于频繁，请稍后重试' });
    }

    res.status(500).json({ error: 'AI 服务请求失败，请稍后重试' });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    configured: !!process.env.DEEPSEEK_API_KEY,
  });
});

export default router;
