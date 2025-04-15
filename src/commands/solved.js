const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const contributorManager = require('../utils/contributorManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solved')
        .setDescription('将当前频道标记为已解决，并更改频道名称'),
        // 移除了 setDefaultMemberPermissions，允许所有用户使用此命令
    
    async execute(interaction) {
        // 获取当前频道
        const channel = interaction.channel;
        const originalChannelName = channel.name;
        
        // 检查频道是否已经标记为solved
        if (originalChannelName.startsWith('solved-')) {
            return interaction.reply({
                content: '❌ 该频道已经被标记为已解决！',
                ephemeral: true
            });
        }
        
        // 检查机器人是否有足够权限
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ 我没有管理频道的权限，无法更改频道名称！',
                ephemeral: true
            });
        }
        
        // 延迟回复，以便有时间处理频道更名和获取贡献者列表
        await interaction.deferReply();
        
        try {
            // 构建新的频道名称
            const newChannelName = `solved-${originalChannelName}`;
            
            // 检查新名称长度是否符合Discord要求（2-100字符）
            if (newChannelName.length > 100) {
                return interaction.editReply({
                    content: '❌ 更改后的频道名称超过了Discord的长度限制。'
                });
            }
            
            // 记录谁使用了该命令
            const commandUser = interaction.user.tag;
            
            // 获取该频道的贡献者列表
            const contributors = await contributorManager.getChannelContributors(channel.id);
            
            // 更改频道名称
            await channel.setName(newChannelName, `题目已解决 (由 ${commandUser} 标记)`);
            
            // 准备恭喜消息
            let congratsMessage = `🎉 恭喜！题目「${originalChannelName}」已被 ${interaction.user} 标记为解出！`;
            
            // 如果有贡献者，添加贡献者感谢信息
            if (contributors.length > 0) {
                // 从贡献者数组中提取用户名列表
                const contributorNames = contributors.map(contributor => {
                    // 尝试将用户ID转换为提及格式
                    return `<@${contributor.id}>`;
                });
                
                // 根据贡献者数量构建不同的消息
                if (contributorNames.length === 1) {
                    congratsMessage += `\n\n感谢以下成员的付出：${contributorNames[0]}`;
                } else {
                    // 使用适当的分隔符将贡献者名称连接起来
                    const lastContributor = contributorNames.pop();
                    congratsMessage += `\n\n感谢以下成员的付出：${contributorNames.join('、')}${contributorNames.length ? '、' : ''}${lastContributor}`;
                }
            }
            
            // 发送带有贡献者信息的恭喜消息
            await interaction.editReply(congratsMessage);
            
            // 等待一小段时间确保频道名称更新完成
            setTimeout(async () => {
                try {
                    // 检查是否真的改名成功
                    const updatedChannel = await interaction.guild.channels.fetch(channel.id);
                    if (updatedChannel.name === newChannelName) {
                        await interaction.followUp({
                            content: `✅ 频道名称已成功更改为 \`${newChannelName}\``,
                            ephemeral: true
                        });
                    } else {
                        await interaction.followUp({
                            content: `⚠️ 频道名称可能未成功更改，请检查权限或手动修改。`,
                            ephemeral: true
                        });
                    }
                } catch (err) {
                    console.error('检查频道更新时出错:', err);
                }
            }, 2000);
            
        } catch (error) {
            console.error('无法更改频道名称:', error);
            await interaction.editReply({
                content: '❌ 无法更改频道名称，请检查机器人是否有足够的权限。错误详情：' + error.message
            });
        }
    },
};