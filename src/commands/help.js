const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('显示所有可用命令的帮助信息')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('要查询的特定命令名')
        .setRequired(false)),
  
  async execute(interaction, client) {
    const { commands } = client;
    const commandName = interaction.options.getString('command');
    
    // 创建一个漂亮的嵌入消息
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('命令帮助')
      .setTimestamp()
      .setFooter({ text: `由 ${interaction.user.tag} 请求`, iconURL: interaction.user.displayAvatarURL() });

    if (!commandName) {
      // 显示所有命令
      helpEmbed.setDescription('以下是所有可用的斜杠命令。使用 `/help command:<命令名>` 查看特定命令的详情。');
      
      const commandFields = [];
      commands.forEach(command => {
        commandFields.push({
          name: `/${command.data.name}`,
          value: command.data.description || '没有描述',
          inline: true
        });
      });
      
      helpEmbed.addFields(commandFields);
      return interaction.reply({ embeds: [helpEmbed] });
    }

    // 显示特定命令的帮助
    const command = commands.get(commandName);

    if (!command) {
      return interaction.reply({ content: '没有找到该命令！', ephemeral: true });
    }

    helpEmbed.setTitle(`命令: /${command.data.name}`)
      .setDescription(command.data.description || '没有描述');

    // 获取命令选项
    if (command.data.options && command.data.options.length > 0) {
      const optionsText = command.data.options.map(option => {
        const required = option.required ? '(必填)' : '(可选)';
        return `${option.name}: ${option.description} ${required}`;
      }).join('\n');
      
      helpEmbed.addFields({ name: '参数', value: optionsText });
    }

    await interaction.reply({ embeds: [helpEmbed] });
  },
};