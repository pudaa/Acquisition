class CozeAPI {
    constructor() {
        this.apiKey = 'pat_ChDsIEWgxLuNIorebjYIYcdfVvf5pzqZFNVcdaWgDNJdtb52CqKQSmmzoRg8wQQh';
        this.botId = '7531258295756472372';
        this.baseUrl = 'https://api.coze.cn/v3/chat';
    }

    async processQuestionAnswer(responseData) {
        if (responseData.code !== 0) {
            return { error: responseData.msg };
        }
        
        const result = {
            answer: '',
            followUpQuestions: []
        };
        
        responseData.data.forEach(item => {
            if (item.type === 'answer') {
                result.answer = item.content;
            } else if (item.type === 'follow_up') {
                result.followUpQuestions.push(item.content);
            }
        });
        // console.log(6,result);
        return result;
    }

    async getQuestionAnswer(conversationId, chatId) {
        const statusUrl = `${this.baseUrl}/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`;
        
        while (true) {
            try {
                // 先检查状态
                const statusResponse = await fetch(statusUrl, {
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json"
                    }
                });
                // console.log(1,statusResponse);
                if (statusResponse.status === 200) {
                    const statusData = await statusResponse.json();
                    // console.log(2,statusData);
                    if (statusData.data.status === 'completed') {
                        // 状态完成后再获取消息
                        const messageUrl = `${this.baseUrl}/message/list?chat_id=${chatId}&conversation_id=${conversationId}`;
                        const msgResponse = await fetch(messageUrl, {
                            headers: {
                                "Authorization": `Bearer ${this.apiKey}`,
                                "Content-Type": "application/json"
                            },
                            params: { 
                                bot_id: this.botId,
                                task_id: chatId 
                            }
                        });
                        // console.log(3,msgResponse);
                        if (msgResponse.status == 200){
                            const finalData = await msgResponse.json();
                            // console.log(4,finalData);
                            return this.processQuestionAnswer(finalData);
                        }
                        break;
                    }else{
                        // 等待1秒后再检查
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }else{
                    // 状态错误
                    return { status_code: statusResponse.status, error: statusResponse };
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('请求失败:', error);
                return { error: error.message };
            }
        }
    }

    async questionService(questionText) {//questionText,imageFileId
        //console.log('图片IDcozeFileId:', imageFileId);
        const payload = {
            bot_id: this.botId,
            user_id: "jiangwp",
            stream: false,
            auto_save_history: true,
            additional_messages: [ 
                {
                    role: "user",
                    content: questionText,
                    content_type: "text"
                }
            ]
        };
        /*
        {
            role: "user",
            content: JSON.stringify({ file_id: imageFileId }),
            content_type: "image"
        }, 
        */
        console.log('payload:', payload);
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            const responseData = await response.json();
            if (responseData.code !== 0) {
                return { error: responseData.msg };
            }
            
            const { id: chatId, conversation_id: conversationId } = responseData.data;
            const result = await this.getQuestionAnswer(conversationId, chatId);
            return result;
            
        } catch (error) {
            console.error('请求失败:', error);
            return { error: error.message };
        }
    }
}
export { CozeAPI };
// 使用示例
// const coze = new CozeAPI("your_api_key", "your_bot_id");
// coze.questionService("Dify是什么？").then(console.log);
