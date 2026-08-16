<template>
  <div class="discussion-view">
    <div class="discussion-header">
      <h2>{{ currentTab === 'general' ? '综合讨论区' : '班级讨论区' }}</h2>
      <div class="discussion-tools">
        <!-- 讨论区切换按钮 -->
        <div>
          <button
            :class="{ active: currentTab === 'general' }"
            @click="switchTab('general')">综合</button>

          <button
            :class="{ active: currentTab === 'class' }"
            @click="switchTab('class')">班级</button>
        </div>
        <!-- 搜索框和新建话题按钮 -->
        <input v-model="searchQuery" @input="handleSearch" placeholder="搜索话题标题/内容/作者..." class="search-input" />
        <button v-if="user" class="create-topic-btn" @click="showCreateModal = true">新建话题</button>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="discuss-contents">
      <div v-if="filteredTopics.length === 0" class="no-topics">暂无话题，快来发起第一个讨论吧！</div>
      <div v-for="topic in filteredTopics" :key="topic.id" class="topic-card">
        <div class="topic-header" :class="{ pinned: topic.is_pinned }">
          <span class="topic-title">
            <span v-if="topic.is_pinned" class="pinned-badge">置顶</span>
            {{ topic.title }}
          </span>
          <span class="topic-meta">by {{ topic.authorName }} · {{ formatTime(topic.createdAt) }}</span>
          <div class="topic-actions">
            <button v-if="canPin(topic) && !topic.is_pinned" @click="pinTopic(topic)">置顶</button>
            <button v-if="canPin(topic) && topic.is_pinned" @click="unpinTopic(topic)">取消置顶</button>
            <button v-if="canDelete(topic)" @click="deleteTopic(topic)">删除</button>
          </div>
        </div>
        <div class="topic-content">{{ topic.content }}</div>
        <div class="replies">
          <div v-for="(reply, idx) in visibleReplies(topic)" :key="reply.id" class="reply-item">
            <span class="reply-author">{{ reply.authorName }}</span>：
            <span class="reply-content">{{ reply.content }}</span>
            <span class="reply-meta">{{ formatTime(reply.createdAt) }}</span>
            <button v-if="canDeleteReply(reply)" @click="deleteReply(topic, reply)">删除</button>
          </div>
          <button v-if="topic.replies && topic.replies.length > 2" class="toggle-replies-btn" @click="toggleReplies(topic)">
            {{ expandedTopics[topic.id] ? '收起回复' : '展开全部回复' }}
          </button>
          <div v-if="user" class="reply-box">
            <input v-model="replyInputs[topic.id]" placeholder="回复..." @keyup.enter="submitReply(topic)" />
            <button @click="submitReply(topic)">回复</button>
          </div>
        </div>
      </div>
    </div>
    <!-- 新建话题弹窗 -->
    <div v-if="showCreateModal" class="modal-mask">
      <div class="modal-container">

        <div v-if = "!user.class_id && currentTab === 'class'">
          <h3>请先加入班级才能在班级讨论区发帖。</h3>
          <div class="modal-actions1">
           <button @click="showCreateModal = false">关闭</button>
          </div>
        </div>

        <div v-else>
          <h3>新建话题</h3>
          <input v-model="newTopic.title" placeholder="请输入话题标题" />
          <textarea v-model="newTopic.content" placeholder="请输入话题内容"></textarea>
          <div class="modal-actions">
            <button @click="createTopic">发布</button>
            <button @click="showCreateModal = false">取消</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
const topics = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const newTopic = ref({ title: '', content: '' });
const replyInputs = ref({});
const searchQuery = ref('');
const expandedTopics = ref({});


// 当前tab和班级ID（user.class_id 为 null 表示未加入班级）
const currentTab = ref('general'); // 'general' or 'class'
const userClassId = user.value.class_id ?? null;

const switchTab = (tab) => {
  currentTab.value = tab;
};

const fetchTopics = async () => {
  console.log('当前用户信息:', user.value); // 打印当前用户信息
  loading.value = true;
  try {
    const res = await api.get('/discussion/topics');
    topics.value = res.data.data || [];
  } catch (e) {
    topics.value = [];
  } finally {
    loading.value = false;
  }
};

const createTopic = async () => {
  if (!newTopic.value.title.trim() || !newTopic.value.content.trim()) return;
  // 根据当前tab设置class_id（综合讨论区为 null，班级讨论区为当前班级ID）
  const class_id = currentTab.value === 'general' ? null : userClassId;
  try {
    await api.post('/discussion/topics', {
      title: newTopic.value.title,
      content: newTopic.value.content,
      authorId: user.value.id,
      class_id: class_id
    });
    showCreateModal.value = false;
    newTopic.value = { title: '', content: '' };
    fetchTopics();
  } catch (e) {}
};

const submitReply = async (topic) => {
  const content = replyInputs.value[topic.id];
  if (!content || !content.trim()) return;
  try {
    await api.post(`/discussion/topics/${topic.id}/replies`, {
      content,
      authorId: user.value.id
    });
    replyInputs.value[topic.id] = '';
    fetchTopics();
  } catch (e) {}
};

const deleteTopic = async (topic) => {
  if (!confirm('确定要删除该话题吗？')) return;
  try {
    await api.delete(`/discussion/topics/${topic.id}`);
    fetchTopics();
  } catch (e) {}
};

const deleteReply = async (topic, reply) => {
  if (!confirm('确定要删除该回复吗？')) return;
  try {
    await api.delete(`/discussion/topics/${topic.id}/replies/${reply.id}`);
    fetchTopics();
  } catch (e) {}
};

const pinTopic = async (topic) => {
  try {
    await api.post(`/discussion/topics/${topic.id}/pin`);
    //增加功能实现置顶
    fetchTopics();
  } catch (e) {}
};

const unpinTopic = async (topic) => {
  try {
    await api.post(`/discussion/topics/${topic.id}/unpin`);
    //增加功能实现取消置顶
    fetchTopics();
  } catch (e) {}
};

const canDelete = (topic) => {
  return user.value && (user.value.role === 'teacher' || topic.authorId === user.value.id);
};
const canPin = (topic) => {
  return user.value && user.value.role === 'teacher';
};
const canDeleteReply = (reply) => {
  return user.value && (user.value.role === 'teacher' || reply.authorId === user.value.id);
};
const formatTime = (t) => {
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleString();
};

const handleSearch = () => {
};

const filteredTopics = computed(() => {
  // 先按tab筛选
  let list = topics.value.filter(t =>
    currentTab.value === 'general'
      ? t.class_id == null
      : t.class_id === userClassId
  );
  // 再按搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      (t.authorName && t.authorName.toLowerCase().includes(q))
    );
  }
  // 置顶排序：is_pinned为true的在前，其他按创建时间降序
  return list.slice().sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // 相同类型按创建时间降序排列
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
});

const visibleReplies = (topic) => {
  if (!topic.replies) return [];
  if (expandedTopics.value[topic.id]) return topic.replies;
  return topic.replies.slice(0, 2);
};
const toggleReplies = (topic) => {
  expandedTopics.value[topic.id] = !expandedTopics.value[topic.id];
};

onMounted(fetchTopics);
</script>

<style scoped>
.discussion-view {
  max-height: 45rem;
  position:relative;
  margin: 1.5rem;
  height: 10%;
}
.discussion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.discussion-tools {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.discuss-contents{
  height: 100%;
  overflow-y: scroll;
  scrollbar-width: none;
  padding-bottom: 5rem;
}
.search-input {
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
  border: 1px solid #d0d7e4;
  font-size: 1rem;
  min-width: 220px;
}
.create-topic-btn {
  background: #305fce;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.5rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
}
.topic-card {
  background: #fafbff;
  border-radius: 8px;
  box-shadow: 0 2px 8px #e3e8f7;
  margin-bottom: 1.5rem;
  padding: 1.2rem 1rem;
}
.topic-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.topic-header.pinned {
  background: #fffbe6;
  border-left: 4px solid #f7b500;
}
.topic-title {
  font-weight: bold;
  font-size: 1.1rem;
}
.topic-meta {
  color: #888;
  font-size: 0.9rem;
  margin-right: auto;
  margin-left: 0.5rem;
}
.topic-actions button {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: #305fce;
  cursor: pointer;
}
.topic-content {
  margin-bottom: 0.7rem;
  font-size: 1rem;
}
.replies {
  margin-left: 1.2rem;
  margin-top: 0.5rem;
}

.reply-item {
  margin-bottom: 0.3rem;
  font-size: 0.97rem;
}
.reply-item button {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: #305fce;
  cursor: pointer;
}
.reply-author {
  color: #305fce;
  font-weight: 500;
}
.reply-meta {
  color: #aaa;
  font-size: 0.85rem;
  margin-left: 0.5rem;
}
.reply-box {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
}
.reply-box input {
  flex: 1;
  font-size: 1.1rem;
  padding: 0.4rem 0.7rem;
  border-radius: 5px;
  border: 1px solid #d0d7e4;
  margin-right: 0.5rem;
}
.reply-box button {
  background: #96bef7;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.4rem 1.1rem;
  font-size: 1rem;
  cursor: pointer;
}
.toggle-replies-btn {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  margin: 0.2rem 0 0.5rem 0;
  font-size: 0.98rem;
  padding: 0;
}
.loading {
  text-align: center;
  color: #305fce;
  font-size: 1.2rem;
}
.no-topics {
  text-align: center;
  color: #888;
  margin-top: 2rem;
}
.modal-mask {
  position: fixed;
  z-index: 9999;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-container {
  background: #fff;
  border-radius: 8px;
  padding: 2rem 2.5rem;
  min-width: 320px;
  box-shadow: 0 2px 16px #d0d7e4;
}
.modal-container input,
.modal-container textarea {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.6rem;
  border-radius: 5px;
  border: 1px solid #d0d7e4;
  font-size: 1rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.modal-actions button {
  padding: 0.6rem 1.2rem;
  background: #305fce;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 1rem; 
}

.modal-actions1 {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center;     /* 垂直居中 */
  gap: 1rem;
  margin-top: 2rem;    /* 增加与底部的距离 */
}
.modal-actions1 button {
  padding: 0.6rem 1.2rem;
  background: #305fce;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 1rem; 
}

.pinned-badge {
  display: inline-block;
  background: #f7b500;
  color: #fff;
  font-size: 0.85em;
  border-radius: 3px;
  padding: 0 0.5em;
  margin-right: 0.5em;
  font-weight: bold;
}
.discussion-tools button.active {
  background: #305fce;
  color: #fff;
  font-size: 1rem;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
}
.discussion-tools button {
  font-size: 1rem;
  border: none;
  padding: 0.4rem 0.8rem;
  margin-right: 1rem;
  border-radius: 5px;
}
</style>
