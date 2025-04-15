const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('显示机器人的信息'),
  
  async execute(interaction) {
    const client = interaction.client;
    
    // 创建嵌入信息
    const infoEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('机器人信息')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: '🤖 机器人名称', value: client.user.username, inline: true },
        { name: '📅 创建日期', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🛠️ 开发人员', value: "Dawn-whisper", inline: true },
        { name: '💾 内存使用', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
        { name: '🔄 正常运行时间', value: formatUptime(client.uptime), inline: true },
      )
      .setFooter({ text: `由 ${interaction.user.tag} 请求`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();
    
    await interaction.reply({ embeds: [infoEmbed] });
  },
};

// 格式化正常运行时间
function formatUptime(uptime) {
  const totalSeconds = Math.floor(uptime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
}