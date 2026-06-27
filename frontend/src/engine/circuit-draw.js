// 负责实验绘制逻辑
// 元件绘制已迁移至 renderer-registry.js 注册制系统
import { isPointInComponent, isLineIntersectingComponents } from './circuit-component.js';
import { drawComponent } from './renderer-registry.js';

export { drawComponent } from './renderer-registry.js';
export { registerRenderer, getRenderer, getRegisteredTypes } from './renderer-registry.js';

// 导线绘制
export function drawWire(ctx, GRID_SIZE, start, end) {
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    // 折线：先水平后垂直或先垂直后水平
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        // 先水平后垂直
        ctx.lineTo(end.x, start.y);
    } else {
        // 先垂直后水平
        ctx.lineTo(start.x, end.y);
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    // 端点圆点（增强引脚连接可视性）
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(start.x, start.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
    

// 绘制网格背景函数
export function drawGrid(ctx, canvas, GRID_SIZE, offsetX, offsetY) {
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1;
    for (let x = -offsetX; x <= canvas.width - offsetX; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, -offsetY);
        ctx.lineTo(x, canvas.height - offsetY);
        ctx.stroke();
    }
    for (let y = -offsetY; y <= canvas.height - offsetY; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(-offsetX, y);
        ctx.lineTo(canvas.width - offsetX, y);
        ctx.stroke();
    }
}


export function drawSmartWire(ctx, GRID_SIZE, start, end, components) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    
    // 计算两点间距离
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const paths = [];
    
    // 路径1: 先水平后垂直
    const path1 = [];
    const midX1 = Math.round((start.x + end.x) / 2 / GRID_SIZE) * GRID_SIZE;
    path1.push({x: start.x, y: start.y});
    path1.push({x: midX1, y: start.y});
    path1.push({x: midX1, y: end.y});
    path1.push({x: end.x, y: end.y});
    paths.push({path: path1, priority: 1});
    
    // 路径2: 先垂直后水平
    const path2 = [];
    const midY2 = Math.round((start.y + end.y) / 2 / GRID_SIZE) * GRID_SIZE;
    path2.push({x: start.x, y: start.y});
    path2.push({x: start.x, y: midY2});
    path2.push({x: end.x, y: midY2});
    path2.push({x: end.x, y: end.y});
    paths.push({path: path2, priority: 1});
    
    // 只有在距离较远时才考虑复杂路径
    if (distance > GRID_SIZE * 3) {
        // 路径3: 先水平一段再垂直再水平
        const path3 = [];
        const midX3a = Math.round((start.x + GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
        const midY3 = Math.round((start.y + (end.y - start.y) / 2) / GRID_SIZE) * GRID_SIZE;
        const midX3b = Math.round((end.x - GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
        path3.push({x: start.x, y: start.y});
        path3.push({x: midX3a, y: start.y});
        path3.push({x: midX3a, y: midY3});
        path3.push({x: midX3b, y: midY3});
        path3.push({x: midX3b, y: end.y});
        path3.push({x: end.x, y: end.y});
        paths.push({path: path3, priority: 2});
        
        // 路径4: 先垂直一段再水平再垂直
        const path4 = [];
        const midY4a = Math.round((start.y + GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
        const midX4 = Math.round((start.x + (end.x - start.x) / 2) / GRID_SIZE) * GRID_SIZE;
        const midY4b = Math.round((end.y - GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
        path4.push({x: start.x, y: start.y});
        path4.push({x: start.x, y: midY4a});
        path4.push({x: midX4, y: midY4a});
        path4.push({x: midX4, y: midY4b});
        path4.push({x: end.x, y: midY4b});
        path4.push({x: end.x, y: end.y});
        paths.push({path: path4, priority: 2});
        
        // 路径5: 水平方向弓字形路径（先向右绕）
        const path5 = [];
        const offsetX5 = GRID_SIZE * 2;
        path5.push({x: start.x, y: start.y});
        path5.push({x: start.x + offsetX5, y: start.y});
        path5.push({x: start.x + offsetX5, y: end.y});
        path5.push({x: end.x, y: end.y});
        paths.push({path: path5, priority: 3});
        
        // 路径6: 水平方向弓字形路径（先向左绕）
        const path6 = [];
        const offsetX6 = GRID_SIZE * 2;
        path6.push({x: start.x, y: start.y});
        path6.push({x: start.x - offsetX6, y: start.y});
        path6.push({x: start.x - offsetX6, y: end.y});
        path6.push({x: end.x, y: end.y});
        paths.push({path: path6, priority: 3});
    }
    
    // 评估路径，选择最佳路径（穿过最少元件的路径）
    let bestPath = paths[0].path;
    let minIntersections = Infinity;
    let bestPriority = Infinity;
    
    for (const {path, priority} of paths) {
        let intersections = 0;
        // 检查路径中的每条线段
        for (let i = 0; i < path.length - 1; i++) {
            if (isLineIntersectingComponents(path[i], path[i+1], components, GRID_SIZE)) {
                intersections++;
            }
        }
        
        // 优先选择优先级高（数字小）且交叉最少的路径
        if (priority < bestPriority || (priority === bestPriority && intersections < minIntersections)) {
            minIntersections = intersections;
            bestPath = path;
            bestPriority = priority;
        }
    }
    
    // 如果所有路径都有交叉，则使用简单路径
    if (minIntersections > 0) {
        // 重新评估简单路径，选择交叉最少的
        const simplePaths = paths.filter(p => p.priority === 1);
        let minSimpleIntersections = Infinity;
        let bestSimplePath = simplePaths[0].path;
        
        for (const {path} of simplePaths) {
            let intersections = 0;
            // 检查路径中的每条线段
            for (let i = 0; i < path.length - 1; i++) {
                if (isLineIntersectingComponents(path[i], path[i+1], components, GRID_SIZE)) {
                    intersections++;
                }
            }
            
            if (intersections < minSimpleIntersections) {
                minSimpleIntersections = intersections;
                bestSimplePath = path;
            }
        }
        
        bestPath = bestSimplePath;
    }
    
    // 绘制最佳路径
    for (let i = 1; i < bestPath.length; i++) {
        ctx.lineTo(bestPath[i].x, bestPath[i].y);
    }
    
    ctx.stroke();
}
