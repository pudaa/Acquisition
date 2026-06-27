// 负责实验结构有关的元件引脚和交互逻辑

// 定义各元件的引脚位置（含名称标签）
export function getComponentPins(GRID_SIZE) {
    return {
        'resistor': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'battery': [{x: 0, y: 0, label: '+'}],
        'bulb': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'capacitor': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'electrolytic-capacitor': [{x: -GRID_SIZE, y: 0, label: '-'}, {x: GRID_SIZE, y: 0, label: '+'}],
        'diode': [{x: -GRID_SIZE, y: 0, label: 'A(阳极)'}, {x: GRID_SIZE, y: 0, label: 'K(阴极)'}],
        'transistor-npn': [
            {x: -GRID_SIZE, y: 0, label: 'B(基极)'},
            {x: GRID_SIZE, y: -GRID_SIZE, label: 'C(集电极)'},
            {x: GRID_SIZE, y: GRID_SIZE, label: 'E(发射极)'}
        ],
        'transistor-pnp': [
            {x: -GRID_SIZE, y: 0, label: 'B(基极)'},
            {x: GRID_SIZE, y: -GRID_SIZE, label: 'C(集电极)'},
            {x: GRID_SIZE, y: GRID_SIZE, label: 'E(发射极)'}
        ],
        'ground': [{x: 0, y: 0, label: 'GND'}],
        'switch': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'and-gate': [
            {x: -GRID_SIZE, y: -GRID_SIZE, type: 'input', label: 'IN1'},
            {x: -GRID_SIZE, y: GRID_SIZE, type: 'input', label: 'IN2'},
            {x: GRID_SIZE, y: 0, type: 'output', label: 'OUT'}
        ],
        'or-gate': [
            {x: -GRID_SIZE, y: -GRID_SIZE, type: 'input', label: 'IN1'},
            {x: -GRID_SIZE, y: GRID_SIZE, type: 'input', label: 'IN2'},
            {x: GRID_SIZE, y: 0, type: 'output', label: 'OUT'}
        ],
        'not-gate': [
            {x: -GRID_SIZE, y: 0, type: 'input', label: 'IN'},
            {x: GRID_SIZE, y: 0, type: 'output', label: 'OUT'}
        ],
        'nand-gate': [
            {x: -GRID_SIZE, y: -GRID_SIZE, type: 'input', label: 'IN1'},
            {x: -GRID_SIZE, y: GRID_SIZE, type: 'input', label: 'IN2'},
            {x: GRID_SIZE, y: 0, type: 'output', label: 'OUT'}
        ],
        'nor-gate': [
            {x: -GRID_SIZE, y: -GRID_SIZE, type: 'input', label: 'IN1'},
            {x: -GRID_SIZE, y: GRID_SIZE, type: 'input', label: 'IN2'},
            {x: GRID_SIZE, y: 0, type: 'output', label: 'OUT'}
        ],
        'inductor': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'photoresistor': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'potentiometer': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'buzzer': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
        'fuse': [{x: -GRID_SIZE, y: 0, label: '1'}, {x: GRID_SIZE, y: 0, label: '2'}],
    };
}

// 获取元件实际引脚位置
export function getActualPins(component, GRID_SIZE) {
    if (!component) return [];
    const type = component.type;
    // 特殊处理导线类型
    if (type === 'wire') {
        return [
            { x: (component.xGrid || 0) * GRID_SIZE, y: (component.yGrid || 0) * GRID_SIZE },
            { x: (component.x2Grid || 0) * GRID_SIZE, y: (component.y2Grid || 0) * GRID_SIZE }
        ];
    }
    // 检查是否有引脚定义
    const pins = getComponentPins(GRID_SIZE)[type];
    if (!pins) return [];
    const angle = (component.rotation || 0) * Math.PI / 180; // 获取旋转弧度
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // 转换为元件中心的像素坐标
    const baseX = (component.xGrid || 0) * GRID_SIZE;
    const baseY = (component.yGrid || 0) * GRID_SIZE;
    return pins.map(pin => {
        return {
            x: baseX + pin.x * cos - pin.y * sin,
            y: baseY + pin.x * sin + pin.y * cos
        };
    });
}


// 查找最近引脚
export function findNearestPin(e, components, canvas, GRID_SIZE, offsetX, offsetY) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - offsetX;
    const mouseY = e.clientY - rect.top - offsetY;

    let nearestPin = null;
    let minDistance = Infinity; // 最小距离

    components.forEach(component => {
        getActualPins(component, GRID_SIZE).forEach((pin, idx) => {
            const distance = Math.hypot(pin.x - mouseX, pin.y - mouseY);
            if (distance < 15 && distance < minDistance) {
                minDistance = distance;
                nearestPin = { x: pin.x, y: pin.y, component, pinIdx: idx, type: pin.type  };
            }
        });
    });
    return nearestPin;
}

// 查找最近的元件
export function findNearestComponent(e, components, canvas, GRID_SIZE, offsetX, offsetY) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - offsetX;
    const mouseY = e.clientY - rect.top - offsetY;

    let nearest = null;
    let minDist = Infinity;

    components.forEach(comp => {
        const pins = getActualPins(comp, GRID_SIZE);
        pins.forEach(pin => {
            const dist = Math.hypot(pin.x - mouseX, pin.y - mouseY);
            if (dist < 20 && dist < minDist) {
                minDist = dist;
                nearest = comp;
            }
        });
    });

    return nearest;
}

export class HistoryManager {
    constructor(components = []) {
        this.historyStack = [];
        this.initLength = 0;
        if (components.length > 0) {
            this.historyStack.push({
                components: [...components]
            });
            this.initLength = 1;
        }
    }   

    undo(){
        if (this.historyStack.length > this.initLength) {
            const prevState = this.historyStack.pop();
            const components = prevState.components;
            return components;
        }else if (this.initLength > 0) {
            return this.historyStack[0].components;
        }
        return [];
    }
    save(components){
        this.historyStack.push({
            components: [...components]
        });
    }
}


export function isPointInComponent(point, components, GRID_SIZE) {
    for (const component of components) {
        // 跳过导线本身
        if (component.type === 'wire') continue;
        
        // 获取元件引脚位置
        const pins = getActualPins(component, GRID_SIZE);
        if (pins.length === 0) continue;
        
        // 对于有引脚的元件，检查点是否与引脚重合
        for (const pin of pins) {
            const pinX = Math.round(pin.x / GRID_SIZE) * GRID_SIZE;
            const pinY = Math.round(pin.y / GRID_SIZE) * GRID_SIZE;
            const pointX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
            const pointY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;
            
            if (pinX === pointX && pinY === pointY) {
                return true;
            }
        }
        
        // 对于某些特殊元件，可能需要检查元件主体区域
        if (component.type === 'resistor' || component.type === 'bulb' || 
            component.type === 'capacitor' || component.type === 'diode') {
            // 这些元件在两个引脚之间的直线上
            if (pins.length >= 2) {
                const startX = Math.round(pins[0].x / GRID_SIZE) * GRID_SIZE;
                const startY = Math.round(pins[0].y / GRID_SIZE) * GRID_SIZE;
                const endX = Math.round(pins[1].x / GRID_SIZE) * GRID_SIZE;
                const endY = Math.round(pins[1].y / GRID_SIZE) * GRID_SIZE;
                
                const pointX = Math.round(point.x / GRID_SIZE) * GRID_SIZE;
                const pointY = Math.round(point.y / GRID_SIZE) * GRID_SIZE;
                
                // 检查点是否在引脚连线上
                if (startX === endX && pointX === startX && 
                    ((pointY >= Math.min(startY, endY) && pointY <= Math.max(startY, endY)))) {
                    return true;
                }
                
                if (startY === endY && pointY === startY &&
                    ((pointX >= Math.min(startX, endX) && pointX <= Math.max(startX, endX)))) {
                    return true;
                }
            }
        }
    }
    return false;
}


export function isLineIntersectingComponents(start, end, components, GRID_SIZE) {
    // 检查线段的起点和终点是否在元件内
    if (isPointInComponent(start, components, GRID_SIZE) || 
        isPointInComponent(end, components, GRID_SIZE)) {
        return true;
    }
    
    // 检查线段是否穿过元件
    for (const component of components) {
        if (component.type === 'wire') continue;
        
        const pins = getActualPins(component, GRID_SIZE);
        if (pins.length === 0) continue;
        
        // 检查线段是否与元件引脚连线相交
        for (let i = 0; i < pins.length - 1; i++) {
            const pin1 = pins[i];
            const pin2 = pins[i + 1];
            
            // 简化的相交检测
            const line1Start = {x: Math.round(start.x / GRID_SIZE) * GRID_SIZE, y: Math.round(start.y / GRID_SIZE) * GRID_SIZE};
            const line1End = {x: Math.round(end.x / GRID_SIZE) * GRID_SIZE, y: Math.round(end.y / GRID_SIZE) * GRID_SIZE};
            const line2Start = {x: Math.round(pin1.x / GRID_SIZE) * GRID_SIZE, y: Math.round(pin1.y / GRID_SIZE) * GRID_SIZE};
            const line2End = {x: Math.round(pin2.x / GRID_SIZE) * GRID_SIZE, y: Math.round(pin2.y / GRID_SIZE) * GRID_SIZE};
            
            // 检查线段是否相交（简化版）
            if (line1Start.x === line1End.x && line1Start.x >= Math.min(line2Start.x, line2End.x) && 
                line1Start.x <= Math.max(line2Start.x, line2End.x) &&
                Math.min(line1Start.y, line1End.y) <= Math.max(line2Start.y, line2End.y) &&
                Math.max(line1Start.y, line1End.y) >= Math.min(line2Start.y, line2End.y)) {
                return true;
            }
            
            if (line1Start.y === line1End.y && line1Start.y >= Math.min(line2Start.y, line2End.y) && 
                line1Start.y <= Math.max(line2Start.y, line2End.y) &&
                Math.min(line1Start.x, line1End.x) <= Math.max(line2Start.x, line2End.x) &&
                Math.max(line1Start.x, line1End.x) >= Math.min(line2Start.x, line2End.x)) {
                return true;
            }
        }
    }
    
    return false;
}
