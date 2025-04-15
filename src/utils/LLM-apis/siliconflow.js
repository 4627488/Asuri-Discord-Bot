const BaseModel = require('./base-model');
const axios = require('axios');
require('dotenv').config();

/**
 * 硅基流动(SiliconFlow)模型实现类
 */
class SiliconFlowModel extends BaseModel {
    /**
     * 模型名称到实际API调用modelid的映射
     * @type {Object}
     */
    static MODEL_ID_MAPPING = {
        'Qwen2.5-Coder-7B': 'Qwen/Qwen2.5-Coder-7B-Instruct',
        'GLM-Z1-9B': 'THUDM/GLM-Z1-9B-0414',
        'DeepSeek-R1-7B': 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
        'DeepSeek-V3': 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    };

    /**
     * 模型元数据，包含描述和价格信息
     * 价格为每百万token的人民币价格
     * @type {Object}
     */
    static MODEL_METADATA = {
        'Qwen2.5-Coder-7B': {
            description: 'Qwen2.5-Coder-7B-Instruct 是阿里云发布的代码特定大语言模型系列的最新版本。该模型在 Qwen2.5 的基础上，通过 5.5 万亿个 tokens 的训练，显著提升了代码生成、推理和修复能力。它不仅增强了编码能力，还保持了数学和通用能力的优势。模型为代码智能体等实际应用提供了更全面的基础。',
            inputPrice: '0.0',     // 每百万token的输入价格（人民币）
            outputPrice: '0.0'     // 每百万token的输出价格（人民币）
        },
        'GLM-Z1-9B': {
            description: 'GLM-Z1-9B-0414 是 GLM 系列的小型模型，仅有 90 亿参数，但保持了开源传统的同时展现出惊人的能力。尽管规模较小，该模型在数学推理和通用任务上仍表现出色，其总体性能在同等规模的开源模型中已处于领先水平。研究团队采用了与大模型相同的一系列技术进行训练，使其在资源受限的场景中能够实现效率与效果的绝佳平衡，为寻求轻量级部署的用户提供强大选择。特别是在资源受限的场景下，该模型可以很好地在效率与效果之间取得平衡，为需要轻量化部署的用户提供强有力的选择。',
            inputPrice: '0.0',
            outputPrice: '0.0'
        },
        'DeepSeek-R1-7B': {
            description: 'DeepSeek-R1-Distill-Qwen-7B 是基于 Qwen2.5-Math-7B 通过知识蒸馏得到的模型。该模型使用 DeepSeek-R1 生成的 80 万个精选样本进行微调，展现出优秀的推理能力。在多个基准测试中表现出色，其中在 MATH-500 上达到了 92.8% 的准确率，在 AIME 2024 上达到了 55.5% 的通过率，在 CodeForces 上获得了 1189 的评分，作为 7B 规模的模型展示了较强的数学和编程能力。',
            inputPrice: '0.0',
            outputPrice: '0.0'
        },
        'DeepSeek-V3': {
            description: '新版 DeepSeek-V3 （DeepSeek-V3-0324）与之前的 DeepSeek-V3-1226 使用同样的 base 模型，仅改进了后训练方法。新版 V3 模型借鉴 DeepSeek-R1 模型训练过程中所使用的强化学习技术，大幅提高了在推理类任务上的表现水平，在数学、代码类相关评测集上取得了超过 GPT-4.5 的得分成绩。此外该模型在工具调用、角色扮演、问答闲聊等方面也得到了一定幅度的能力提升。',
            inputPrice: '2.0',
            outputPrice: '8.0'
        }
    };

    /**
     * 构造函数
     * @param {string} modelName - 模型名称
     */
    constructor(modelName) {
        super(modelName);
        this.apiKey = process.env.SILICONFLOW_API_KEY;
        this.apiUrl = 'https://api.siliconflow.com/v1/chat/completions';
    }

    /**
     * 获取供应商名称
     * @returns {string} 供应商名称
     */
    getProviderName() {
        return 'siliconflow';
    }

    /**
     * 获取实际API调用使用的modelid
     * @returns {string} 实际modelid
     */
    getActualModelId() {
        return SiliconFlowModel.MODEL_ID_MAPPING[this.modelName] || this.modelName;
    }

    /**
     * 获取模型描述信息
     * @param {string} modelName - 模型名称
     * @returns {Object} 模型描述和价格信息
     */
    static getModelMetadata(modelName) {
        return SiliconFlowModel.MODEL_METADATA[modelName] || {
            description: '暂无描述',
            inputPrice: '价格未知',
            outputPrice: '价格未知'
        };
    }

    /**
     * 发送聊天请求到SiliconFlow API
     * @param {string} prompt - 用户输入的提示
     * @param {Object} options - 可选参数
     * @returns {Promise<string>} 模型的回复
     */
    async chat(prompt, options = {}) {
        try {
            // 获取实际的modelid用于API调用
            const actualModelId = this.getActualModelId();
            
            const response = await axios.post(
                this.apiUrl,
                {
                    model: actualModelId, // 使用映射后的实际modelid
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: options.temperature || 0.7,
                    max_tokens: options.max_tokens || 1000
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('SiliconFlow API调用错误:', error.response?.data || error.message);
            throw new Error(`与SiliconFlow AI对话时出错: ${error.message}`);
        }
    }

    /**
     * 获取SiliconFlow支持的模型列表
     * @returns {Array<string>} 支持的模型列表
     */
    static getAvailableModels() {
        const models = process.env.SILICONFLOW_MODELS || 'Qwen2.5-Coder-7B,GLM-Z1-9B';
        return models.split(',').map(model => model.trim());
    }
}

module.exports = SiliconFlowModel;