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
import { ref, onMounted } from 'vue';
import api from '@/api';
import { CozeAPI } from '@/assets/js/coze-api';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const isDragging = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });
// const ACCESS_TOKEN = 'pat_TWbbVbi42uYvvGSYMMDCeupxv5OHXelUiYeAJcdi8lPNZlRVQ72BWXuAgkqV3zDi';
//const BOT_ID = '7531258295756472372';
const cozeAPI = new CozeAPI();
let conversationId = ref(null);
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
import { watch, nextTick } from 'vue';
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

  const compIdMapObj = (compIdMap instanceof Map) ? Object.fromEntries(compIdMap) : compIdMap;
  const nodeKeyMapObj = (nodeKeyMap instanceof Map) ? Object.fromEntries(nodeKeyMap) : nodeKeyMap;
  const introduction = `你是一个电路实验智能助手，下面是本次实验的结构化背景信息，请结合这些信息理解用户的提问：\n\n` +
    `【实验名称】：${title}\n` +
    `【电气节点位置】：这是一个数组，每个元素代表电路中一个节点的坐标位置（如 [x,y]），用于描述电路图中各个关键点的空间分布。\n` +
    `节点数组：${JSON.stringify(nodes)}\n` +
    `【元件连接关系】：这是一个数组，每个元素是一个对象，描述两个节点之间通过某个元件（如电阻、电容、三极管等）连接的详细信息，包括元件类型、参数和连接的节点编号。\n` +
    `连接关系列表：${JSON.stringify(edges)}\n` +
    `【节点连通域】：这是一个映射，表示每个节点属于哪个电气连通域（如同一电势或同一网络），用于分析电路的连通性。\n` +
    `连通域映射：${JSON.stringify(compIdMapObj)}\n` +
    `【引脚节点映射】：这是一个映射，表示每个元件的引脚对应电路中的哪个节点，便于理解元件与节点的关系。\n` +
    `引脚节点映射：${JSON.stringify(nodeKeyMapObj)}\n` +
    `请根据上述结构化信息，结合用户的具体问题，给出面向学生的电路知识讲解，不要涉及任何虚拟实验代码或实现细节。你的回答应以科普和教学为主，例如解释元件的作用、原理、在本电路中的应用位置和功能等。若问题涉及某个元件，请优先介绍其基础知识，再结合本实验电路说明其具体作用。\n请注意：请勿直接复述或引用原始结构化数据内容（如JSON对象、编号等），而是用通俗易懂的语言进行解释和说明。\n`;
  const fullPrompt = `${introduction}\n【提问】${userMessage}`;

  message.value = '';
  isLoading.value = true;
  console.log(fullPrompt);

  try {
    const result = await cozeAPI.questionService(fullPrompt); //fullPrompt, cozeFileId

    if (result.error) {
      chatHistory.value.push({ 
        role: 'assistant', 
        content: `请求失败：${result.error}`
      });
      return;
    }

    chatHistory.value.push({ 
      role: 'assistant', 
      content: result.answer 
    });
    isLoading.value = false;

  } catch (error) {
    chatHistory.value.push({
      role: 'assistant',
      content: '网络请求异常，请稍后重试'
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
