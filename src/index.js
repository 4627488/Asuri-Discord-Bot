// 引入必要的库
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const contributorManager = require('./utils/contributorManager');

// 创建Discord客户端实例
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// 存储命令集合
client.commands = new Collection();

// 加载命令文件并准备斜杠命令数据
const loadCommands = async () => {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    
    // 如果命令目录不存在，则创建
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        try {
        const filePath = path.join(commandsPath, file);
        // 清除命令模块缓存，确保读取的是最新的文件
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        
        // 验证命令结构是否符合斜杠命令要求
        if ('data' in command && 'execute' in command) {
            // 将命令添加到集合中
            client.commands.set(command.data.name, command);
            // 将命令添加到即将注册的数组中
            commands.push(command.data.toJSON());
            console.log(`✓ 已加载命令: ${command.data.name}`);
        } else {
            console.log(`[警告] 命令 ${file} 缺少必要的 "data" 或 "execute" 属性`);
        }
        } catch (error) {
            console.error(`[错误] 加载命令 ${file} 时出错:`, error);
        }
    }
    
    console.log(`准备注册 ${commands.length} 个斜杠命令`);
    return commands;
};

// 注册斜杠命令到Discord API
const registerCommands = async (commands) => {
    if (!commands || commands.length === 0) {
        console.log('没有命令可注册');
        return;
    }

    if (!process.env.CLIENT_ID) {
        console.error('环境变量中缺少CLIENT_ID，无法注册命令');
        return;
    }

    try {
        console.log('开始注册斜杠命令...');
        console.log(`ClientID: ${process.env.CLIENT_ID}`);
        console.log(`命令数量: ${commands.length}`);
        
        // 创建REST实例
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        // 尝试注册全局命令
        console.log('注册全局命令...');
        const globalData = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        
        console.log(`成功注册 ${globalData.length} 个全局斜杠命令`);
        
        // 注册测试服务器专用命令（服务器专用命令会立即生效）
        // 如果环境变量中有GUILD_ID，则也为该服务器注册命令
        if (process.env.GUILD_ID) {
            console.log(`为服务器 ${process.env.GUILD_ID} 注册专用命令...`);
            const guildData = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
        );
            console.log(`成功为服务器注册 ${guildData.length} 个斜杠命令（这些命令将立即生效）`);
        }
    } catch (error) {
        console.error('注册命令时出错:', error);
    }
};

// 加载事件文件
const loadEvents = () => {
    const eventsPath = path.join(__dirname, 'events');
    // 如果事件目录不存在，则创建
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        try {
        const filePath = path.join(eventsPath, file);
        // 清除事件模块缓存，确保读取的是最新的文件
        delete require.cache[require.resolve(filePath)];
        const event = require(filePath);
        
        if (event.name && (typeof event.execute === 'function')) {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✓ 已加载事件: ${event.name}`);
        } else {
            console.log(`[警告] 事件 ${file} 缺少必要的属性或方法`);
        }
        } catch (error) {
            console.error(`[错误] 加载事件 ${file} 时出错:`, error);
        }
    }
};

// 主函数
async function main() {
    try {
        // 加载命令并获取命令数据
        const commands = await loadCommands();
        
        // 注册命令到Discord
        await registerCommands(commands);
        
        // 加载事件处理器
        loadEvents();
        
        // 设置定时清理任务 - 每天检查一次不活跃的频道
        setInterval(async () => {
        try {
            console.log('开始执行频道贡献者数据清理任务...');
            const cleaned = await contributorManager.cleanupInactiveChannels();
            if (cleaned) {
                console.log('成功清理了不活跃频道的贡献者数据');
            } else {
                console.log('没有需要清理的频道数据');
            }
        } catch (error) {
            console.error('执行频道数据清理任务时出错:', error);
        }
        }, 24 * 60 * 60 * 1000); // 24小时执行一次

        // 登录机器人
        console.log('正在登录Discord...');
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('启动机器人时出错:', error);
        process.exit(1);
    }
}

// 处理未捕获的异常和拒绝
process.on('unhandledRejection', error => {
    console.error('未处理的Promise拒绝:', error);
});

process.on('uncaughtException', error => {
    console.error('未捕获的异常:', error);
});

// 启动机器人
main();