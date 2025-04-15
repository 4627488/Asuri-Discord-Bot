module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`准备完毕！已登录为 ${client.user.tag}`);
    console.log(`机器人ID: ${client.user.id}`);
    console.log(`机器人正在为 ${client.guilds.cache.size} 个服务器提供服务`);
    
    // 输出机器人所在的所有服务器信息
    console.log('服务器列表:');
    client.guilds.cache.forEach(guild => {
      console.log(`- ${guild.name} (ID: ${guild.id}) - ${guild.memberCount} 成员`);
    });
    
    // 设置机器人状态
    client.user.setPresence({
      activities: [{ name: `/help`, type: 3 }], // 3 为"正在观看"
      status: 'online'
    });
    
    console.log('已更新机器人状态，当前斜杠命令:');
    // 显示已注册的命令
    client.application.commands.fetch()
      .then(commands => {
        commands.forEach(cmd => {
          console.log(`- /${cmd.name}: ${cmd.description}`);
        });
      })
      .catch(error => {
        console.error('获取已注册命令时出错:', error);
      });
  },
};