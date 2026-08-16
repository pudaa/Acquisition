import express from 'express';
import auth from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import {
  buildCircuitAssistantPrompt,
  buildGeneralAssistantPrompt,
  buildBehaviorAnalysisPrompt,
} from '../utils/ai/prompts.js';
import { chatWithAI, sanitizeHistory, validateQuestion, classifyAIError } from '../utils/ai/chat.js';

const router = express.Router();

// AI 接口限流：每 IP 每分钟最多 20 次（防止额度滥用）
const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'ai' });

// 电路数据净化：限制数组长度与整体大小，防止超大负载打爆提示词
const MAX_COMPONENTS = 200;
const MAX_NODES = 500;
const MAX_EDGES = 500;

function sanitizeCircuitData(circuitData) {
  if (!circuitData || typeof circuitData !== 'object') return null;
  const result = {};
  if (Array.isArray(circuitData.components)) result.components = circuitData.components.slice(0, MAX_COMPONENTS);
  if (Array.isArray(circuitData.nodes)) result.nodes = circuitData.nodes.slice(0, MAX_NODES);
  if (Array.isArray(circuitData.edges)) result.edges = circuitData.edges.slice(0, MAX_EDGES);
  return result;
}

// ---------- 通用 AI 助手（平台级聊天，不接收电路数据） ----------
router.post('/chat', auth, aiLimiter, async (req, res) => {
  try {
    const { question, history } = req.body;
    const checked = validateQuestion(question);
    if (checked.error) return res.status(400).json({ error: checked.error });

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: 'AI 服务未配置（DEEPSEEK_API_KEY 未设置）' });
    }

    const answer = await chatWithAI({
      systemPrompt: buildGeneralAssistantPrompt(),
      question: checked.question,
      history,
    });

    res.json({ answer });
  } catch (error) {
    console.error('[AI] 通用对话失败:', error.message);
    res.status(500).json({ error: classifyAIError(error) });
  }
});

// ---------- 实验内 AI 助手（携带电路图上下文，供实验场景使用） ----------
router.post('/experiment-chat', auth, aiLimiter, async (req, res) => {
  try {
    const { question, expTitle, circuitData, history } = req.body;
    const checked = validateQuestion(question);
    if (checked.error) return res.status(400).json({ error: checked.error });

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: 'AI 服务未配置（DEEPSEEK_API_KEY 未设置）' });
    }

    const answer = await chatWithAI({
      systemPrompt: buildCircuitAssistantPrompt(
        typeof expTitle === 'string' ? expTitle.slice(0, 100) : '',
        sanitizeCircuitData(circuitData)
      ),
      question: checked.question,
      history,
    });

    res.json({ answer });
  } catch (error) {
    console.error('[AI] 实验对话失败:', error.message);
    res.status(500).json({ error: classifyAIError(error) });
  }
});

// ---------- 实验行为数据分析（实验报告/心得场景） ----------
router.post('/behavior-analysis', auth, aiLimiter, async (req, res) => {
  try {
    const { question, history } = req.body;
    const checked = validateQuestion(question);
    if (checked.error) return res.status(400).json({ error: checked.error });

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: 'AI 服务未配置（DEEPSEEK_API_KEY 未设置）' });
    }

    const answer = await chatWithAI({
      systemPrompt: buildBehaviorAnalysisPrompt(),
      question: checked.question,
      history,
      maxTokens: 1536,
      temperature: 0.5,
    });

    res.json({ answer });
  } catch (error) {
    console.error('[AI] 行为分析失败:', error.message);
    res.status(500).json({ error: classifyAIError(error) });
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