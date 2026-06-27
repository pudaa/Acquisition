export function calculateProbabilities(masteryScore) {
    const base = {
        high: 0.2,
        medium: 0.4,
        low: 0.4
    };
    
    // 根据掌握度调整概率
    let high = base.high + (masteryScore / 100) * 0.4;
    let medium = base.medium + Math.sin((masteryScore / 100) * Math.PI) * 0.2; 
    let low = Math.max(0.1, base.low - (masteryScore / 100) * 0.4); 
    
    const total = high + medium + low;
    return {
        high: high / total,
        medium: medium / total,
        low: low / total
    };
}

// 根据概率选择难度
export function selectDifficulty(probabilities) {
    const rand = Math.random();
    let sum = 0;
    for (const [difficulty, prob] of Object.entries(probabilities)) {
        sum += prob;
        if (rand <= sum) return difficulty;
    }
    return 'medium'; 
}

// 更新掌握度分数
export function updateMasteryScore(currentScore, questionWeight, isCorrect) {
    const baseImpact = questionWeight;
    
    const impact = isCorrect 
        ? baseImpact * (2 - currentScore/100) 
        : -baseImpact * (currentScore/100); 
    
    return Math.min(100, Math.max(0, currentScore + impact));
}