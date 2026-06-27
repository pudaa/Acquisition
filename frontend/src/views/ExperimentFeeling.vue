<!-- filepath: vsls:/frontend/src/views/ExperimentFeeling.vue -->
<template>
  <div class="experiment-feeling">
    <!-- 复用顶部栏 -->
    <div class="top-bar">
      <div class="back-button" @click="goBack">
        <div class="back-btn-icon">
          <svg t="1750992239888" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7675" width="30" height="30">
            <path d="M643.79 293.4H265.44l85-73.12 0.15-0.13c17.91-15.84 20-42.41 4.67-60.48l-0.21-0.24c-15.84-17.91-42.41-20-60.48-4.67l-179.9 154.83a35.11 35.11 0 0 0-1.44 51.9l180.65 173.83a43 43 0 1 0 59.44-62.06l-97-93.68h387.47c105.88 0 191.72 85.83 191.72 191.71V595c0 105.88-85.84 191.71-191.72 191.71H322.65a42.69 42.69 0 0 0-42.85 42.73c-0.07 23.64 19.93 43 43.58 43h320.41c153.48 0 277.89-124.42 277.89-277.89v-23.72c0-152.97-124.68-277.43-277.89-277.43z" fill="#ffffff" p-id="7676"></path>
          </svg>
        </div>
        <span>重新学习</span>
      </div>
      <div class="experiment-title">
        <span>{{ expTitle }}</span>
      </div>
    </div>

    <!-- 心得感悟输入框 -->
    <div class="feeling-container">
      <h1>实验心得感悟</h1>
      <textarea 
        v-model="feeling" 
        placeholder="请输入您的实验心得感悟..." 
        rows="20"
      ></textarea>
      <div class="button-container">
        <button @click="downloadReport">下载实验报告</button>
      </div>
    </div>
  </div>
</template>

<script>
import ExperimentReport from '@/assets/js/experiment-report.js';
import api from '../api';

export default {
  data() {
    return {
      feeling: '', // 用户输入的心得感悟
      analysisResult: '', // 用于存储AI分析结果
    };
  },
  computed: {
    expTitle() {
      return this.$route.query.expTitle || '实验报告';
    }
  },
  methods: {
    async handleIframeMessage(event) {
      // 调用后端 AI 接口分析学生行为数据
      const behaviorlogs = this.$route.query.behaviorlogs;
      const question = `以下是学生的行为数据，请分析学生的实验表现并给出反馈：\n实验信息：${this.$route.query.expTitle}\n实验目标：${this.$route.query.goals}\n行为数据：${behaviorlogs}`;
      console.log('AI 分析问题:', question);

      try {
        const { data } = await api.post('/ai/chat', {
          question,
          expTitle: this.$route.query.expTitle,
          circuitData: null,
          history: [],
        });
        this.analysisResult = data.answer || 'AI 分析失败，请稍后重试。';
      } catch (error) {
        console.error('AI 分析失败:', error);
        this.analysisResult = 'AI 分析失败，请稍后重试。';
      }
    },
    goBack() {
      this.$router.go(-1); // 返回上一页
    },
    downloadReport() {
      try {
        if (!this.analysisResult || this.analysisResult === '' || this.analysisResult === '无') {
          alert('AI分析内容生成中，请稍后再下载报告');
          return;
        }
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
          throw new Error('用户信息获取失败');
        }

        // 获取路由参数中的实验数据
        const { expId, expTitle, goals, operations, progress, startTime, endTime, practiceScore, screenshotUrl} = this.$route.query;

        // 确保所有必要参数都有默认值
        ExperimentReport.exportPDF({
          user,
          expId: expId || '未知',
          expTitle: expTitle || '未知实验',
          goals: goals ? JSON.parse(goals) : [],
          operations: operations ? JSON.parse(operations) : [],
          score: progress || 0,
          startTime: startTime || new Date().toISOString(),
          endTime: endTime || new Date().toISOString(),
          practiceScore: practiceScore || 0,
          screenshotUrl: screenshotUrl || '',
          feeling: this.feeling || '无', // 确保心得感悟被传递
          analysisResult: this.analysisResult || '无', // 确保分析结果被传递
        });
      } catch (error) {
        alert('实验报告导出失败，请稍后重试');
        console.error('实验报告导出失败:', error);
      }
    },
  },
  mounted() {
    // 页面加载时自动调用 AI 分析方法
    this.handleIframeMessage();
  },
};
</script>


<style scoped>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .experiment-feeling {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: rgba(255, 255, 255, 0.85);
        }

        .top-bar {
            width: 100%;
            height: 64px;
            background: rgba(25, 118, 210, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 0 32px;
            flex-shrink: 0;
        }

        .back-button {
            position: absolute;
            left: 32px;
            background: transparent;
            color: #fff;
            box-shadow: none;
            border-radius: 4px;
            font-size: 1.2em;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 8px 16px;
            transition: background 0.2s;
            -webkit-user-select: none;
            user-select: none;
        }

        .back-button:hover {
            background: rgba(255, 255, 255, 0.12);
        }

        .back-button span {
            opacity: 1;
            visibility: visible;
            margin-left: 8px;
            color: #fff;
            font-size: 1em;
        }

        .back-btn-icon {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
            padding-bottom: 1px;
            user-select: none;
        }

        .experiment-title {
            color: #fff;
            font-size: 1.8em;
            font-weight: bold;
            text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.2);
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: none;
            -webkit-user-select: none;
            user-select: none;
        }

        .feeling-container {
            flex: 1;
            padding: 40px;
            display: flex;
            flex-direction: column;
            overflow: auto;
            background: url('/images/experiment2.jpg') no-repeat center center fixed;
            background-size: cover;
        }

        .feeling-container h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #1976d2;
            font-size: 2.2em;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }

        textarea {
            width: calc(100% - 100px); /* 减去左右边距 */
            font-size: 18px;
            padding: 20px;
            margin: 0 50px 30px 50px; 
            border: 2px solid #ddd;
            border-radius: 10px;
            background: white; /* 白色背景 */
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            resize: vertical;
            min-height: 300px;
            line-height: 1.6;
        }

        textarea:focus {
            outline: none;
            border-color: #1976d2;
            box-shadow: 0 5px 20px rgba(25, 118, 210, 0.2);
        }

        textarea::placeholder {
            color: #888;
            font-style: italic;
        }

        .button-container {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }

        button {
            padding: 14px 35px;
            font-size: 18px;
            cursor: pointer;
            background: linear-gradient(135deg, #1976d2, #1251a3);
            color: white;
            border: none;
            border-radius: 50px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);
            font-weight: 600;
            letter-spacing: 1px;
        }

        button:hover {
            background: linear-gradient(135deg, #1251a3, #0d3d7a);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(25, 118, 210, 0.4);
        }

        button:active {
            transform: translateY(0);
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .feeling-container {
                padding: 20px;
            }
            
            textarea {
                margin: 0 20px 20px 20px;
                width: calc(100% - 40px); /* 减去左右边距 */
                font-size: 16px;
            }
            
            .feeling-container h1 {
                font-size: 1.8em;
            }
            
            button {
                padding: 12px 25px;
                font-size: 16px;
            }
            
            .top-bar {
                padding: 0 15px;
            }
            
            .back-button span {
                display: none;
            }
            
            .experiment-title {
                font-size: 1.4em;
            }
        }
    </style>