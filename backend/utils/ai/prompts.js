// ============ 系统提示词构建器（按场景划分，便于扩展） ============

// ---------- 实验内 AI 助手：携带用户电路图上下文 ----------
export function buildCircuitAssistantPrompt(expTitle, circuitData) {
  let circuitContext = '';
  if (circuitData) {
    const { components: compDetails, nodes, edges } = circuitData;

    // ---- 1. 生成 Mermaid 拓扑图用电压值命名节点 ----
    let mermaidChart = '';
    if (edges && edges.length > 0 && compDetails && compDetails.length > 0) {
      // 从 compDetails 构建电压 → 元件引脚映射
      const voltageNodes = {};
      for (const comp of compDetails) {
        for (const pin of (comp.pins || [])) {
          const vKey = pin.voltage?.toFixed(2) || '0.00';
          (voltageNodes[vKey] ??= []).push(`${comp.id}(${pin.label})`);
        }
      }
      // 识别特殊节点
      const nodeMeta = {};
      for (const [v, pins] of Object.entries(voltageNodes)) {
        const isPower = pins.some(p => p.startsWith('B1(') || p.startsWith('B(') || p.includes('电源'));
        const isGnd = pins.some(p => p.includes('GND') || p.includes('接地') || v === '0.00' && pins.some(p => p.endsWith('(GND)')));
        let label;
        if (isPower && v === '5.00') label = `⚡电源(5V)`;
        else if (isGnd) label = `⏚地(0V)`;
        else if (pins.length > 0) label = `${v}V`;
        else label = `${v}V`;
        // Mermaid 兼容的节点名
        const mId = 'V' + v.replace('.', '_');
        nodeMeta[v] = { mId, label, isPower, isGnd };
      }

      const typeIcons = {
        battery:'🔋', resistor:'🔶', bulb:'💡', capacitor:'⚡',
        diode:'▶', switch:'🔘', ground:'⏚', wire:'〰',
        'transistor-npn':'🔼', 'transistor-pnp':'🔽',
        'and-gate':'&', 'or-gate':'≥1', 'not-gate':'1',
        'nand-gate':'&̅', 'nor-gate':'≥1̅',
      };
      const fmtComp = (comp) => {
        let name = (typeIcons[comp.type]||'?') + (comp.id||'');
        if (comp.type === 'resistor' || comp.type === 'bulb') name += `(${comp.value||100}Ω)`;
        if (comp.type === 'switch') name += comp.state==='closed'?'[闭合]':'[断开]';
        if (comp.type === 'battery') name += '(5V)';
        return name;
      };

      // 遍历 edges，将每条边映射为电压节点间的连接
      const mermaidLines = ['graph LR'];
      const drawnEdges = new Set();
      for (const e of edges) {
        if (e.comp.type === 'wire' || e.comp.type === 'vwire') continue;
        const comp = e.comp;
        // 查找 compDetails 中对应元件的引脚电压
        const detail = compDetails.find(c => c.id === comp.id && c.type === comp.type);
        if (!detail || !detail.pins || detail.pins.length < 2) continue;
        // 遍历所有相邻引脚对，确保多引脚元件（如三极管 B-C-E）完整展现
        for (let pi = 0; pi < detail.pins.length - 1; pi++) {
          const v1 = detail.pins[pi].voltage?.toFixed(2) || '0.00';
          const v2 = detail.pins[pi + 1].voltage?.toFixed(2) || '0.00';
          if (v1 === v2) continue; // 同电位不画边
          const key = [v1, v2, comp.id, pi].sort().join('_');
          if (drawnEdges.has(key)) continue; drawnEdges.add(key);
          const n1 = nodeMeta[v1], n2 = nodeMeta[v2];
          if (!n1 || !n2) continue;
          // 引脚标签：如 "B(基极)→C(集电极) Q1"
          const fromPin = detail.pins[pi].label;
          const toPin = detail.pins[pi + 1].label;
          const pinLabel = detail.pins.length > 2 ? `${fromPin}→${toPin} ` : '';
          const cl = pinLabel + fmtComp(comp);
          mermaidLines.push(`    ${n1.mId}${n1.label ? `["${n1.label}"]` : ''} -->|"${cl}"| ${n2.mId}${n2.label ? `["${n2.label}"]` : ''}`);
        }
      }
      mermaidChart = '```mermaid\n' + mermaidLines.join('\n') + '\n```';
    }

    // ---- 2. 以元件为中心的详细连接描述 ----
    let compDescriptions = [];
    if (compDetails && compDetails.length > 0) {
      const voltageGroups = {};
      for (const comp of compDetails) {
        for (const pin of (comp.pins || [])) {
          const vkey = pin.voltage?.toFixed(2) || '0.00';
          (voltageGroups[vkey] ??= []).push(`${comp.id}(${pin.label})`);
        }
      }
      const typeNames = {
        battery:'电源', resistor:'电阻', bulb:'灯泡', capacitor:'电容',
        diode:'二极管', switch:'开关', ground:'接地',
        'transistor-npn':'NPN三极管','transistor-pnp':'PNP三极管',
        'and-gate':'与门','or-gate':'或门','not-gate':'非门',
        'nand-gate':'与非门','nor-gate':'或非门', wire:'导线',
      };
      compDescriptions = compDetails.map(comp => {
        let desc = `【${typeNames[comp.type]||comp.type}${comp.id?'#'+comp.id:''}】`;
        if (comp.type === 'resistor' || comp.type === 'bulb') desc += ` ${comp.value||100}Ω`;
        if (comp.type === 'battery') desc += ' 5V';
        if (comp.type === 'switch') desc += ` [${comp.state==='closed'?'闭合':'断开'}]`;
        if (comp.lit) desc += ' 💡发光中';
        const pinDescs = (comp.pins||[]).map(p => {
          let connectedTo = '?';
          const vkey = p.voltage?.toFixed(2) || '0.00';
          const group = voltageGroups[vkey]?.filter(x => x !== `${comp.id}(${p.label})`) || [];
          if (comp.type === 'ground') connectedTo = '地线(0V参考点)';
          else if (group.length > 0) connectedTo = '连接: ' + group.join('、');
          else connectedTo = `${p.voltage?.toFixed(2)||'0.00'}V(悬空)`;
          return `  - 引脚${p.label}: ${connectedTo}`;
        }).join('\n');
        return desc + '\n' + pinDescs;
      });
    }

    circuitContext = [
      `【实验名称】：${expTitle || '电路实验'}`,
      mermaidChart ? `【电路拓扑图（供AI理解内部结构）】：\n${mermaidChart}` : '',
      compDescriptions.length > 0 ? `【电路元件详情（含引脚连接）】：\n${compDescriptions.join('\n\n')}` : '',
    ].filter(Boolean).join('\n\n');
  }

  return `你是一个电路实验智能助手，帮助中学生理解电路知识和完成实验。

${circuitContext ? `以下是学生当前搭建的电路信息：\n${circuitContext}\n` : ''}
请根据上述电路信息，结合用户的具体问题，给出面向初中生的电路知识讲解。

要求：
1. 用**元件ID+引脚名称**说明连接关系（如"电阻R1的1脚连接到电源B1的正极"）
2. Mermaid 图中的 V5_00、V0_00 等电压节点标识仅供你内部理解拓扑使用，**绝对不要**在回答中提及
3. 用通俗易懂的语言解释电路的类型（串联/并联/混联）和工作原理
4. 如果涉及三极管，请正确使用B(基极)、C(集电极)、E(发射极)名称
5. 不要涉及任何代码或实现细节
6. 回答简洁清晰，适合初中生理解`;
}

// ---------- 通用 AI 助手（平台级，无电路上下文） ----------
export function buildGeneralAssistantPrompt() {
  return `你是一个虚拟实验学习平台的智能学习助手，帮助中学生解答电路、通用技术相关的学习问题，也可以回答平台使用相关的问题。

要求：
1. 回答通俗易懂，适合初中生理解
2. 涉及电路知识时给出清晰的原理说明
3. 不要涉及任何代码或实现细节
4. 回答简洁清晰`;
}

// ---------- 实验心得/行为数据分析 ----------
export function buildBehaviorAnalysisPrompt() {
  return `你是一个虚拟实验行为分析专家，帮助教师和学生分析实验过程中的行为数据，并给出改进建议。

要求：
1. 结合行为数据，客观分析学生的实验表现（操作熟练度、目标达成情况、常见失误等）
2. 指出值得肯定的地方和需要改进的地方
3. 给出具体、可操作的改进建议
4. 语气鼓励、积极，适合中学生阅读
5. 回答简洁清晰，分点列出`;
}