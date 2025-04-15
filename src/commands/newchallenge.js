const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('newchallenge')
        .setDescription('创建一个新的题目频道')
        .addStringOption(option => 
            option
                .setName('name')
                .setDescription('新频道的名称')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // 获取当前频道和所在的分类
            const currentChannel = interaction.channel;
            const parentId = currentChannel.parentId;
            
            // 如果当前频道不在分类中，返回错误
            if (!parentId) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ 创建失败')
                    .setColor('#FF0000')
                    .setDescription('当前频道不在任何分类中，无法创建新的题目频道。');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // 获取题目名称
            const challengeName = interaction.options.getString('name');
            
            // 创建新频道
            const newChannel = await interaction.guild.channels.create({
                name: challengeName,
                type: ChannelType.GuildText,
                parent: parentId,
                topic: '[CHALLENGE]',
                reason: `由 ${interaction.user.tag} 创建的题目频道`
            });
            
            // 添加频道标记，表示这是由newchallenge命令创建的
            await newChannel.setTopic('[CHALLENGE]');
            
            // 创建成功消息
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ 题目频道创建成功')
                .setColor('#00FF00')
                .setDescription(`新题目频道 **${challengeName}** 已创建成功！`)
                .addFields([
                    { name: '频道位置', value: `<#${newChannel.id}>`, inline: true },
                    { name: '创建者', value: `<@${interaction.user.id}>`, inline: true }
                ])
                .setFooter({ text: '此频道已被标记为题目频道，贡献者统计功能已启用' });
            
            // 发送创建成功消息到原频道
            await interaction.editReply({ embeds: [successEmbed] });
            
            // 在新创建的频道中发送欢迎消息
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`欢迎来到 ${challengeName} 题目`)
                .setColor('#5865F2')
                .setDescription(`这是一个新的题目频道，由 <@${interaction.user.id}> 创建。\n\n首次在此频道发言的用户将被询问是否加入贡献者列表。`)
                .setFooter({ text: '祝各位好运！' });
            
            await newChannel.send({ embeds: [welcomeEmbed] });
            
        } catch (error) {
            console.error('创建题目频道时出错:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ 创建失败')
                .setColor('#FF0000')
                .setDescription(`创建题目频道时出错: ${error.message}`);
            
            await interaction.editReply({ embeds: [errorEmbed] }).catch(console.error);
        }
    },
};