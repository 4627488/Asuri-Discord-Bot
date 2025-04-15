module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 确保只处理斜杠命令交互
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`未找到命令 ${interaction.commandName}`);
      return interaction.reply({ content: '找不到此命令！', ephemeral: true });
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`执行命令时出错: ${interaction.commandName}`);
      console.error(error);

      // 如果交互已经被回复，使用followUp发送错误消息
      // 否则直接回复一个错误消息
      const replyContent = { 
        content: '执行此命令时出现了错误！', 
        ephemeral: true 
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyContent);
      } else {
        await interaction.reply(replyContent);
      }
    }
  },
};