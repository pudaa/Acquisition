// 负责实验绘制逻辑
import {isPointInComponent, isLineIntersectingComponents} from '/js/circuit-component.js';
export function drawComponent(ctx, component, GRID_SIZE, getComponentPins, options = {}) {
    ctx.save();
    ctx.translate(component.xGrid * GRID_SIZE, component.yGrid * GRID_SIZE);
    ctx.rotate((component.rotation || 0) * Math.PI / 180);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    switch(component.type) {
        case 'resistor':// 电阻
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(-(3/4 * GRID_SIZE), 0);
            ctx.lineTo(-(3/4 * GRID_SIZE), -(1/3 * GRID_SIZE));
            ctx.lineTo((3/4 * GRID_SIZE), -(1/3 * GRID_SIZE));
            ctx.lineTo((3/4 * GRID_SIZE), (1/3 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (1/3 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), 0);
            ctx.moveTo((3/4 * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.stroke();
            break;
        case 'battery':// 电源
            ctx.beginPath();
            ctx.moveTo(0, -(3/4 * GRID_SIZE)); // 单引脚
            ctx.lineTo(0, 0);
            ctx.moveTo(-(1/4 * GRID_SIZE + 1), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/4 * GRID_SIZE + 1), -(3/4 * GRID_SIZE)); // ：绘制电源的另一引脚
            ctx.stroke();
            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = '#d00';
            ctx.fillText('+', -(1/2 * GRID_SIZE), -GRID_SIZE);
            break;
        case 'bulb':
            // 发光状态
            if (options.lit) {
                // 绘制发光光晕
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GRID_SIZE-2);
                gradient.addColorStop(0, 'rgba(255,255,120,0.8)');
                gradient.addColorStop(0.5, 'rgba(255,220,60,0.4)');
                gradient.addColorStop(1, 'rgba(255,220,60,0)');
                ctx.beginPath();
                ctx.arc(0, 0, GRID_SIZE-2, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(-(3/4  * GRID_SIZE), 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, (3/4 * GRID_SIZE), 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            // ctx.moveTo(-(1/2 * GRID_SIZE), (3/4 * GRID_SIZE)+1);
            // ctx.lineTo((1/2 * GRID_SIZE), (3/4 * GRID_SIZE)+1);
            ctx.moveTo((3/4  * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.stroke();
            ctx.beginPath();
            const j_xy = (3/4 * GRID_SIZE) * Math.sin(Math.PI/4);
            ctx.moveTo(-j_xy, -j_xy);
            ctx.lineTo(j_xy, j_xy);
            ctx.moveTo(-j_xy, j_xy);
            ctx.lineTo(j_xy, -j_xy);
            ctx.stroke();
            break;
        case 'capacitor':// 电容
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(-(1/4 * GRID_SIZE), 0);
            ctx.moveTo((1/4 * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.moveTo(-(1/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.lineTo(-(1/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.moveTo((1/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.lineTo((1/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.stroke();
            break;
        case 'electrolytic-capacitor': // 电解电容
            ctx.beginPath();
            ctx.moveTo(-(3/4 * GRID_SIZE), 0);
            ctx.lineTo(-(1/4 * GRID_SIZE), 0);
            ctx.moveTo((1/4 * GRID_SIZE), 0);
            ctx.lineTo((3/4 * GRID_SIZE), 0);
            ctx.moveTo(-(1/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.lineTo(-(1/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.moveTo((1/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.lineTo((1/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.stroke();
            ctx.fillStyle = '#f00';
            ctx.fillText('+', -18, -(1/4 * GRID_SIZE)); 
            ctx.fillText('-', 12, -(1/4 * GRID_SIZE));
            break;
            
        case 'diode':
            // 二极管符号
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(-(1/4 * GRID_SIZE + 1), 0);
            ctx.lineTo(-(1/4 * GRID_SIZE + 1), -(1/4 * GRID_SIZE + 2));
            ctx.lineTo((1/4 * GRID_SIZE), 0);
            ctx.lineTo(-(1/4 * GRID_SIZE + 1), (1/4 * GRID_SIZE + 2));
            ctx.lineTo(-(1/4 * GRID_SIZE + 1), 0);
            ctx.moveTo((1/4 * GRID_SIZE), -(1/4 * GRID_SIZE + 2));
            ctx.lineTo((1/4 * GRID_SIZE), (1/4 * GRID_SIZE + 2));
            ctx.moveTo((1/4 * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.stroke();
            break;
        case 'transistor-npn':
        case 'transistor-pnp': {
            // B极——基极
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(0, 0);
            ctx.moveTo(0, -(3/4 * GRID_SIZE));
            ctx.lineTo(0, (3/4 * GRID_SIZE));
            ctx.stroke();
            // C极——集电极
            ctx.beginPath();
            ctx.moveTo(0, -(1/4 * GRID_SIZE));
            ctx.lineTo((9/10 * GRID_SIZE), -(9/10 * GRID_SIZE));
            ctx.stroke();
            // E极——发射极
            ctx.beginPath();
            ctx.moveTo(0, (1/4 * GRID_SIZE));
            ctx.lineTo((9/10 * GRID_SIZE), (9/10 * GRID_SIZE));
            ctx.stroke();
            // 箭头
            ctx.save();
            ctx.beginPath();
            if (component.type === 'transistor-npn') {
                // NPN箭头朝外
                ctx.moveTo((4/5 * GRID_SIZE)-3, (4/5 * GRID_SIZE)-8);
                ctx.lineTo((4/5 * GRID_SIZE), (4/5 * GRID_SIZE));
                ctx.lineTo((4/5 * GRID_SIZE)-9, (4/5 * GRID_SIZE));
            } else {
                // PNP箭头朝内
                ctx.moveTo((1/8 * GRID_SIZE), -(1/2 * GRID_SIZE + 3));
                ctx.lineTo(0, -(1/4 * GRID_SIZE));
                ctx.lineTo((1/4 * GRID_SIZE)+3, -(1/4 * GRID_SIZE + 2))
            }
            ctx.stroke();
            ctx.restore();
            // 标注类型
            ctx.font = '10px sans-serif';
            ctx.fillText(component.type === 'transistor-npn' ? 'NPN' : 'PNP', -22, -12);
            break;
        }
        case 'ground': // 接地元件
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, (1/2 * GRID_SIZE));
            ctx.moveTo(-(1/2 * GRID_SIZE - 2), (1/2 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE - 2), (1/2 * GRID_SIZE));
            ctx.moveTo(-(1/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.lineTo((1/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.moveTo(-2, GRID_SIZE);
            ctx.lineTo(2, GRID_SIZE);
            ctx.stroke();
            break;
        case 'switch':
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(0, 0);
            if (component.state === 'closed') {
                ctx.lineTo(GRID_SIZE, 0);
            } else {
                ctx.moveTo(0, 0);
                ctx.lineTo((1/2 * GRID_SIZE + 2), -(1/2 * GRID_SIZE));
                ctx.moveTo((1/2 * GRID_SIZE + 2), 0);
                ctx.lineTo(GRID_SIZE, 0);
            }
            ctx.stroke();
            ctx.font = GRID_SIZE/2 + 'px sans-serif';
            ctx.fillText(component.state === 'closed' ? '闭合' : '断开', -(1/2 * GRID_SIZE), (3/4 * GRID_SIZE));
            break;
        case 'and-gate':
            // 绘制 AND 门 
            ctx.beginPath();
            ctx.moveTo(-(3/4 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            // 在矩形内写一个&
            ctx.font = GRID_SIZE/2 + "px Arial";
            ctx.fillText("&", -(1/4 * GRID_SIZE), -(1/4 * GRID_SIZE));
            ctx.closePath();
            ctx.stroke();
            // 输出引脚
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, -GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, -(1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.moveTo(-GRID_SIZE, GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, (1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.moveTo(1/2 * GRID_SIZE, 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.stroke();
            break;
        case 'or-gate':
            // 绘制 OR 门 
            ctx.beginPath();
            ctx.moveTo(-(3/4 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            // 在矩形内写一个&
            ctx.font = GRID_SIZE/2 + "px Arial";
            ctx.fillText("≥1", -(1/4 * GRID_SIZE), -(1/4 * GRID_SIZE));
            ctx.closePath();
            ctx.stroke();
            // 输出引脚
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, -GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, -(1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.moveTo(-GRID_SIZE, GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, (1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.moveTo(1/2 * GRID_SIZE, 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.stroke();
            break;
        case 'not-gate':
            // 绘制 NOT 门 
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, 0);
            ctx.lineTo(-(3/4 * GRID_SIZE), 0);
            ctx.moveTo((3/4 * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.moveTo(-(3/4 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            // 在矩形内写一个1
            ctx.font = GRID_SIZE/2 + "px Arial";
            ctx.fillText("1", -(1/4 * GRID_SIZE), -(1/4 * GRID_SIZE));
            ctx.closePath();
            ctx.stroke();
            // 小圆圈表示反相
            ctx.beginPath();
            ctx.arc((5/8 * GRID_SIZE), 0, (1/8 * GRID_SIZE), 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'nand-gate':
            // 绘制 与非门 门 
            ctx.beginPath();
            ctx.moveTo((3/4 * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.moveTo(-(3/4 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.font = GRID_SIZE/2 + "px Arial";
            ctx.fillText("&", -(1/4 * GRID_SIZE), -(1/4 * GRID_SIZE));
            ctx.closePath();
            ctx.stroke();
            // 输出引脚
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, -GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, -(1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.moveTo(-GRID_SIZE, GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, (1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.stroke();
            ctx.beginPath();
            ctx.arc((5/8 * GRID_SIZE), 0, (1/8 * GRID_SIZE), 0, Math.PI * 2);
            ctx.stroke();
            break;
        case 'nor-gate':
            // 绘制 或非门 门 
            ctx.beginPath();
            ctx.moveTo((3/4 * GRID_SIZE), 0);
            ctx.lineTo(GRID_SIZE, 0);
            ctx.moveTo(-(3/4 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), -(3/4 * GRID_SIZE));
            ctx.lineTo((1/2 * GRID_SIZE), (3/4 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (3/4 * GRID_SIZE));
            // 在矩形内写一个&
            ctx.font = GRID_SIZE/2 + "px Arial";
            ctx.fillText("≥1", -(1/4 * GRID_SIZE), -(1/4 * GRID_SIZE));
            ctx.closePath();
            ctx.stroke();
            // 输出引脚
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE, -GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, -(1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), -(1/2 * GRID_SIZE));
            ctx.moveTo(-GRID_SIZE, GRID_SIZE);
            ctx.lineTo(-GRID_SIZE, (1/2 * GRID_SIZE));
            ctx.lineTo(-(3/4 * GRID_SIZE), (1/2 * GRID_SIZE));
            ctx.stroke();
            ctx.beginPath();
            ctx.arc((5/8 * GRID_SIZE), 0, (1/8 * GRID_SIZE), 0, Math.PI * 2);
            ctx.stroke();
            break;    
        }
        // 绘制引脚
        ctx.fillStyle = '#f80';
        ctx.lineWidth = 1;
        if (getComponentPins(GRID_SIZE)[component.type]) {
            getComponentPins(GRID_SIZE)[component.type].forEach(pin => {
                ctx.beginPath();
                ctx.arc(pin.x, pin.y, (1/8 * GRID_SIZE), 0, Math.PI * 2);
                ctx.fill();
            }
        );
    }
    ctx.restore();
}

// 导线绘制
export function drawWire(ctx, GRID_SIZE, start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    // 折线：先水平后垂直或先垂直后水平，折点吸附网格
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        // 先水平后垂直
        const midX = Math.round((start.x + dx) / GRID_SIZE) * GRID_SIZE;
        ctx.lineTo(midX, start.y);
        ctx.lineTo(midX, end.y);
    } else {
        // 先垂直后水平
        const midY = Math.round((start.y + dy) / GRID_SIZE) * GRID_SIZE;
        ctx.lineTo(start.x, midY);
        ctx.lineTo(end.x, midY);
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
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