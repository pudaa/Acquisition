# AI 架构升级方案

## 一、现状分析

### 当前架构

```
浏览器端 (AIChatWindow.vue)
  └─ coze-api.js (前端类)
       ├─ 硬编码 API Key: pat_ChDsIE...
       ├─ 硬编码 Bot ID: 7531258...
       ├─ 直接调用 https://api.coze.cn/v3/chat
       └─ 轮询模式等待结果
```

### 安全问题

```
API Key 明文暴露在浏览器中
任何用户通过 DevTools Network 面板即可截获
```

### 架构问题

1. 前端直接调用第三方 API，Key 无法保护
2. Prompt 组装在前端，电路结构数据序列化后明文传输
3. 无法做上下文管理、历史记录、权限控制
4. 轮询模式低效，无流式输出
5. 绑定 Coze 平台，切换模型需改前端代码

---

## 二、目标架构

### 第一阶段（本次执行）

```
浏览器端 (AIChatWindow.vue)
  └─ POST /api/ai/chat  ←── 后端代理路由
       ├─ 接收: { question, circuitData, history }
       ├─ 组装 Prompt
       ├─ 调用 DeepSeek API (OpenAI 兼容接口)
       ├─ 返回 SSE 流式 / 完整响应
       └─ 环境变量 DEEPSEEK_API_KEY (不在前端暴露)
```

### 第二阶段（后续扩展）

```
后端 AI 模块
  ├─ /api/ai/chat               对话接口
  ├─ /api/ai/session            会话管理
  ├─ LangChain Pipeline
  │    ├─ Vector Store (ChromaDB)
  │    ├─ Embedding (本地模型)
  │    └─ LLM (DeepSeek / Ollama)
  └─ 电路知识库 RAG 检索
```

---

## 三、接口设计

### POST /api/ai/chat

请求：

```json
{
  "question": "这个电路怎么让灯泡发光？",
  "circuitData": {
    "nodes": [[0,0], [100,0]],
    "edges": [{"from": 0, "to": 1, "component": "battery"}],
    "compIdMap": {"0": 1},
    "nodeKeyMap": {"battery_0": 0}
  },
  "expTitle": "与门搭建实验",
  "history": [
    {"role": "user", "content": "什么是与门"},
    {"role": "assistant", "content": "与门是..."}
  ]
}
```

响应（流式 SSE）：

```
data: {"type": "chunk", "content": "要让"}
data: {"type": "chunk", "content": "灯泡发光"}
data: {"type": "done", "content": ""}
```

或非流式：

```json
{
  "answer": "要让灯泡发光，你需要..."
}
```

### POST /api/ai/session (第二阶段)

```json
{
  "action": "create" | "list" | "delete",
  "sessionId": "uuid"
}
```

---

## 四、后端实现

### 4.1 技术选型

- DeepSeek API（兼容 OpenAI SDK）
- `openai` npm 包（设置 `baseURL: https://api.deepseek.com`）
- SSE 流式响应
- .env 配置 `DEEPSEEK_API_KEY`

### 4.2 依赖

```sh
npm install openai
```

### 4.3 路由设计

`backend/routes/ai.js`：

```
POST /api/ai/chat  →  接收问题 + 电路数据 → 组装 Prompt → 调用 DeepSeek → 返回流式响应
```

### 4.4 Prompt 模板

后端组装，包含三部分：

1. **系统角色**：电路实验智能助手
2. **电路上下文**：实验名称、节点数据、连接关系（结构化转自然语言）
3. **用户问题**

---

## 五、前端改造

### 5.1 AIChatWindow.vue

改动点：

1. 删除 `coze-api.js` 的 import 和调用
2. 改为调用 `api.post('/ai/chat', {...})`
3. 适配 SSE 流式输出（`EventSource` 或 `fetch + ReadableStream`）
4. 保留现有 UI 和交互逻辑

### 5.2 组件 Props

保持不变（`modelValue`, `expId`, `iframeData`, `screenshotUrl`）

---

## 六、安全改进

| 当前 | 改造后 |
|---|---|
| API Key 在前端明文 | API Key 在后端 .env |
| 请求直接到第三方 | 请求经后端代理 |
| 无鉴权 | 复用 JWT auth 中间件 |
| 无日志 | 后端可记录请求日志 |

---

## 七、实施步骤

### Step 1: 后端路由 + DeepSeek 调用
- 安装 `openai` 依赖
- 创建 `backend/routes/ai.js`
- 实现 `POST /api/ai/chat`
- 添加到 `app.js`

### Step 2: 前端改造
- `AIChatWindow.vue` 改为调用后端 API
- 适配非流式响应（本次先做非流式，二期加 SSE）
- 保留发送电路数据的逻辑

### Step 3: 清理
- 移除 `coze-api.js` 中硬编码的 Key
- 或直接废弃 `coze-api.js`

### Step 4: 验证
- 启动前后端
- 在实验学习中打开 AI 助手发送消息
- 确认回复正常
