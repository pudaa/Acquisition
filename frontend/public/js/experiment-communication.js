class ExperimentCommunicator {
    constructor(options = {}) {
      this.debug = options.debug || false;
      this.onReady = options.onReady || null;
      this.onProgress = options.onProgress || null;
      this.onComplete = options.onComplete || null;
      this.onMessageHandlers = [];
  
      window.addEventListener('DOMContentLoaded', () => this.init());
      window.addEventListener('message', (event) => this.handleMessage(event));
    
    }

    init() {
      this.sendMessage('EXPERIMENT_READY');
      if(window.createjs) {
        this.bindAnimateEvents(); 
      }
      window.comm = this;
    }
  
    // 消息发送 
    sendMessage(type, data = {}) {
      const message = { type, ...data };
      parent.postMessage(message, '*');
      this.debug && console.log('[Experiment] 发送消息:', message);
    }

    // 消息处理器
    addMessageHandler(handler) {
        this.onMessageHandlers.push(handler);
    }
  
    // 绑定动画事件
    bindAnimateEvents() {
      createjs.Ticker.addEventListener('tick', (event) => {
      });
    }
  
    // 进度更新
    updateProgress(step) {
      this.sendMessage('PROGRESS_UPDATE', { value: step });
    }
  
    // 记录操作
    recordOperation(actionType, data) {
      this.sendMessage('OPERATION_RECORD', {
        action: actionType,
        timestamp: Date.now(),
        data
      });
    }
  
    // 完成实验
    complete(score) {
      this.sendMessage('EXPERIMENT_COMPLETE', { score });
    }

    // 发送实验截图
    sendScreenshot(image) {
        this.sendMessage('EXPERIMENT_SCREENSHOT', { image });
    }

    // 发送用户行为日志
    sendUserLog(log) {
        this.sendMessage('UPLOAD_USER_LOG', { log });
    }

    // 处理来自父窗口的消息
    handleMessage(event) {
        // 调用自定义消息处理器
        for (const handler of this.onMessageHandlers) {
            if (handler(event)) {
                // 如果处理器返回true，表示消息已被处理
                return;
            }
        }
        
        // 默认消息处理
        if (event.data && event.data.type === 'EXPERIMENT_COMPLETE') {
            console.log('接收到 EXPERIMENT_COMPLETE 消息');
            if (this.onComplete) {
                this.onComplete(event.data);
            }
        }
    }

}

window.ExperimentComm = ExperimentCommunicator;