// 生成实验报告（独立函数）
function generateExperimentReport(records) {
    // 动态加载PDF库（如果未加载）
    if (!window.jspdf) {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = function() {
            actuallyGeneratePDF(records); // 库加载完成后执行
        };
        document.head.appendChild(script);
        return;
    }
    
    actuallyGeneratePDF(records);
}
// 实际生成PDF
function actuallyGeneratePDF(records) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // 1. 报告标题
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("凸透镜成像实验报告", 105, 20, { align: "center" });
    
    // 2. 实验数据表格
    doc.autoTable({
        startY: 40,
        head: [["序号", "物距(u/cm)", "像距(v/cm)", "虚实", "大小", "正倒"]],
        body: records.map((item, idx) => [
            idx + 1,
            item.u,
            item.v,
            item.xs || "无",
            item.dx || "无",
            item.zd || "无"
        ]),
        styles: { 
            fontSize: 10,
            cellPadding: 5
        }
    });
    
    // 3. 保存文件
    doc.save(`实验报告_${new Date().toLocaleDateString()}.pdf`);
}