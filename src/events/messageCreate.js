const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const contributorManager = require('../utils/contributorManager');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 忽略机器人消息
        if (message.author.bot) return;
        
        // 忽略私聊消息
        if (!message.guild) return;
        
        // 获取频道ID和用户ID
        const channelId = message.channel.id;
        const userId = message.author.id;
        
        try {
            // 更新频道最后活跃时间
            await contributorManager.updateChannelActivity(channelId);
            
            // 检查用户是否已经被询问过
            const alreadyAsked = await contributorManager.hasBeenAsked(channelId, userId);
            
            // 如果用户还没被询问过，发送提示
            if (!alreadyAsked) {
                // 创建按钮，点击后立即触发交互
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                        .setCustomId(`ask_contribute_${channelId}_${userId}`)
                        .setLabel('点击查看贡献者相关信息')
                        .setStyle(ButtonStyle.Primary)
                    );
                
                // 发送一条消息，引导用户点击按钮
                const sentMessage = await message.reply({
                    content: `${message.author}，这是您首次在此频道发言，点击下方按钮查看相关信息。`,
                    ephemeral: true,
                    components: [row]
                }).catch(error => {
                    console.error(`无法在频道回复用户 ${message.author.tag}:`, error);
                    return null;
                });
                
                // 如果消息发送成功，立即将用户标记为已询问过，无论用户是否点击按钮
                if (sentMessage) {
                    await contributorManager.markAsAsked(channelId, userId);
                    console.log(`用户 ${message.author.tag} 在频道 ${channelId} 已被标记为询问过`);
                }
            }
        } catch (error) {
            console.error('处理消息事件时出错:', error);
        }
    }
};