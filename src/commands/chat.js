const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const modelManager = require('../utils/modelManager');
const moneyManager = require('../utils/moneyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('与LLM模型聊天')
        .addSubcommandGroup(group => 
            group
                .setName('model')
                .setDescription('模型相关命令')
                .addSubcommand(subcommand => 
                    subcommand
                        .setName('list')
                        .setDescription('列出当前供应商支持的模型列表')
                )
                .addSubcommand(subcommand => 
                    subcommand
                        .setName('set')
                        .setDescription('设置当前使用的模型')
                        .addStringOption(option => 
                            option
                                .setName('name')
                                .setDescription('模型的名称')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        )
        .addSubcommandGroup(group => 
            group
                .setName('provider')
                .setDescription('供应商相关命令')
                .addSubcommand(subcommand => 
                    subcommand
                        .setName('list')
                        .setDescription('列出所有可用的供应商')
                )
                .addSubcommand(subcommand => 
                    subcommand
                        .setName('set')
                        .setDescription('设置当前使用的供应商')
                        .addStringOption(option => 
                            option
                                .setName('name')
                                .setDescription('供应商的名称')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        )
        .addSubcommand(subcommand => 
            subcommand
                .setName('ask')
                .setDescription('向当前选择的LLM模型询问问题')
                .addStringOption(option => 
                    option
                        .setName('prompt')
                        .setDescription('你想问的问题')
                        .setRequired(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const subcommandGroup = interaction.options.getSubcommandGroup();
        
        if (focusedOption.name === 'name') {
            let choices = [];
            
            if (subcommandGroup === 'provider') {
                choices = modelManager.getAvailableProviders();
            } else if (subcommandGroup === 'model') {
                choices = modelManager.getAvailableModels();
            }
            
            const filtered = choices.filter(choice => 
                choice.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice }))
            );
        }
    },
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        
        try {
            // 处理模型相关命令
            if (subcommandGroup === 'model') {
                if (subcommand === 'list') {
                    // 获取当前供应商及其模型元数据
                    const provider = modelManager.getCurrentProvider();
                    const modelsMetadata = modelManager.getAllModelsMetadata();
                    const currentModel = modelManager.getCurrentModelName();
                    
                    // 创建主嵌入消息
                    const embed = new EmbedBuilder()
                        .setTitle(`${provider} 可用的模型列表`)
                        .setColor('#00FFFF')
                        .setDescription(`当前正在使用的模型: **${currentModel}**\n\n使用 \`/chat model set [模型名]\` 来切换模型`);
                    
                    // 为每个模型添加详细字段
                    modelsMetadata.forEach(model => {
                        const modelStatus = model.isCurrentModel ? '✅ 当前使用中' : '';
                        
                        embed.addFields({
                            name: `${model.name} ${modelStatus}`,
                            value: `**描述:** ${model.description}\n**输入价格:** ¥${model.inputPrice}/M tokens\n**输出价格:** ¥${model.outputPrice}/M tokens`,
                            inline: false
                        });
                    });
                    
                    await interaction.editReply({ embeds: [embed] });
                } else if (subcommand === 'set') {
                    // 切换模型
                    const name = interaction.options.getString('name');
                    const success = modelManager.setModel(name);
                    
                    if (success) {
                        const provider = modelManager.getCurrentProvider();
                        const newModel = modelManager.getCurrentModelName();
                        const metadata = modelManager.getModelMetadata(newModel);
                        
                        const embed = new EmbedBuilder()
                            .setTitle('模型切换成功')
                            .setColor('#00FF00')
                            .setDescription(`供应商 **${provider}** 已切换到模型: **${newModel}**`)
                            .addFields([
                                { name: '模型描述', value: metadata.description },
                                { name: '输入价格', value: metadata.inputPrice },
                                { name: '输出价格', value: metadata.outputPrice }
                            ]);
                        
                        await interaction.editReply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle('模型切换失败')
                            .setColor('#FF0000')
                            .setDescription(`模型 "${name}" 在当前供应商中不存在或不可用`);
                        
                        await interaction.editReply({ embeds: [embed] });
                    }
                }
            } 
            // 处理供应商相关命令
            else if (subcommandGroup === 'provider') {
                if (subcommand === 'list') {
                    // 列出所有供应商
                    const providers = modelManager.getAvailableProviders();
                    const currentProvider = modelManager.getCurrentProvider();
                    
                    const embed = new EmbedBuilder()
                        .setTitle('可用的LLM供应商')
                        .setColor('#00FFFF')
                        .setDescription(`当前正在使用的供应商: **${currentProvider}**`)
                        .addFields(
                            providers.map(provider => ({
                                name: provider,
                                value: provider === currentProvider ? '✅ 当前使用中' : '可用',
                                inline: true
                            }))
                        )
                        .setFooter({ text: `使用 /chat provider set [供应商名] 来切换供应商` });
                    
                    await interaction.editReply({ embeds: [embed] });
                } else if (subcommand === 'set') {
                    // 切换供应商
                    const name = interaction.options.getString('name');
                    const success = modelManager.setProvider(name);
                    
                    if (success) {
                        const newProvider = modelManager.getCurrentProvider();
                        const newModel = modelManager.getCurrentModelName();
                        
                        const embed = new EmbedBuilder()
                            .setTitle('供应商切换成功')
                            .setColor('#00FF00')
                            .setDescription(`已切换到供应商: **${newProvider}**`)
                            .addFields([
                                { name: '默认模型', value: newModel }
                            ]);
                        
                        await interaction.editReply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle('供应商切换失败')
                            .setColor('#FF0000')
                            .setDescription(`供应商 "${name}" 不存在或不可用`);
                        
                        await interaction.editReply({ embeds: [embed] });
                    }
                }
            } 
            // 处理询问命令
            else if (subcommand === 'ask') {
                // 获取并处理用户输入的问题
                let prompt = interaction.options.getString('prompt');
                
                // 获取当前供应商和模型信息
                const provider = modelManager.getCurrentProvider();
                const model = modelManager.getCurrentModelName();
                
                // 发送请求并获取结果（包含回复内容和费用信息）
                const result = await modelManager.chat(prompt, { max_tokens: 1500 });
                const { response, costInfo } = result;
                
                // 记录用户消费
                const userId = interaction.user.id;
                const username = interaction.user.tag;
                const cost = costInfo.totalCost; // 这是实际消费金额
                await moneyManager.recordCost(userId, username, cost, model, {
                    provider: provider,
                    inputTokens: costInfo.inputTokens,
                    outputTokens: costInfo.outputTokens,
                    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') // 记录问题的前100个字符
                });
                
                // 为了避免Discord消息长度限制，可能需要分割长回复
                let responseFragments = [];
                if (response.length > 4000) {
                    // 每4000个字符分割一次
                    for (let i = 0; i < response.length; i += 4000) {
                        responseFragments.push(response.substring(i, i + 4000));
                    }
                } else {
                    responseFragments = [response];
                }
                
                // 创建用户问题的嵌入消息（显示原始提问内容）
                const questionEmbed = new EmbedBuilder()
                    .setTitle('用户问题')
                    .setColor('#4F545C')
                    .setDescription(prompt.length > 4000 ? prompt.substring(0, 4000) + '...(问题过长)' : prompt);
                
                // 创建AI回复的嵌入消息
                const replyEmbed = new EmbedBuilder()
                    .setTitle('AI回复')
                    .setColor('#5865F2')
                    .setDescription(responseFragments[0]);
                
                // 添加费用和使用信息到页脚
                const costFooter = `使用 ${provider}/${model} | 输入: ${costInfo.inputTokens} tokens | ` + 
                                  `输出: ${costInfo.outputTokens} tokens | 花费: ${costInfo.formattedCost}`;
                replyEmbed.setFooter({ text: costFooter });
                
                // 发送初始回复（包含问题和第一部分回复）
                const reply = await interaction.editReply({ 
                    embeds: [questionEmbed, replyEmbed]
                });
                
                // 如果回复被分割成多个片段，则发送后续片段
                if (responseFragments.length > 1) {
                    for (let i = 1; i < responseFragments.length; i++) {
                        const continuationEmbed = new EmbedBuilder()
                            .setTitle(`AI回复 (续 ${i+1}/${responseFragments.length})`)
                            .setColor('#5865F2')
                            .setDescription(responseFragments[i]);
                        
                        await interaction.followUp({ embeds: [continuationEmbed] });
                    }
                }
            }
        } catch (error) {
            console.error('执行chat命令时出错:', error);
            
            // 创建错误回复
            const embed = new EmbedBuilder()
                .setTitle('错误')
                .setColor('#FF0000')
                .setDescription(`执行命令时出错: ${error.message}`);
            
            await interaction.editReply({ embeds: [embed] }).catch(console.error);
        }
    },
};