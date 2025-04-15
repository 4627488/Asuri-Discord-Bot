const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moneyManager = require('../utils/moneyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money')
        .setDescription('查询API使用费用')
        .addSubcommand(subcommand => 
            subcommand
                .setName('me')
                .setDescription('查询自己的消费情况')
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('top')
                .setDescription('查看消费排行榜')
                .addIntegerOption(option => 
                    option
                        .setName('count')
                        .setDescription('显示的用户数量（默认为10）')
                        .setMinValue(1)
                        .setMaxValue(30)
                )
                .addStringOption(option => 
                    option
                        .setName('sort')
                        .setDescription('排序依据')
                        .addChoices(
                            { name: '按消费金额', value: 'totalCost' },
                            { name: '按使用次数', value: 'messageCount' }
                        )
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('user')
                .setDescription('查询特定用户的消费情况（仅限管理员）')
                .addUserOption(option => 
                    option
                        .setName('user')
                        .setDescription('要查询的用户')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            // 查询自己的消费情况
            if (subcommand === 'me') {
                const userId = interaction.user.id;
                const userData = await moneyManager.getUserCost(userId);
                
                if (!userData || userData.totalCost === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('消费查询')
                        .setColor('#FFA500')
                        .setDescription('您还没有使用过AI聊天功能，无消费记录。');
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
                
                // 获取最近5条使用记录
                const recentHistory = userData.history.slice(-5).reverse();
                
                const embed = new EmbedBuilder()
                    .setTitle('您的AI聊天消费情况')
                    .setColor('#00BFFF')
                    .addFields([
                        { name: '总消费金额', value: `¥${userData.totalCost.toFixed(6)}`, inline: true },
                        { name: '使用次数', value: `${userData.messageCount}次`, inline: true },
                        { name: '平均每次', value: `¥${(userData.totalCost / userData.messageCount).toFixed(6)}`, inline: true }
                    ])
                    .setFooter({ text: `用户ID: ${userId}` });
                
                // 添加最近使用记录
                if (recentHistory.length > 0) {
                    const historyText = recentHistory.map(record => {
                        const date = new Date(record.timestamp);
                        const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                        return `${formattedDate} | ${record.model} | ¥${record.cost.toFixed(6)} | ${record.prompt}`;
                    }).join('\n');
                    
                    embed.addFields([
                        { name: '最近5次使用记录', value: '```\n日期 | 模型 | 费用 | 问题\n' + historyText + '\n```' }
                    ]);
                }
                
                await interaction.editReply({ embeds: [embed] });
            }
            // 查看消费排行榜
            else if (subcommand === 'top') {
                const count = interaction.options.getInteger('count') || 10;
                const sortBy = interaction.options.getString('sort') || 'totalCost';
                
                const result = await moneyManager.getAllUsersCost(count, sortBy);
                
                if (result.users.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('消费排行榜')
                        .setColor('#FFA500')
                        .setDescription('目前还没有任何消费记录。');
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('AI聊天消费排行榜')
                    .setColor('#00BFFF')
                    .setDescription(`排序依据: ${sortBy === 'totalCost' ? '消费金额' : '使用次数'}`)
                    .setFooter({ text: `总计: ${result.total}个用户 | 总消费: ¥${result.summary.totalCost.toFixed(6)} | 总次数: ${result.summary.totalMessages}次` });
                
                // 添加排行榜信息
                result.users.forEach((user, index) => {
                    embed.addFields([
                        { 
                            name: `#${index + 1} ${user.username.split('#')[0]}`,
                            value: `消费: ¥${user.totalCost.toFixed(6)} | 次数: ${user.messageCount}次`,
                            inline: false 
                        }
                    ]);
                });
                
                await interaction.editReply({ embeds: [embed] });
            }
            // 查询特定用户的消费情况（仅限管理员）
            else if (subcommand === 'user') {
                // 检查权限
                if (!interaction.memberPermissions?.has('ADMINISTRATOR') && !interaction.memberPermissions?.has('MANAGE_GUILD')) {
                    const embed = new EmbedBuilder()
                        .setTitle('权限不足')
                        .setColor('#FF0000')
                        .setDescription('只有管理员可以查询其他用户的消费情况。');
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
                
                const targetUser = interaction.options.getUser('user');
                const userData = await moneyManager.getUserCost(targetUser.id);
                
                if (!userData || userData.totalCost === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('消费查询')
                        .setColor('#FFA500')
                        .setDescription(`${targetUser.username} 还没有使用过AI聊天功能，无消费记录。`);
                    
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }
                
                // 获取最近5条使用记录
                const recentHistory = userData.history.slice(-5).reverse();
                
                const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.username} 的AI聊天消费情况`)
                    .setColor('#00BFFF')
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields([
                        { name: '总消费金额', value: `¥${userData.totalCost.toFixed(6)}`, inline: true },
                        { name: '使用次数', value: `${userData.messageCount}次`, inline: true },
                        { name: '平均每次', value: `¥${(userData.totalCost / userData.messageCount).toFixed(6)}`, inline: true }
                    ])
                    .setFooter({ text: `用户ID: ${targetUser.id}` });
                
                // 添加最近使用记录
                if (recentHistory.length > 0) {
                    const historyText = recentHistory.map(record => {
                        const date = new Date(record.timestamp);
                        const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                        return `${formattedDate} | ${record.model} | ¥${record.cost.toFixed(6)} | ${record.prompt}`;
                    }).join('\n');
                    
                    embed.addFields([
                        { name: '最近5次使用记录', value: '```\n日期 | 模型 | 费用 | 问题\n' + historyText + '\n```' }
                    ]);
                }
                
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('执行money命令时出错:', error);
            
            // 创建错误回复
            const embed = new EmbedBuilder()
                .setTitle('错误')
                .setColor('#FF0000')
                .setDescription(`执行命令时出错: ${error.message}`);
            
            await interaction.editReply({ embeds: [embed] }).catch(console.error);
        }
    },
};