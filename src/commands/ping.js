const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('测试机器人的响应速度'),
  
  async execute(interaction) {
    // 延迟回复，以便能够准确计算API延迟
    await interaction.deferReply();
    
    // 计算延迟
    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    // API延迟
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(`🏓 延迟: ${latency}ms | API延迟: ${apiLatency}ms`);
  },
};