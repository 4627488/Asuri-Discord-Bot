const fs = require('fs').promises;
const path = require('path');

// 贡献者数据存储路径
const DATA_DIR = path.join(__dirname, '../../data');
const CONTRIBUTORS_FILE = path.join(DATA_DIR, 'contributors.json');

// 清理阈值：3天（毫秒）
const CLEANUP_THRESHOLD = 3 * 24 * 60 * 60 * 1000;

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('创建数据目录失败:', error);
        }
    }
}

// 读取贡献者数据
async function getContributors() {
    await ensureDataDir();
    
    try {
        const data = await fs.readFile(CONTRIBUTORS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，返回空对象
            return {};
        }
        console.error('读取贡献者数据失败:', error);
        return {};
    }
}

// 保存贡献者数据
async function saveContributors(data) {
    await ensureDataDir();
    
    try {
        await fs.writeFile(CONTRIBUTORS_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存贡献者数据失败:', error);
        return false;
    }
}

// 添加贡献者到频道
async function addContributor(channelId, userId, username) {
    const contributors = await getContributors();
    
    if (!contributors[channelId]) {
        contributors[channelId] = [];
    }
    
    // 检查用户是否已经在贡献者列表中
    const exists = contributors[channelId].some(contributor => contributor.id === userId);
    
    if (!exists) {
        contributors[channelId].push({ 
            id: userId, 
            username: username,
            addedAt: new Date().toISOString() 
        });
        await saveContributors(contributors);
    }
    
    return !exists; // 返回是否为新添加
}

// 获取频道的贡献者列表
async function getChannelContributors(channelId) {
    const contributors = await getContributors();
    return contributors[channelId] || [];
}

// 检查用户是否已经询问过是否添加到贡献列表
async function hasBeenAsked(channelId, userId) {
    const contributors = await getContributors();
    
    // 创建或获取已询问用户的记录
    if (!contributors._askedUsers) {
        contributors._askedUsers = {};
    }
    
    if (!contributors._askedUsers[channelId]) {
        contributors._askedUsers[channelId] = [];
    }
    
    return contributors._askedUsers[channelId].includes(userId);
}

// 标记用户为已询问状态
async function markAsAsked(channelId, userId) {
    const contributors = await getContributors();
    
    // 创建或获取已询问用户的记录
    if (!contributors._askedUsers) {
        contributors._askedUsers = {};
    }
    
    if (!contributors._askedUsers[channelId]) {
        contributors._askedUsers[channelId] = [];
    }
    
    // 检查是否已经包含用户ID
    if (!contributors._askedUsers[channelId].includes(userId)) {
        contributors._askedUsers[channelId].push(userId);
        await saveContributors(contributors);
        return true;
    }
    
    return false; // 用户已经被标记为询问过
}

// 记录频道的最后活跃时间
async function updateChannelActivity(channelId) {
    const contributors = await getContributors();
    
    // 创建或获取频道活跃记录
    if (!contributors._channelActivity) {
        contributors._channelActivity = {};
    }
    
    // 更新最后活跃时间
    contributors._channelActivity[channelId] = Date.now();
    await saveContributors(contributors);
}

// 清理长时间不活跃的频道数据
async function cleanupInactiveChannels() {
    const contributors = await getContributors();
    const now = Date.now();
    let isChanged = false;
    
    // 如果没有活跃记录，则创建一个
    if (!contributors._channelActivity) {
        contributors._channelActivity = {};
        isChanged = true;
    }
    
    // 遍历所有频道
    const channelIds = Object.keys(contributors).filter(
        key => !key.startsWith('_') // 排除特殊字段
    );
    
    for (const channelId of channelIds) {
        const lastActivity = contributors._channelActivity[channelId] || 0;
        const inactiveDuration = now - lastActivity;
        
        // 如果超过阈值（3天），清除该频道数据
        if (inactiveDuration > CLEANUP_THRESHOLD) {
            console.log(`频道 ${channelId} 已超过3天无活动，清理其贡献者数据`);
            
            // 删除该频道的贡献者记录
            delete contributors[channelId];
            
            // 删除询问记录
            if (contributors._askedUsers && contributors._askedUsers[channelId]) {
                delete contributors._askedUsers[channelId];
            }
            
            // 删除活跃记录
            if (contributors._channelActivity[channelId]) {
                delete contributors._channelActivity[channelId];
            }
            
            isChanged = true;
        }
    }
    
    // 如果有数据变更，保存更新
    if (isChanged) {
        await saveContributors(contributors);
        return true;
    }
    
    return false;
}

module.exports = {
    getContributors,
    addContributor,
    getChannelContributors,
    hasBeenAsked,
    markAsAsked,
    updateChannelActivity,
    cleanupInactiveChannels
};