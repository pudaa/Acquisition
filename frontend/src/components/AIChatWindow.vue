<template>
  <div 
    v-if="modelValue"
    class="chat-window"
    :style="{ 
      width: '360px',
      height: '720px',
      transform: `translate(${position.x}px, ${position.y}px)`
    }"
  >
    <div class="chat-header" @mousedown="startDrag">
      <span>AI 实验助手</span>
      <button @click="close">×</button>
    </div>
    
    <div class="chat-messages">
      <div 
        v-for="(msg, index) in chatHistory"
        :key="index"
        :class="['message', msg.role]"
      >
      <div v-html="renderMarkdown(msg.content)"></div>
      </div>
    </div>
    <div v-if="isLoading" class="message assistant">
        <div class="typing-indicator">
        <span></span><span></span><span></span>
        </div>
    </div>
    <div class="chat-input">
      <textarea
        v-model="message"
        placeholder="输入实验问题..."
        @keydown.enter.prevent="handleEnter"
      ></textarea>
      <button @click="sendMessage">发送</button>
    </div>
</div>
</template>
    
<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '@/api';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const isDragging = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });
const isLoading = ref(false);



const startDrag = (e) => {
  isDragging.value = true;
  dragStartPos.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e) => {
  if (!isDragging.value) return;
  position.value = {
    x: e.clientX - dragStartPos.value.x,
    y: e.clientY - dragStartPos.value.y
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const props = defineProps({
  modelValue: Boolean,
  expId: {
    type: [String, Number],
    required: true
  },
  iframeData: {
    type: Object,
    default: null
  },
  screenshotUrl: {
    type: String,
    default: null
  }
});


// 每次AI助手窗口打开时都上传截图
// let cozeFileId = null; // 全局存储coze文件id
// async function uploadScreenshot(val) {
//   if (val) {
//     // 移除data:image/png;base64,前缀
//     const base64 = val.replace(/^data:image\/\w+;base64,/, '');
//     console.log('AI助手收到截图纯base64:', base64);
//     // 封装FormData，模拟文件上传
//     const formData = new FormData();
//     // 将base64转为Blob
//     function base64ToBlob(base64Data, contentType = 'image/png') {
//       const byteCharacters = atob(base64Data);
//       const byteNumbers = new Array(byteCharacters.length);
//       for (let i = 0; i < byteCharacters.length; i++) {
//         byteNumbers[i] = byteCharacters.charCodeAt(i);
//       }
//       const byteArray = new Uint8Array(byteNumbers);
//       return new Blob([byteArray], { type: contentType });
//     }
//     const blob = base64ToBlob(base64);
//     formData.append('file', blob, 'screenshot.png');
//     try {
//       const resp = await fetch('https://api.coze.cn/v1/files/upload', {
//         method: 'POST',
//         headers: {
//           'Authorization': 'Bearer ' + ACCESS_TOKEN
//         },
//         body: formData
//       });
//       const result = await resp.json();
//       console.log('coze平台上传返回:', result);
//       if (result && result.code === 0 && result.data && result.data.id) {
//         cozeFileId = result.data.id;
//         console.log('coze平台文件id:', cozeFileId);
//       }
//     } catch (e) {
//       console.error('coze平台上传失败:', e);
//     }
//   }
// }


// 监听AI助手窗口的打开，每次打开都上传截图
/*
watch(() => props.modelValue, async (val) => {
  if (val) {
    await nextTick();
    uploadScreenshot(props.screenshotUrl);
  }
});
*/



let title = "实验标题";
onMounted(async () => {
  // 获取实验信息
  if (!props.expId) return;
  const { data } = await api.get(`/experiments/${props.expId}/info`);
  title = data.data.title;
});

let compIdMap = new Map();
let nodeKeyMap = new Map();
let edges = new Array();
let nodes = new Array();

// 监听iframeData变化（如有需要可处理）
watch(() => props.iframeData, (newVal) => {
  if (newVal) {
    //console.log('收到iframeData:', newVal);
    nodeKeyMap = newVal.nodeKeyMap;
    compIdMap = newVal.compIdMap;
    edges = newVal.edges || [];
    nodes = newVal.nodes || [];
  }
});

const emit = defineEmits(['update:modelValue']);

const position = ref({ x: 20, y: 20 });
const message = ref('');
const chatHistory = ref([]);

const close = () => {
  emit('update:modelValue', false);
};

const handleEnter = (e) => {
    if (!e.shiftKey) {
      sendMessage();
    } else {
      message.value += '\n';
    }
  };
  
const sendMessage = async () => {
  if (!message.value.trim()) return;
  const userMessage = message.value.trim();
  chatHistory.value.push({ role: 'user', content: userMessage });

  // 准备电路结构数据（作为结构化 JSON 发给后端，由后端组装 Prompt）
  const compIdMapObj = (compIdMap instanceof Map) ? Object.fromEntries(compIdMap) : compIdMap;
  const nodeKeyMapObj = (nodeKeyMap instanceof Map) ? Object.fromEntries(nodeKeyMap) : nodeKeyMap;

  message.value = '';
  isLoading.value = true;

  try {
    const { data } = await api.post('/ai/chat', {
      question: userMessage,
      expTitle: title,
      circuitData: {
        nodes,
        edges,
        compIdMap: compIdMapObj,
        nodeKeyMap: nodeKeyMapObj,
      },
      history: chatHistory.value.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    if (data.error) {
      chatHistory.value.push({
        role: 'assistant',
        content: `请求失败：${data.error}`,
      });
      return;
    }

    chatHistory.value.push({
      role: 'assistant',
      content: data.answer,
    });

  } catch (error) {
    chatHistory.value.push({
      role: 'assistant',
      content: error.response?.data?.error || '网络请求异常，请稍后重试',
    });
  } finally {
    isLoading.value = false;
  }
};

const renderMarkdown = (raw) => {
  const html = marked(raw);
  return DOMPurify.sanitize(html);
};

</script>

<style scoped>
.chat-window {
  display: flex;
  z-index: 9999; 
  flex-direction: column;
  position: fixed;
  right: 20px;
  bottom: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  overflow: hidden;
}

.chat-header {
  padding: 12px 16px;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
  border-bottom: 1px solid #eee;
}

.chat-header button{
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    border-radius: 50%;
    color: white;
    background: #5ab5ff;
    border: none;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  max-height: calc(720px - 120px);
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar { display: none; } 
}

.chat-input {
  border-top: 1px solid #eee;
  padding: 12px;
  display: flex;
  gap: 8px;
  
    textarea {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    resize: none;
    min-height: 40px;

    &:focus {
      outline: none;
      border-color: #5ab5ff;
    }
  }
  
  button {
    padding: 8px 16px;
    background: #5ab5ff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: #2d8bff;
    }
  }
}

.message {
  margin: 8px 0;
  padding: 10px 16px;
  border-radius: 12px;
  max-width: 80%;
  line-height: 1.5;
  
  &.user {
    background: #5ab5ff;
    color: white;
    margin-left: auto;
  }
  
  &.assistant {
    background: #f1f3f4;
    margin-right: auto;
  }

  &.assistant p {
    padding: 10px;
  }
}

.typing-indicator span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 3px;
  background: #ddd;
  border-radius: 50%;
  animation: typing 1s infinite ease-in-out;
}

@keyframes typing {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

.message :deep(h1) { font-size: 1.6em; margin: 0.5em 0; }
.message :deep(h2) { font-size: 1.4em; margin: 0.4em 0; }
.message :deep(ul) { padding-left: 1.5em; }
.message :deep(li) { margin: 0.3em 0;}
.message :deep(code) { background: #f5f7fa; padding: 0.2em 0.4em; border-radius: 3px; }
.message :deep(pre) { 
  background: #f8f9fa;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
}

.message :deep(ul) {
  list-style-position: inside;
  padding-left: 0;
}

.message :deep(ol) {
  list-style-position: inside;
  padding-left: 0;
}

.message :deep(ul li) {
  padding-left: 1em;
  text-indent: -1em;
}

.message :deep(ol li) {
  padding-left: 1.5em;
  text-indent: -1.5em;
}

.message :deep(li > p) {
  display: inline;
  margin: 0;
  padding: 0;
}
</style>
