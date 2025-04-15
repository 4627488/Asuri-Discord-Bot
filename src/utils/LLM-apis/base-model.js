/**
 * LLM模型的基础类
 * 所有具体供应商的模型实现都应继承此类
 */
class BaseModel {
    /**
     * 构造函数
     * @param {string} modelName - 模型名称
     */
    constructor(modelName) {
        this.modelName = modelName;
    }

    /**
     * 获取模型名称
     * @returns {string} 模型名称
     */
    getModelName() {
        return this.modelName;
    }

    /**
     * 发送聊天请求到LLM API
     * @param {string} prompt - 用户输入的提示
     * @param {Object} options - 可选参数
     * @returns {Promise<string>} 模型的回复
     */
    async chat(prompt, options = {}) {
        throw new Error('子类必须实现chat方法');
    }

    /**
     * 获取供应商名称
     * @returns {string} 供应商名称
     */
    getProviderName() {
        throw new Error('子类必须实现getProviderName方法');
    }

    /**
     * 获取实际API调用使用的modelid
     * @returns {string} 实际modelid
     */
    getActualModelId() {
        // 默认情况下，实际modelid就是模型名称
        return this.modelName;
    }

    /**
     * 获取当前供应商支持的模型列表
     * @returns {Array<string>} 支持的模型列表
     */
    static getAvailableModels() {
        throw new Error('子类必须实现getAvailableModels静态方法');
    }
    
    /**
     * 获取模型元数据信息
     * @param {string} modelName - 模型名称
     * @returns {Object} 模型描述和价格信息，格式: {description: string, inputPrice: string, outputPrice: string}
     */
    static getModelMetadata(modelName) {
        // 默认返回一个空的元数据对象，子类应该覆盖这个方法
        return {
            description: '暂无描述',
            inputPrice: '价格未知',
            outputPrice: '价格未知'
        };
    }

    /**
     * 粗略估算文本的token数量
     * @param {string} text - 要计算的文本
     * @returns {number} 估算的token数量
     */
    static estimateTokens(text) {
        // 英文约4个字符一个token，中文约一个字一个token
        // 这是一个简单估算，实际计数可能有差异
        const englishChars = text.replace(/[\u4e00-\u9fa5]/g, '').length;
        const chineseChars = text.length - englishChars;
        return Math.ceil(englishChars / 4 + chineseChars);
    }
    
    /**
     * 计算使用费用
     * @param {string} inputText - 输入文本
     * @param {string} outputText - 输出文本
     * @returns {Object} 费用信息，包含输入费用、输出费用和总费用
     */
    calculateCost(inputText, outputText) {
        // 获取模型元数据中的价格信息
        const metadata = this.constructor.getModelMetadata(this.modelName);
        
        // 获取输入和输出的价格（每百万token）
        // 直接使用数字形式的价格，如果不是数字则转换为浮点数
        const inputPricePerM = parseFloat(metadata.inputPrice) || 0;
        const outputPricePerM = parseFloat(metadata.outputPrice) || 0;
        
        // 估算token数量
        const inputTokens = BaseModel.estimateTokens(inputText);
        const outputTokens = BaseModel.estimateTokens(outputText);
        
        // 计算费用（转换为元）
        const inputCost = (inputTokens / 1000000) * inputPricePerM;
        const outputCost = (outputTokens / 1000000) * outputPricePerM;
        const totalCost = inputCost + outputCost;
        
        return {
            inputTokens,
            outputTokens,
            inputCost,
            outputCost,
            totalCost,
            formattedCost: `¥${totalCost.toFixed(6)}`
        };
    }
}

module.exports = BaseModel;