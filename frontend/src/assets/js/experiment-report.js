import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';

const ExperimentReport = {
    exportPDF({ user, expId, expTitle, goals, operations, score, startTime, endTime, practiceScore, screenshotUrl, feeling,analysisResult }) {
        // 创建 HTML 模板
        const element = document.createElement('div');
        element.innerHTML = `
            <style>
                .title { 
                    font-size: 34px; 
                    font-weight: bold; 
                    text-align: center;
                    margin: 20px 0;
                    color: #2c3e50;
                }
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 14px;
                }
                .report-table th {
                    background: #f8f9fa;
                    padding: 12px;
                    text-align: left;
                    border: 1px solid #dee2e6;
                }
                .report-table td {
                    padding: 12px;
                    border: 1px solid #dee2e6;
                }
                .info-table {
                    width: 90%;
                    margin: 20px auto;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
                }
                .info-table tr {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr); /* 4列布局 */
                }
                .info-table th {
                    text-align: right;
                    padding-right: 10px;
                    background: #f8f9fa;
                }
                .info-table td {
                    padding-left: 10px;
                }
                .status-done { color: #28a745; }
                .status-undone { color: #dc3545; }
                .section-title {
                    font-size: 28px;
                    margin: 25px 0 15px;
                    color: #34495e;
                    padding-bottom: 5px;
                    border-bottom: 2px solid #3498db;
                    page-break-after: avoid;
                }
                .screenshot {
                    max-width: 100%;
                    margin: 20px 0;
                    text-align: center;
                    page-break-inside: avoid;
                }
                .screenshot img {
                    max-width: 90%;
                    height: auto;
                }
                .feeling-content {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f1f1f1;
                    border-left: 5px solid #3498db;
                    page-break-inside: avoid;
                }
                .analysisResult-content {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f1f1f1;
                    border-left: 5px solid #3498db;
                    page-break-inside: avoid;
                }
                /* 避免分页时分割内容 */
                .page-break {
                    page-break-inside: avoid;
                    page-break-before: auto;
                    page-break-after: auto;
                }

                /* 为表格行和段落添加分页控制 */
                .report-table tr, .feeling-content, .analysisResult-content {
                    page-break-inside: avoid;
                }
                
                /* 防止表格在页面边界被分割 */
                .report-table {
                    page-break-inside: avoid;
                }
                
                .report-table thead {
                    display: table-header-group;
                }
                
                .report-table tfoot {
                    display: table-footer-group;
                }
                
                /* Markdown 渲染样式 */
                .markdown-content h3 {
                    font-size: 24px;
                    margin: 20px 0 10px;
                    color: #34495e;
                }
                
                .markdown-content h4 {
                    font-size: 20px;
                    margin: 15px 0 8px;
                    color: #34495e;
                }
                
                .markdown-content ul {
                    margin: 10px 0;
                    padding-left: 30px;
                }
                
                .markdown-content li {
                    margin: 5px 0;
                }
                
                .markdown-content p {
                    margin: 10px 0;
                    line-height: 1.6;
                }
                
                .markdown-content code {
                    background-color: #f1f1f1;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                }
            </style>

            <div class="title">实验报告</div>
            
            <table class="report-table info-table">
                <tr>
                    <th>学生姓名</th>
                    <td>${user.realname || ''}</td>
                    <th>学号</th>
                    <td>${user.username || '未知'}</td>
                </tr>
                <tr>
                    <th>实验编号</th>
                    <td>${expId}</td>
                    <th>实验名称</th>
                    <td>${expTitle || '未知实验'}</td>
                </tr>
                <tr>
                    <th>开始时间</th>
                    <td>${startTime || '未记录'}</td>
                    <th>结束时间</th>
                    <td>${endTime || '未记录'}</td>
                </tr>
                <tr>
                    <th>实验用时</th>
                    <td>${startTime && endTime ? calculateDuration(startTime, endTime) : '未知'}</td>
                    <th>实验得分</th>
                    <td>${score}/100</td>
                </tr>
                <tr>
                    <th>练习得分</th>
                    <td>${practiceScore ? `${practiceScore}/100` : '未参与练习'}</td>
                    <th>身份</th>
                    <td>${user.role === 'student' ? '学生' : '教师'}</td>
                </tr>
            </table>

            ${screenshotUrl ? `
            <div class="section-title">电路截图</div>
            <div class="screenshot">
                <img src="${screenshotUrl}" alt="电路截图">
            </div>
            ` : ''}

            <div class="section-title">目标完成分析</div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th width="5%">序号</th>
                        <th width="35%">实验目标</th>
                        <th width="15%">完成状态</th>
                        <th width="25%">完成时间</th>
                        <th width="20%">耗时</th>
                    </tr>
                </thead>
                <tbody>
                    ${goals.map((g, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${g.title}</td>
                            <td class="${g.done ? 'status-done' : 'status-undone'}">${g.done ? '已完成' : '未完成'}</td>
                            <td>${g.finishTime ? formatTime(g.finishTime) : '未完成'}</td>
                            <td>${g.duration || '未完成'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top:10px; page-break-inside: avoid;">目标完成率: ${calculateCompletionRate(goals)}%<br>权重分布: ${calculateWeightDistribution(goals)}</div>

            <div class="section-title">心得感悟</div>
            <div class="feeling-content">
                ${feeling ? feeling.replace(/\n/g, '<br>') : '无'}
            </div>

            <div class="section-title">AI分析反馈</div>
            <div class="analysisResult-content">
                ${analysisResult ? this.renderMarkdown(analysisResult) : '无'}
            </div>
        `;

        // 配置 html2pdf 选项
        const opt = {
            margin: [10, 5, 10, 5], // 上、右、下、左页边距
            filename: `实验报告_${expId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                logging: true,
                useCORS: true 
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4',
                orientation: 'portrait' 
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.before-page-break',
                after: '.after-page-break',
                avoid: '.avoid-page-break'
            }
        };

        // 生成 PDF
        html2pdf().set(opt).from(element).save();
    },
    
    renderMarkdown(markdown) {
        // 简单的 Markdown 渲染器，支持标题、列表、粗体等基本语法
        let html = markdown;
        
        // 转义 HTML 特殊字符
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
        
        // 处理 H3 标题 (###)
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        
        // 处理 H4 标题 (####)
        html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
        
        // 处理粗体 (**text**)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 处理列表项 (- item)
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        
        // 将连续的列表项包装在 ul 标签中
        html = html.replace(/(<li>.*<\/li>)+/gs, '<ul>$&</ul>');
        
        // 处理行内代码 (`code`)
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // 处理段落（将连续的非标题、非列表行包装在 p 标签中）
        html = html.replace(/^([^-#\s].*$)/gm, '<p>$1</p>');
        
        // 处理换行符
        html = html.replace(/\n/g, '');
        
        return `<div class="markdown-content">${html}</div>`;
    }
};

function calculateDuration(start, end) {
    const duration = new Date(end) - new Date(start);
    const minutes = Math.floor(duration / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分钟`;
}

function calculateCompletionRate(goals) {
    const completed = goals.filter(g => g.done).length;
    return ((completed / goals.length) * 100).toFixed(1);
}

function calculateWeightDistribution(goals) {
    const total = goals.reduce((sum, g) => sum + g.weight, 0);
    return goals.map(g => 
        `${g.title}: ${((g.weight/total) * 100).toFixed(0)}%`
    ).join(', ');
}

function formatTime(timestamp) {
    if (!timestamp) return '时间未记录';
    return new Date(timestamp).toLocaleString('zh-CN');
}

export default ExperimentReport;