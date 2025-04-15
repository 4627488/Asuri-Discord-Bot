const fs = require('fs').promises;
const path = require('path');

// 消费数据存储路径
const DATA_DIR = path.join(__dirname, '../../data');
const MONEY_FILE = path.join(DATA_DIR, 'money.json');

/**
 * 确保数据目录存在
 */
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('创建数据目录失败:', error);
        }
    }
}

/**
 * 读取消费数据
 * @returns {Promise<Object>} 包含所有用户消费数据的对象
 */
async function getMoneyData() {
    await ensureDataDir();
    
    try {
        const data = await fs.readFile(MONEY_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，返回空对象
            return { users: {}, summary: { totalCost: 0, totalMessages: 0 } };
        }
        console.error('读取消费数据失败:', error);
        return { users: {}, summary: { totalCost: 0, totalMessages: 0 } };
    }
}

/**
 * 保存消费数据
 * @param {Object} data 要保存的数据对象
 * @returns {Promise<boolean>} 保存是否成功
 */
async function saveMoneyData(data) {
    await ensureDataDir();
    
    try {
        await fs.writeFile(MONEY_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存消费数据失败:', error);
        return false;
    }
}

/**
 * 记录用户消费
 * @param {string} userId 用户ID
 * @param {string} username 用户名
 * @param {number} cost 本次消费金额
 * @param {string} modelName 使用的模型名称
 * @param {Object} details 消费详情（可选）
 * @returns {Promise<Object>} 用户的最新消费数据
 */
async function recordCost(userId, username, cost, modelName, details = {}) {
    const moneyData = await getMoneyData();
    
    // 初始化用户数据（如果不存在）
    if (!moneyData.users[userId]) {
        moneyData.users[userId] = {
            id: userId,
            username: username,
            totalCost: 0,
            messageCount: 0,
            history: []
        };
    }
    
    // 更新用户名（可能已更改）
    moneyData.users[userId].username = username;
    
    // 创建消费记录
    const record = {
        timestamp: new Date().toISOString(),
        cost: cost,
        model: modelName,
        ...details
    };
    
    // 更新用户数据
    moneyData.users[userId].totalCost += cost;
    moneyData.users[userId].messageCount += 1;
    moneyData.users[userId].history.push(record);
    
    // 如果历史记录过多，只保留最近的100条
    if (moneyData.users[userId].history.length > 100) {
        moneyData.users[userId].history = moneyData.users[userId].history.slice(-100);
    }
    
    // 更新总计
    moneyData.summary.totalCost += cost;
    moneyData.summary.totalMessages += 1;
    
    // 保存数据
    await saveMoneyData(moneyData);
    
    return moneyData.users[userId];
}

/**
 * 获取单个用户的消费数据
 * @param {string} userId 用户ID
 * @returns {Promise<Object|null>} 用户的消费数据，不存在则返回null
 */
async function getUserCost(userId) {
    const moneyData = await getMoneyData();
    return moneyData.users[userId] || null;
}

/**
 * 获取所有用户的消费数据
 * @param {number} [limit=10] 返回的最多用户数量
 * @param {string} [sortBy='totalCost'] 排序依据，可选：'totalCost'或'messageCount'
 * @returns {Promise<Object>} 包含用户列表和汇总信息的对象
 */
async function getAllUsersCost(limit = 10, sortBy = 'totalCost') {
    const moneyData = await getMoneyData();
    
    // 提取用户列表并排序
    const usersList = Object.values(moneyData.users);
    
    usersList.sort((a, b) => {
        if (sortBy === 'messageCount') {
            return b.messageCount - a.messageCount;
        } else {
            // 默认按消费金额排序
            return b.totalCost - a.totalCost;
        }
    });
    
    return {
        users: usersList.slice(0, limit),
        summary: moneyData.summary,
        total: usersList.length
    };
}

module.exports = {
    recordCost,
    getUserCost,
    getAllUsersCost
};