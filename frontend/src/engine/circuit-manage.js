// 负责电路整体管理，包括导入和导出

export function exportCircuit(components) { // 导出电路
    const circuitState = {
        components: components,  // 组件数组
        version: '1.0'          // 版本信息用于后续兼容性检查
    };
    
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(circuitState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function importCircuit(fileName) { 
    let components = [];
    try {
        const response = await fetch(fileName);
        const circuitData = await response.json();
        
        // 验证文件格式
        if (!circuitData.components || !Array.isArray(circuitData.components)) {
            throw new Error('无效的电路文件格式');
        }
        
        // 导入组件
        components = circuitData.components.map(comp => ({ ...comp, isGuide: true }));
    } catch (error) {
        console.error('加载预设电路失败:', error);
        throw error; 
    }
    return components;
}
