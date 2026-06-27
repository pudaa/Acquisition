// 负责目标和行为检测，其中目标上传父页面，行为记录本地变量
import { getActualPins } from "/js/circuit-component.js";

// 学生行为数据记录器
export class BehaviorTracker {
    constructor() {
        this.behaviorLog = [];
        this.pre_components = [];
    }

    // 监测是否有行为发生
    monitor(components) {
        if (this.pre_components.length === 0) { 
            this.pre_components = JSON.parse(JSON.stringify(components));
            return;
        };
        if (JSON.stringify(this.pre_components) !== JSON.stringify(components)) {
            const preLength = this.pre_components.length;
            const currLength = components.length;
            // 记录变化
            if (currLength > preLength) {
                const addedComponents = components.filter(currComp => 
                    !this.pre_components.some(preComp => JSON.stringify(preComp) === JSON.stringify(currComp))
                );
                const addedTypes = [...new Set(addedComponents.map(c => c.type))].join(',');
                this.logComponentChange('ADD', {id: '', type: addedTypes, details: addedComponents});
            } else if (currLength < preLength) {
                const deletedComponents = this.pre_components.filter(preComp => 
                    !components.some(currComp => JSON.stringify(preComp) === JSON.stringify(currComp))
                );
                const deletedTypes = [...new Set(deletedComponents.map(c => c.type))].join(',');
                this.logComponentChange('DELETE', {id: '', type: deletedTypes, details: deletedComponents});
            } else {
                this.logComponentChange('MODIFY', {id: '', type: 'ALL'});
            }
            this.pre_components = JSON.parse(JSON.stringify(components));
        }
    }

    // 记录组件变化
    logComponentChange(action, component, timestamp = Date.now()) {
        this.behaviorLog.push({
            action,
            component,
            timestamp
        });
        // console.log("记录组件变化:", this.behaviorLog);
        
        // 发送行为记录到父页面
        if (comm) {
            comm.recordOperation('COMPONENT_ACTION', {
                action,
                componentId: component.id,
                componentType: component.type,
                timestamp
            });
        }
    }

    // 获取行为日志
    getBehaviorLog() {
        return this.behaviorLog;
    }

    // 清除行为日志
    clearBehaviorLog() {
        this.behaviorLog = [];
    }
}

export class GoalStatusManager { // 目标状态管理器
    constructor() {
        this.goalStatus = {};
    }
    getGoalStatus(goal) { // 获取目标状态
        if (!this.goalStatus[goal]) { // 如果目标状态不存在，则初始化
            this.goalStatus[goal] = false;
        }
        return this.goalStatus[goal];
    }
    setGoalStatus(goal, status) { // 设置目标状态
        this.goalStatus[goal] = status;
    }

    // 获取所有还没完成的目标
    getUncompletedGoals() {
        return Object.keys(this.goalStatus).filter(goal => !this.goalStatus[goal]);
    }
};

// 目标检测器
export class GoalDetector {
    constructor() {
        this.goalStatus = new GoalStatusManager();
        this.componentCounts = new Map();
        this.componentTyped = new Map();
    }

    // 获取某个组件的数量
    getComponentCount(type) {
        return this.componentCounts.get(type) || 0;
    }

    // 获取某类组件的列表
    getComponentList(type) {
        return this.componentTyped.get(type) || [];
    }

    // 获取id为id的某类组件
    getComponentById(type, id) {
        const compList = this.componentTyped.get(type);
        if (!compList) {
            return null;
        }
        for (let i = 0; i < compList.length; i++) {
            if (compList[i].id === id) {
                return compList[i];
            }
        }
        return null;
    }

    // 更新组件统计信息
    updateComponentStats(components, nodeVoltagesHistory, GRID_SIZE) {
        // 重置统计数据
        this.componentCounts.clear();
        this.componentTyped.clear();

        // 获取电路的节点和边并存储到一个对象中，避免重复计算
        const circuitInfo = window.getAllNodesAndEdges(components, GRID_SIZE, getActualPins); // { nodes, edges, nodeKeyMap, compIdMap }
        const activeNetSet = this.getActiveNetSet(components, GRID_SIZE, circuitInfo);

        // 统计各类型组件数量
        components.forEach(component => {// 遍历所有元件，只统计接入电路的元件，不统计孤立元件
            if ((this.isComponentInActiveCircuit(component, circuitInfo, activeNetSet, GRID_SIZE) || component.type =='battery' || component.type == 'ground') && component.type != 'wire'){
                const type = component.type;
                this.componentCounts.set(type, (this.componentCounts.get(type) || 0) + 1); // 计数
                if (!this.componentTyped.has(type)) { // 创建分类
                    this.componentTyped.set(type, []);
                }
                this.componentTyped.get(type).push(component);
                // console.log(type, this.componentCounts.get(type));
                // 有关元件数量有关的目标可以在这里检测并触发
                this.checkCommonGoals(type, this.componentCounts.get(type));
            }
        });

        // 进行专项目标检测
        this.checkSpecificGoals(components, nodeVoltagesHistory, GRID_SIZE, circuitInfo, activeNetSet);
    }
    // 通用目标检测触发
    checkCommonGoals(targetComponentType, number) {
        const goalType = "GOAL_" + targetComponentType.toUpperCase() + "_" + number;
        if (this.goalStatus.getGoalStatus(goalType) === false) {
            this.goalStatus.setGoalStatus(goalType, true);
            comm.recordOperation(goalType, {count: number});
        }
    }
    // 专项目标检测
    checkSpecificGoals(components, nodeVoltagesHistory, GRID_SIZE, circuitInfo, activeNetSet) {
        const currentBulbLit = this.getComponentList('bulb').some(comp => comp.lit);
        const transistorCount = this.getComponentList('transistor-npn').length + this.getComponentList('transistor-pnp').length;
        const voltageSources = this.getComponentList('voltage-source').concat(this.getComponentList('battery'));
        const switches = this.getComponentList('switch');
        const nandGates = this.getComponentList('nand-gate');
        const bulbs = this.getComponentList('bulb');
        const resistors = this.getComponentList('resistor');
        // console.log(comm)

        // 检查灯泡是否发光（仅在状态变化时触发）
        if (currentBulbLit !== this.goalStatus.getGoalStatus("GOAL_BULB_LIT") && this.goalStatus.getGoalStatus("GOAL_BULB_LIT") == false) {
            this.goalStatus.setGoalStatus("GOAL_BULB_LIT", currentBulbLit);
            if (currentBulbLit) {
                comm.recordOperation('GOAL_BULB_LIT', {});
            }
        }
        
        // 检查是否使用电源并成功接地（基础电路完成）
        if (!this.goalStatus.getGoalStatus("BASIC_DONE") && voltageSources.length >= 1 && this.getComponentCount('ground') > 0) {
            // console.log('目标达成：使用电源并成功接地');
            const basicFlag = this.isCircuitActive(components, circuitInfo, activeNetSet, GRID_SIZE);
            if (basicFlag) {
                this.goalStatus.setGoalStatus("BASIC_DONE", basicFlag);
                comm.recordOperation('GOAL_BASIC_DONE', {});
            }
        }

        // 检查任意三极管是否放置
        if (transistorCount > 0 && !this.goalStatus.getGoalStatus("GOAL_TRANSISTOR_"+transistorCount)) {
            this.goalStatus.setGoalStatus("GOAL_TRANSISTOR_"+transistorCount, true);
            comm.recordOperation('GOAL_TRANSISTOR_'+transistorCount, {});
        }
    
    
        // 检查多谐振荡器（增加状态缓存）
        const currentOscillator = this.detectMultivibrator(components, nodeVoltagesHistory, getActualPins, GRID_SIZE);
        if (!this.goalStatus.getGoalStatus("GOAL_OSCILLATOR") && currentOscillator) {
            this.goalStatus.setGoalStatus("GOAL_OSCILLATOR", true);
            comm.recordOperation('GOAL_OSCILLATOR', {});
        }
        
        // 两个开关都断开时灯泡熄灭
        if (switches.length >= 2) {
            const bothOpen = switches[0].state === 'open' && switches[1].state === 'open';
            if (!this.goalStatus.getGoalStatus("GOAL_OR_GATE_BULB_OFF") && bothOpen && !currentBulbLit) {
                // console.log('目标达成：两个开关都断开时灯泡熄灭');
                this.goalStatus.setGoalStatus("GOAL_OR_GATE_BULB_OFF", true);
                comm.recordOperation('GOAL_OR_GATE_BULB_OFF', {});
            }
        }
    
        // 当至少一个开关闭合时灯泡发光
        if (switches.length >= 2) {
            const atLeastOneClosed = switches.some(s => s.state === 'closed');
            const atLeastOneOpen = switches.some(s => s.state === 'open');
            if (!this.goalStatus.getGoalStatus("GOAL_OR_GATE_BULB_ON") && atLeastOneClosed && atLeastOneOpen && currentBulbLit) {
                // console.log('目标达成：至少一个开关闭合时灯泡发光');
                this.goalStatus.setGoalStatus("GOAL_OR_GATE_BULB_ON", true);
                comm.recordOperation('GOAL_OR_GATE_BULB_ON', {});
            }
        }
    
        // 当两个开关都闭合时灯泡发光
        if (switches.length >= 2) {
            const bothClosed = switches[0].state === 'closed' && switches[1].state === 'closed';
            if (!this.goalStatus.getGoalStatus("GOAL_AND_GATE_BULB_ON") && bothClosed && currentBulbLit) {
                // console.log('目标达成：两个开关都闭合时灯泡发光');
                this.goalStatus.setGoalStatus("GOAL_AND_GATE_BULB_ON", true);
                comm.recordOperation('GOAL_AND_GATE_BULB_ON', {});
            }
        }
    
        // 当仅一个开关闭合时灯泡熄灭
        if (switches.length >= 2) {
            const oneClosed = (switches[0].state === 'closed' && switches[1].state === 'open') ||
                            (switches[0].state === 'open' && switches[1].state === 'closed');
            if (!this.goalStatus.getGoalStatus("AND_GATE_BULB_OFF") && oneClosed && !currentBulbLit) {
                // console.log('目标达成：仅一个开关闭合时灯泡熄灭');
                this.goalStatus.setGoalStatus("AND_GATE_BULB_OFF", true);
                comm.recordOperation('GOAL_AND_GATE_BULB_OFF', {});
            }
        }
    
        // 非门模拟目标检测
        // console.log(switches.length, bulbs.length, this.goalStatus.getGoalStatus("GOAL_TRANSISTOR_1"), resistors.length);
        if (switches.length >= 1 && bulbs.length >= 1 && this.goalStatus.getGoalStatus("GOAL_TRANSISTOR_1") && resistors.length >= 2 && !this.goalStatus.getGoalStatus("NOT_GATE")) { 
            const sw1 = switches.find(s => s.id === 'SW1');
            const bulb = bulbs.find(s => s.id === 'B1');
            if (sw1 && this.goalStatus.getGoalStatus("NOT_GATE01") === false && sw1.state === 'closed' && !bulb.lit && this.isComponentInActiveCircuit(bulb, circuitInfo, activeNetSet, GRID_SIZE)) {
                this.goalStatus.setGoalStatus("NOT_GATE01", true);
                comm.recordOperation('GOAL_NOT_GATE_01', {});
            }else if (sw1 && this.goalStatus.getGoalStatus("NOT_GATE10") === false && sw1.state === 'open' && bulb.lit && this.isComponentInActiveCircuit(bulb, circuitInfo, activeNetSet, GRID_SIZE)){ 
                this.goalStatus.setGoalStatus("NOT_GATE10", true);
                comm.recordOperation('GOAL_NOT_GATE_10', {});
            }
            if(this.goalStatus.getGoalStatus("NOT_GATE10") && this.goalStatus.getGoalStatus("NOT_GATE01") && !this.goalStatus.getGoalStatus("NOT_GATE")){
                this.goalStatus.setGoalStatus("NOT_GATE", true);
            }
        }
    
        // 与非门基本触发器目标检测
        if (nandGates.length >= 2 && switches.length >= 2 && bulbs.length >= 1 && this.isComponentInActiveCircuit(bulbs.find(s => s.id === 'B1'), circuitInfo, activeNetSet, GRID_SIZE)) {
            const sw1 = switches.find(s => s.id === 'SW1');
            const sw2 = switches.find(s => s.id === 'SW2');
            const bulb = bulbs.find(s => s.id === 'B1');
            if (!sw1 || !sw2 || !bulb) return;
    
            // 以NAND型为例，输入高电平为open，低电平为closed
            const S = sw1.state === 'open' ? 1 : 2; // sw1输入
            const R = sw2.state === 'open' ? 1 : 2; // sw2输入
            const Q = bulb.lit ? 1 : 2; // 灯泡亮为高
    
            // console.log(S, R, Q, this.goalStatus.getGoalStatus("LATCH_PREV_S"), this.goalStatus.getGoalStatus("LATCH_PREV_R"));
            // 初始化记录
            if (this.goalStatus.getGoalStatus("LATCH_PREV_Q") === false) this.goalStatus.setGoalStatus("LATCH_PREV_Q", Q);
            if (this.goalStatus.getGoalStatus("LATCH_PREV_S") === false) this.goalStatus.setGoalStatus("LATCH_PREV_S", S);
            if (this.goalStatus.getGoalStatus("LATCH_PREV_R") === false) this.goalStatus.setGoalStatus("LATCH_PREV_R", R);
    
            // S=1, R=2，Q应为0（灯泡灭）
            if (S === 1 && R === 2 && Q === 2 && !this.goalStatus.getGoalStatus("LATCH_SR10_Q0")) {
                if (!this.goalStatus.getGoalStatus("LATCH_SR10_Q0")) {
                    this.goalStatus.setGoalStatus("LATCH_SR10_Q0", true);
                    comm.recordOperation('GOAL_LATCH_SR10_Q0', {});
                }
            }
            // S=0, R=1，Q应为1（灯泡亮）
            if (S === 2 && R === 1 && Q === 1 && !this.goalStatus.getGoalStatus("LATCH_SR01_Q1")) {
                if (!this.goalStatus.getGoalStatus("LATCH_SR01_Q1")) {
                    this.goalStatus.setGoalStatus("LATCH_SR01_Q1", true);
                    comm.recordOperation('GOAL_LATCH_SR01_Q1', {});
                }
            }
            // S=1, R=1，保持状态：只有本次和上次都是S=1,R=1且Q未变才判定
            if (S === 1 && R === 1 && (this.goalStatus.getGoalStatus("LATCH_PREV_S") === 2 || this.goalStatus.getGoalStatus("LATCH_PREV_R") === 2) && !this.goalStatus.getGoalStatus("LATCH_SR11_KEEP")) {
                // console.log("S=1, R=1，保持状态：只有本次和上次都是S=1,R=1且Q未变才判定");
                if (Q === this.goalStatus.getGoalStatus("LATCH_PREV_Q")) {
                    if (!this.goalStatus.getGoalStatus("LATCH_SR11_KEEP")) {
                        this.goalStatus.setGoalStatus("LATCH_SR11_KEEP", true);
                        comm.recordOperation('GOAL_LATCH_SR11_KEEP', {});
                    }
                }
            }
            // S=0, R=0，非法状态
            if (S === 2 && R === 2) {
                if (!this.goalStatus.getGoalStatus("LATCH_SR00_INVALID")) {
                    this.goalStatus.setGoalStatus("LATCH_SR00_INVALID", true);
                    comm.recordOperation('GOAL_LATCH_SR00_INVALID', {});
                }
            }
    
            // 更新记录
            this.goalStatus.setGoalStatus("LATCH_PREV_Q", Q);
            this.goalStatus.setGoalStatus("LATCH_PREV_S", S);
            this.goalStatus.setGoalStatus("LATCH_PREV_R", R);
    
        }
    }

    // 获取activeNetSet（与电源或地连通的网络编号）
    getActiveNetSet(components, GRID_SIZE, circuitInfo) {
        const { nodes, edges, nodeKeyMap, compIdMap } = circuitInfo;
        let batteryNodes = [], groundNodes = [];
        components.forEach(comp => { 
            if (comp.type === 'battery') {
                const pins = getActualPins(comp, GRID_SIZE);
                const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
                const idx = nodeKeyMap.get(key);
                if (idx != null) batteryNodes.push(compIdMap.get(idx));
            }
            if (comp.type === 'ground') {
                const pins = getActualPins(comp, GRID_SIZE);
                const key = `${snap(pins[0].x, GRID_SIZE)},${snap(pins[0].y, GRID_SIZE)}`;
                const idx = nodeKeyMap.get(key);
                if (idx != null) groundNodes.push(compIdMap.get(idx));
            }
        });
        const activeNetSet = new Set([...batteryNodes, ...groundNodes]);
        let changed = true;
        while (changed) { // 遍历所有边，将与电源或地连通的网络编号加入activeNetSet
            changed = false;
            edges.forEach(({ a, b }) => {
                if (activeNetSet.has(a) && !activeNetSet.has(b)) {
                    activeNetSet.add(b); changed = true;
                } else if (activeNetSet.has(b) && !activeNetSet.has(a)) {
                    activeNetSet.add(a); changed = true;
                }
            });
        }
        return activeNetSet;
    }

    // 检测是否至少一个导通电路
    isCircuitActive(components, circuitInfo, activeNetSet, GRID_SIZE) {
        const { nodes, edges, nodeKeyMap, compIdMap } = circuitInfo;
        let batteries = components.filter(comp => comp.type === 'battery');
        let grounds = components.filter(comp => comp.type === 'ground');
        
        if (batteries.length === 0 || grounds.length === 0) return false;
        
        // 构建图的邻接表
        const graph = new Map();
        
        // 初始化图
        nodes.forEach((_, idx) => {
            graph.set(idx, []);
        });
        
        // 添加边和权重（电阻值）
        edges.forEach(({ a, b, comp }) => {
            let resistance = 1e6; // 默认高电阻
            
            switch(comp.type) {
                case 'wire':
                    resistance = 0.01;
                    break;
                case 'resistor':
                case 'bulb':
                    resistance = Math.max(comp.value || 1, 0.01);
                    break;
                case 'switch':
                    resistance = (comp.state === 'closed') ? 0.01 : 1e6;
                    break;
                case 'diode':
                    // 简化处理，给二极管一个中等电阻
                    resistance = 100;
                    break;
                default:
                    resistance = 1e6;
            }
            
            // 无向图，添加双向边
            if (graph.has(a) && graph.has(b)) {
                graph.get(a).push({ node: b, resistance, comp });
                graph.get(b).push({ node: a, resistance, comp });
            }
        });
        
        // 使用改进的Dijkstra算法检查是否存在低电阻路径
        const hasLowResistancePath = (startNode, endNode, maxResistance = 10000) => {
            const distances = new Map();
            const visited = new Set();
            const queue = [{ node: startNode, resistance: 0 }];
            
            distances.set(startNode, 0);
            
            while (queue.length > 0) {
                queue.sort((a, b) => a.resistance - b.resistance);
                const current = queue.shift();
                
                if (current.node === endNode) {
                    return current.resistance <= maxResistance;
                }
                
                if (visited.has(current.node)) continue;
                visited.add(current.node);
                
                const neighbors = graph.get(current.node) || [];
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor.node)) {
                        const newResistance = current.resistance + neighbor.resistance;
                        if (newResistance <= maxResistance) {
                            queue.push({ node: neighbor.node, resistance: newResistance });
                        }
                    }
                }
            }
            
            return false;
        };
        
        // 检查每对电池和地之间是否有可行的电气路径
        for (const battery of batteries) {
            const batteryPins = getActualPins(battery, GRID_SIZE);
            for (const pin of batteryPins) {
                const key = `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
                const batteryNodeIdx = nodeKeyMap.get(key);
                if (batteryNodeIdx != null) {
                    const batteryNetId = compIdMap.get(batteryNodeIdx);
                    
                    for (const ground of grounds) {
                        const groundPins = getActualPins(ground, GRID_SIZE);
                        for (const groundPin of groundPins) {
                            const groundKey = `${snap(groundPin.x, GRID_SIZE)},${snap(groundPin.y, GRID_SIZE)}`;
                            const groundNodeIdx = nodeKeyMap.get(groundKey);
                            if (groundNodeIdx != null) {
                                const groundNetId = compIdMap.get(groundNodeIdx);
                                
                                // 检查是否有低电阻路径
                                if (hasLowResistancePath(batteryNetId, groundNetId)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    // 检测元件是否在活动电路中（即与电源或地连通）
    isComponentInActiveCircuit(component, circuitInfo, activeNetSet, GRID_SIZE) {
        const { nodes, nodeKeyMap, compIdMap } = circuitInfo;
        // 获取元件所有引脚的网络编号
        const pins = getActualPins(component, GRID_SIZE);
        if (!pins || pins.length < 2) return false;
        // 检查所有引脚是否都在activeNetSet中
        return pins.every(pin => {
            const key = `${snap(pin.x, GRID_SIZE)},${snap(pin.y, GRID_SIZE)}`;
            const nodeIdx = nodeKeyMap.get(key);
            const netId = compIdMap.get(nodeIdx);
            return activeNetSet.has(netId);
        });
    }
    detectMultivibrator(components, nodeVoltagesHistory, GRID_SIZE) { // 检测多谐振荡器
        // 结构法
        const transistorCount = components.filter(c => c.type === 'transistor-npn' || c.type === 'transistor-pnp').length;
        const capacitorCount = components.filter(c => c.type === 'capacitor').length;
        const bulbCount = components.filter(c => c.type === 'bulb').length;
        const structureOk = transistorCount >= 1 && capacitorCount >= 1 && bulbCount >= 1;

        // 行为法 - 通过检测所有电压波动来判断
        let behaviorOk = false;
        if (nodeVoltagesHistory.length > 20) {
            const lastVoltages = nodeVoltagesHistory.slice(-20); // 取最后20帧数据
            const allVoltageKeys = new Set();
            lastVoltages.forEach(snapshot => {
                Object.keys(snapshot).forEach(key => allVoltageKeys.add(key));
            });
            let totalAvgDelta = 0;
            let validKeyCount = 0;
            
            for (const key of allVoltageKeys) {
                const voltageValues = lastVoltages
                    .filter(snapshot => key in snapshot && typeof snapshot[key] === 'number' && !isNaN(snapshot[key]))
                    .map(snapshot => snapshot[key]);
                
                if (voltageValues.length > 1) {
                    const voltageDeltas = voltageValues.map((v, i) => {
                        if (i > 0) {
                            const v1 = v;
                            const v2 = voltageValues[i-1];
                            if (typeof v1 === 'number' && typeof v2 === 'number' && !isNaN(v1) && !isNaN(v2)) {
                                return Math.abs(v1 - v2);
                            }
                            return 0;
                        }
                        return 0;
                    }).slice(1);
                
                    const validDeltas = voltageDeltas.filter(delta => !isNaN(delta) && isFinite(delta) && delta > 0);
                    if (validDeltas.length > 0) {
                        const keyAvgDelta = validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length;
                        totalAvgDelta += keyAvgDelta;
                        validKeyCount++;
                    }
                }
            }
            if (validKeyCount > 0) {
                const overallAvgDelta = totalAvgDelta / validKeyCount;
                behaviorOk = overallAvgDelta > 0.2;
            }
        }
        return structureOk && behaviorOk;
    }
}
