const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 模型管理器类，负责管理和切换不同的LLM供应商和模型
 */
class ModelManager {
    constructor() {
        // 从环境变量加载供应商配置
        const providersFromEnv = (process.env.PROVIDER).split(',').map(p => p.trim());
        
        // 模型提供商映射
        this.providers = {};
        
        // 动态加载模型提供商
        this.loadProviders(providersFromEnv);

        // 从环境变量加载默认供应商和模型
        this.currentProvider = process.env.DEFAULT_LLM_PROVIDER || Object.keys(this.providers)[0] || 'deepseek';
        this.currentModel = process.env.DEFAULT_MODEL;

        // 验证配置是否有效
        if (!this.providers[this.currentProvider]) {
            console.error(`警告: 配置的默认提供商 ${this.currentProvider} 不存在，将使用可用的第一个供应商作为默认值`);
            const availableProviders = Object.keys(this.providers);
            if (availableProviders.length > 0) {
                this.currentProvider = availableProviders[0];
                const availableModels = this.providers[this.currentProvider].getAvailableModels();
                this.currentModel = availableModels[0];
            } else {
                throw new Error('没有配置任何可用的LLM供应商，请检查.env中的PROVIDER配置');
            }
        }

        // 创建实例
        this.modelInstance = this.createModelInstance();
    }

    /**
     * 动态加载供应商模块
     * @param {Array<string>} providerNames - 供应商名称列表
     */
    loadProviders(providerNames) {
        for (const providerName of providerNames) {
            try {
                // 尝试从LLM-apis文件夹加载供应商模块
                const providerPath = path.join(__dirname, 'LLM-apis', `${providerName}.js`);
                
                // 检查文件是否存在
                if (fs.existsSync(providerPath)) {
                    // 清除缓存并加载模块
                    delete require.cache[require.resolve(providerPath)];
                    const ProviderModel = require(providerPath);
                    
                    // 注册供应商
                    this.providers[providerName] = ProviderModel;
                    console.log(`已成功加载供应商模块: ${providerName}`);
                } else {
                    console.warn(`警告: 无法找到供应商模块文件 ${providerPath}`);
                }
            } catch (error) {
                console.error(`加载供应商 ${providerName} 时出错:`, error);
            }
        }
    }

    /**
     * 创建当前选择的模型实例
     * @returns {BaseModel} 模型实例
     */
    createModelInstance() {
        const ProviderClass = this.providers[this.currentProvider];
        
        // 检查模型是否在该供应商的可用模型列表中
        const availableModels = ProviderClass.getAvailableModels();
        
        if (!availableModels.includes(this.currentModel)) {
            console.warn(`警告: 模型 ${this.currentModel} 不在 ${this.currentProvider} 的可用模型列表中，使用第一个可用模型`);
            this.currentModel = availableModels[0];
        }
        
        return new ProviderClass(this.currentModel);
    }

    /**
     * 获取当前模型实例
     * @returns {BaseModel} 当前模型实例
     */
    getCurrentModel() {
        return this.modelInstance;
    }

    /**
     * 获取当前供应商名称
     * @returns {string} 当前供应商名称
     */
    getCurrentProvider() {
        return this.currentProvider;
    }

    /**
     * 获取当前模型名称
     * @returns {string} 当前模型名称
     */
    getCurrentModelName() {
        return this.currentModel;
    }

    /**
     * 设置当前供应商
     * @param {string} providerName - 供应商名称
     * @returns {boolean} 是否设置成功
     */
    setProvider(providerName) {
        if (!this.providers[providerName]) {
            return false;
        }
        
        this.currentProvider = providerName;
        // 切换供应商后，选择该供应商的第一个模型作为默认模型
        const availableModels = this.providers[providerName].getAvailableModels();
        this.currentModel = availableModels[0];
        
        // 重新创建模型实例
        this.modelInstance = this.createModelInstance();
        return true;
    }

    /**
     * 设置当前模型
     * @param {string} modelName - 模型名称
     * @returns {boolean} 是否设置成功
     */
    setModel(modelName) {
        const ProviderClass = this.providers[this.currentProvider];
        const availableModels = ProviderClass.getAvailableModels();
        
        if (!availableModels.includes(modelName)) {
            return false;
        }
        
        this.currentModel = modelName;
        // 重新创建模型实例
        this.modelInstance = this.createModelInstance();
        return true;
    }

    /**
     * 获取所有可用的供应商列表
     * @returns {Array<string>} 供应商列表
     */
    getAvailableProviders() {
        return Object.keys(this.providers);
    }

    /**
     * 获取当前供应商支持的所有模型列表
     * @returns {Array<string>} 模型列表
     */
    getAvailableModels() {
        const ProviderClass = this.providers[this.currentProvider];
        return ProviderClass.getAvailableModels();
    }

    /**
     * 获取指定供应商支持的所有模型列表
     * @param {string} providerName - 供应商名称
     * @returns {Array<string>} 模型列表
     */
    getProviderModels(providerName) {
        if (!this.providers[providerName]) {
            return [];
        }
        
        return this.providers[providerName].getAvailableModels();
    }

    /**
     * 获取模型的元数据
     * @param {string} modelName - 模型名称
     * @param {string} [providerName=this.currentProvider] - 供应商名称，默认为当前供应商
     * @returns {Object} 模型元数据，包含描述和价格信息
     */
    getModelMetadata(modelName, providerName = this.currentProvider) {
        if (!this.providers[providerName]) {
            return { description: '未知供应商', price: '价格未知' };
        }
        
        return this.providers[providerName].getModelMetadata(modelName);
    }

    /**
     * 获取当前供应商所有模型的元数据
     * @returns {Array<Object>} 模型元数据数组，每个元素包含模型名称、描述和价格
     */
    getAllModelsMetadata() {
        const ProviderClass = this.providers[this.currentProvider];
        const models = this.getAvailableModels();
        
        return models.map(modelName => {
            const metadata = this.getModelMetadata(modelName);
            return {
                name: modelName,
                actualModelId: ProviderClass.MODEL_ID_MAPPING?.[modelName] || modelName,
                description: metadata.description,
                inputPrice: metadata.inputPrice,
                outputPrice: metadata.outputPrice,
                isCurrentModel: modelName === this.currentModel
            };
        });
    }

    /**
     * 发送聊天请求，并计算使用费用
     * @param {string} prompt - 用户输入的提示
     * @param {Object} options - 可选参数
     * @returns {Promise<Object>} 包含回复内容和费用信息的对象
     */
    async chat(prompt, options = {}) {
        // 获取模型回复
        const response = await this.modelInstance.chat(prompt, options);
        
        // 计算费用
        const costInfo = this.modelInstance.calculateCost(prompt, response);
        
        // 返回结果和费用信息
        return {
            response,
            costInfo
        };
    }
}

// 创建单例实例
const modelManager = new ModelManager();

module.exports = modelManager;