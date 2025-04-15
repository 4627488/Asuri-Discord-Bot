const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // 处理按钮点击
        if (interaction.isButton()) {
        // 处理询问贡献者按钮
        if (interaction.customId.startsWith('ask_contribute_')) {
            const contributorManager = require('../utils/contributorManager');
            const parts = interaction.customId.split('_');
            const channelId = parts[2];
            const userId = parts[3];
            
            // 确认触发交互的用户是目标用户
            if (interaction.user.id !== userId) {
            return interaction.reply({
                content: '❌ 这个按钮不是为您准备的。',
                ephemeral: true
            });
            }
            
            // 获取当前频道的贡献者列表
            const contributors = await contributorManager.getChannelContributors(channelId);
            let contributorMessage = '';
            
            if (contributors.length > 0) {
                // 提取贡献者用户名并格式化为列表
                const contributorNames = contributors.map(c => c.username.split('#')[0]).join('、');
                contributorMessage = `当前已有的贡献者：${contributorNames}\n\n`;
            }
            
            // 获取频道信息
            const channel = await client.channels.fetch(channelId).catch(() => null);
            const channelName = channel ? channel.name : '此频道';
            
            // 无论用户后续是否做出选择，立即标记用户为已询问状态
            await contributorManager.markAsAsked(channelId, userId);
            
            // 创建回应按钮
            const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId(`contribute_yes_${channelId}_${userId}`)
                .setLabel('是')
                .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                .setCustomId(`contribute_no_${channelId}_${userId}`)
                .setLabel('不再提示')
                .setStyle(ButtonStyle.Secondary)
            );
            
            // 发送只有触发用户可见的消息（ephemeral: true）
            await interaction.reply({
                content: `${contributorMessage}您是第一次在${channelName}发言，是否将自己添加至贡献列表？`,
                components: [row],
                ephemeral: true
            });
            
            return;
        }
        
        // 处理贡献者按钮
        if (interaction.customId.startsWith('contribute_')) {
            const contributorManager = require('../utils/contributorManager');
            const parts = interaction.customId.split('_');
            const choice = parts[1]; // yes 或 no
            const channelId = parts[2];
            const userId = parts[3];
            
            // 获取频道信息
            const channel = await client.channels.fetch(channelId).catch(() => null);
            const channelName = channel ? channel.name : '未知频道';
            
            // // 更新原始消息，移除按钮
            // if (interaction.message) {
            //     try {
            //         await interaction.message.edit({
            //             components: []
            //         });
            //     } catch (err) {
            //         console.error('无法更新消息移除按钮:', err);
            //     }
            // }
            
            if (choice === 'yes') {
                // 用户选择添加到贡献列表
                const added = await contributorManager.addContributor(
                    channelId, 
                    interaction.user.id, 
                    interaction.user.tag
                );
            
                if (added) {
                    // 使用公开回复，而不是仅用户可见的ephemeral消息
                    await interaction.reply({ 
                        content: `✅ ${interaction.user} 已添加到题目 **${channelName}** 的贡献列表！`,
                    });
                } else {
                    await interaction.reply({ 
                        content: `ℹ️ ${interaction.user} 已经在题目 **${channelName}** 的贡献列表中了。`,
                    });
                }
            } else {
                // 用户选择不添加，删除ephemeral消息
                await interaction.update({
                    content: `❎ 已取消添加到贡献列表，不再提示。`,
                    components: [],
                }).catch(err => {
                    console.error('无法更新消息:', err);
                });
            }
            
            return;
        }
        }
        
        // 处理斜杠命令交互
        if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`未找到命令 ${interaction.commandName}`);
            // 检查交互是否已回复
            if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: '找不到此命令！', ephemeral: true })
                .catch(error => console.error('回复交互失败:', error));
            }
            return;
        }

        try {
            // 执行命令
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`执行命令时出错: ${interaction.commandName}`);
            console.error(error);

            try {
            // 检查交互是否已过期（3秒是Discord的交互超时时间）
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 3000) {
                console.log(`交互已过期 (${interactionAge}ms)，无法回复`);
                return;
            }

            // 根据交互状态选择适当的响应方法
            if (interaction.replied) {
                // 如果已回复，使用followUp
                await interaction.followUp({ 
                content: '执行命令时出现了错误！', 
                ephemeral: true 
                });
            } else if (interaction.deferred) {
                // 如果已延迟但未回复，使用editReply
                await interaction.editReply({
                content: '执行命令时出现了错误！'
                });
            } else {
                // 如果尚未响应，使用reply
                await interaction.reply({ 
                content: '执行命令时出现了错误！', 
                ephemeral: true 
                });
            }
            } catch (followUpError) {
            // 如果处理错误的尝试也失败了
            console.error('尝试发送错误消息时失败:', followUpError);
            }
        }
        }
    },
};