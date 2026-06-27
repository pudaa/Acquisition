import { db } from '../config/db.js';

const componentLabelMap = {
  wire: '导线', battery: '电源', ground: '接地', switch: '开关',
  resistor: '电阻', capacitor: '电容', bulb: '灯泡', diode: '二极管',
  'transistor-npn': 'NPN三极管', 'transistor-pnp': 'PNP三极管',
  'and-gate': '与门', 'or-gate': '或门', 'not-gate': '非门',
  'nand-gate': '与非门', 'nor-gate': '或非门',
};

// 引擎类型名 → elements 表 ID 映射
const typeToElementId = {
  wire: 1, switch: 2, bulb: 3, resistor: 4, capacitor: 5,
  diode: 6, 'transistor-npn': 7, 'transistor-pnp': 8,
  battery: 9, ground: 10, 'and-gate': 11, 'or-gate': 12,
  'not-gate': 13, 'nand-gate': 14, 'nor-gate': 15,
};

// 实验 1-6 的配置定义（使用内联 presetCircuit + workflow 格式目标）
const experimentConfigs = {
  1: {
    availableComponents: [
      'wire', 'battery', 'ground', 'switch', 'resistor',
      'capacitor', 'bulb', 'transistor-npn',
      'and-gate', 'or-gate', 'not-gate', 'nand-gate', 'nor-gate',
    ],
    wireStyle: 'smart',
    presetCircuit: null,
    goals: [
      {
        id: 'GOAL_BULB_LIT', title: '成功让灯泡发光', weight: 2,
        type: 'workflow',
        workflow: [
          { action: 'find_component', type: 'bulb', store: 'bulbs' },
          { action: 'count', source: '$bulbs', store: 'bulbCount' },
          { action: 'compare', operator: '>=', left: '$bulbCount', right: 1, store: 'hasBulb' },
          { action: 'read_property', source: '$bulbs[0]', property: 'lit', store: 'isLit' },
          { action: 'assert', source: '$isLit', title: '灯泡已发光' },
        ],
      },
      {
        id: 'GOAL_RESISTOR_1', title: '使用一个电阻', weight: 1,
        type: 'workflow',
        trigger: 'component:add:resistor',
        workflow: [
          { action: 'find_component', type: 'resistor', store: 'resistors' },
          { action: 'count', source: '$resistors', store: 'count' },
          { action: 'compare', operator: '>=', left: '$count', right: 1, store: 'enough' },
          { action: 'assert', source: '$enough', title: '已使用一个电阻' },
        ],
      },
      {
        id: 'GOAL_BASIC_DONE', title: '完成基础电路搭建', weight: 1,
        type: 'workflow',
        trigger: 'component:add', // 放置任何元件时触发
        workflow: [
          { action: 'find_component', type: 'battery', store: 'battery' },
          { action: 'find_component', type: 'ground', store: 'ground' },
          { action: 'count', source: '$battery', store: 'batCount' },
          { action: 'count', source: '$ground', store: 'gndCount' },
          { action: 'compare', operator: '>=', left: '$batCount', right: 1, store: 'hasBat' },
          { action: 'compare', operator: '>=', left: '$gndCount', right: 1, store: 'hasGnd' },
          { action: 'and', sources: ['$hasBat', '$hasGnd'], store: 'allReady' },
          { action: 'assert', source: '$allReady', title: '已完成基础电路搭建' },
        ],
      },
    ],
  },
  2: {
    availableComponents: [
      'wire', 'battery', 'ground', 'switch', 'resistor',
      'capacitor', 'bulb', 'transistor-npn',
    ],
    wireStyle: 'direct',
    presetCircuit: {
      components: [
        { type: 'battery', xGrid: 2, yGrid: 5, id: 'B1' },
        { type: 'switch', xGrid: 5, yGrid: 5, id: 'SW1', state: 'closed' },
        { type: 'bulb', xGrid: 8, yGrid: 5, id: 'L1', value: 100 },
        { type: 'ground', xGrid: 10, yGrid: 5, id: 'GND1' },
      ],
    },
    goals: [
      {
        id: 'GOAL_BULB_LIT', title: '成功让灯泡发光', weight: 2,
        type: 'workflow',
        workflow: [
          { action: 'find_component', type: 'bulb', store: 'bulbs' },
          { action: 'read_property', source: '$bulbs', property: 'lit', store: 'isLit' },
          { action: 'assert', source: '$isLit', title: '灯泡已发光' },
        ],
      },
    ],
  },
  3: {
    availableComponents: [
      'wire', 'battery', 'ground', 'resistor',
      'capacitor', 'transistor-npn', 'transistor-pnp',
    ],
    wireStyle: 'direct',
    presetCircuit: {
      components: [
        { type: 'battery', xGrid: 2, yGrid: 5, id: 'B1' },
        { type: 'resistor', xGrid: 5, yGrid: 5, id: 'R1', value: 1000 },
        { type: 'capacitor', xGrid: 8, yGrid: 5, id: 'C1', value: 100 },
        { type: 'transistor-npn', xGrid: 11, yGrid: 5, id: 'Q1', beta: 100 },
        { type: 'ground', xGrid: 11, yGrid: 7, id: 'GND1' },
      ],
    },
    goals: [
      {
        id: 'GOAL_BULB_LIT', title: '成功让灯泡发光', weight: 2,
        type: 'workflow',
        workflow: [
          { action: 'find_component', type: 'bulb', store: 'bulbs' },
          { action: 'read_property', source: '$bulbs', property: 'lit', store: 'isLit' },
          { action: 'assert', source: '$isLit', title: '灯泡已发光' },
        ],
      },
    ],
  },
  4: {
    availableComponents: [
      'wire', 'battery', 'ground', 'resistor',
      'capacitor', 'transistor-npn',
    ],
    wireStyle: 'smart',
    presetCircuit: {
      components: [
        { type: 'battery', xGrid: 2, yGrid: 5, id: 'B1' },
        { type: 'switch', xGrid: 5, yGrid: 5, id: 'SW1', state: 'closed' },
        { type: 'resistor', xGrid: 8, yGrid: 5, id: 'R1', value: 1000 },
        { type: 'transistor-npn', xGrid: 11, yGrid: 5, id: 'Q1', beta: 100 },
        { type: 'resistor', xGrid: 11, yGrid: 3, id: 'R2', value: 100 },
        { type: 'bulb', xGrid: 14, yGrid: 5, id: 'L1', value: 100 },
        { type: 'ground', xGrid: 14, yGrid: 7, id: 'GND1' },
      ],
    },
    goals: [
      {
        id: 'GOAL_BULB_LIT', title: '成功让灯泡发光', weight: 2,
        type: 'workflow',
        workflow: [
          { action: 'find_component', type: 'bulb', store: 'bulbs' },
          { action: 'read_property', source: '$bulbs', property: 'lit', store: 'isLit' },
          { action: 'assert', source: '$isLit', title: '灯泡已发光' },
        ],
      },
      { id: 'GOAL_NOT_GATE', type: 'not_gate', title: '非门模拟', weight: 3,
        config: { switchId: 'SW1', bulbId: 'L1' } },
    ],
  },
  5: {
    availableComponents: [
      'wire', 'battery', 'ground', 'resistor',
      'capacitor', 'transistor-npn',
    ],
    wireStyle: 'smart',
    presetCircuit: {
      components: [
        { type: 'battery', xGrid: 2, yGrid: 6, id: 'B1' },
        { type: 'switch', xGrid: 5, yGrid: 5, id: 'SW1', state: 'open' },
        { type: 'switch', xGrid: 5, yGrid: 7, id: 'SW2', state: 'open' },
        { type: 'nand-gate', xGrid: 9, yGrid: 5, id: 'U1' },
        { type: 'nand-gate', xGrid: 9, yGrid: 7, id: 'U2' },
        { type: 'resistor', xGrid: 13, yGrid: 5, id: 'R1', value: 100 },
        { type: 'bulb', xGrid: 16, yGrid: 6, id: 'L1', value: 100 },
        { type: 'ground', xGrid: 16, yGrid: 8, id: 'GND1' },
      ],
    },
    goals: [
      { id: 'GOAL_RS_LATCH', type: 'rs_latch', title: 'RS 触发器搭建', weight: 4,
        config: { switchIds: ['SW1', 'SW2'], bulbId: 'L1', minGates: 2 } },
    ],
  },
  6: {
    availableComponents: [
      'wire', 'battery', 'ground', 'switch', 'resistor',
      'capacitor', 'bulb', 'diode', 'transistor-npn',
      'and-gate', 'or-gate', 'not-gate', 'nand-gate', 'nor-gate',
    ],
    wireStyle: 'smart',
    presetCircuit: {
      components: [
        { type: 'battery', xGrid: 2, yGrid: 6, id: 'B1' },
        { type: 'resistor', xGrid: 5, yGrid: 4, id: 'R1', value: 1000 },
        { type: 'resistor', xGrid: 5, yGrid: 8, id: 'R2', value: 1000 },
        { type: 'resistor', xGrid: 8, yGrid: 4, id: 'R3', value: 100 },
        { type: 'resistor', xGrid: 8, yGrid: 8, id: 'R4', value: 100 },
        { type: 'capacitor', xGrid: 11, yGrid: 4, id: 'C1', value: 100 },
        { type: 'capacitor', xGrid: 11, yGrid: 8, id: 'C2', value: 100 },
        { type: 'transistor-npn', xGrid: 14, yGrid: 4, id: 'Q1', beta: 100 },
        { type: 'transistor-npn', xGrid: 14, yGrid: 8, id: 'Q2', beta: 100 },
        { type: 'bulb', xGrid: 17, yGrid: 4, id: 'L1', value: 100 },
        { type: 'bulb', xGrid: 17, yGrid: 8, id: 'L2', value: 100 },
        { type: 'ground', xGrid: 14, yGrid: 10, id: 'GND1' },
      ],
    },
    goals: [
      { id: 'GOAL_OSCILLATOR', type: 'multivibrator', title: '完成多谐振荡器的搭建', weight: 3, config: {} },
      {
        id: 'GOAL_BULB_LIT', title: '成功让灯泡发光', weight: 1,
        type: 'workflow',
        workflow: [
          { action: 'find_component', type: 'bulb', store: 'bulbs' },
          { action: 'count', source: '$bulbs', store: 'bulbCount' },
          { action: 'compare', operator: '>=', left: '$bulbCount', right: 1, store: 'hasBulb' },
          { action: 'read_property', source: '$bulbs[0]', property: 'lit', store: 'isLit1' },
          { action: 'read_property', source: '$bulbs[1]', property: 'lit', store: 'isLit2' },
          { action: 'or', sources: ['$isLit1', '$isLit2'], store: 'anyLit' },
          { action: 'assert', source: '$anyLit', title: '灯泡已发光' },
        ],
      },
      {
        id: 'GOAL_RESISTOR_4', title: '使用不少于4个电阻', weight: 1,
        type: 'workflow',
        trigger: 'component:add:resistor', // 放置电阻时触发
        workflow: [
          { action: 'find_component', type: 'resistor', store: 'resistors' },
          { action: 'count', source: '$resistors', store: 'count' },
          { action: 'compare', operator: '>=', left: '$count', right: 4, store: 'enough' },
          { action: 'assert', source: '$enough', title: '已使用不少于4个电阻' },
        ],
      },
    ],
  },
};

async function seedExperimentConfigs() {
  console.log('开始填充实验配置...\n');

  for (const [expId, config] of Object.entries(experimentConfigs)) {
    try {
      // 检查实验是否存在
      const [experiment] = await db.query(
        'SELECT exp_id, title FROM experiments WHERE exp_id = ?',
        [expId]
      );

      if (!experiment) {
        console.log(`  [跳过] 实验 ${expId} 不存在于数据库中`);
        continue;
      }

      // 检查是否已有配置
      const [existing] = await db.query(
        'SELECT id FROM experiment_configs WHERE exp_id = ?',
        [expId]
      );

      const configJson = JSON.stringify(config);

      // 从 config.goals 生成 experiments.steps
      const steps = {
        steps: (config.goals || []).map((g, i) => ({
          id: g.id.toLowerCase().replace(/_/g, '-').replace(/^goal-/, '') || `step_${i + 1}`,
          title: g.title,
          action: g.id,
          weight: g.weight || 1,
          done: false,
        })),
      };
      // 从 availableComponents 生成 experiments.element
      const element = (config.availableComponents || [])
        .map(type => typeToElementId[type])
        .filter(id => id != null);

      if (existing) {
        await db.query(
          'UPDATE experiment_configs SET config = ? WHERE exp_id = ?',
          [configJson, expId]
        );
        console.log(`  [更新] 实验 ${expId} - ${experiment.title}`);
      } else {
        await db.query(
          'INSERT INTO experiment_configs (exp_id, config) VALUES (?, ?)',
          [expId, configJson]
        );
        console.log(`  [创建] 实验 ${expId} - ${experiment.title}`);
      }

      // 同步更新 experiments 表的 steps 和 element 字段
      await db.query(
        'UPDATE experiments SET steps = ?, element = ? WHERE exp_id = ?',
        [JSON.stringify(steps), JSON.stringify(element), expId]
      );
      console.log(`  [同步] experiments.steps 和 element 已更新`);
    } catch (error) {
      console.error(`  [错误] 实验 ${expId}:`, error.message);
    }
  }

  console.log('\n填充完成！');
  process.exit(0);
}

seedExperimentConfigs().catch(err => {
  console.error('填充失败:', err);
  process.exit(1);
});
