// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 角色 Prompt 配置
const PROMPTS = {
  basic: `你是一位拥有20 年 + 中西医结合养生临床经验的资深养生专家，深耕中医体质调理、现代营养学、四季养生、慢病康养等领域，擅长用通俗语言拆解专业养生知识，拒绝伪科学、不夸大功效，兼顾实用性和科学性。请以专业、耐心、严谨的风格解答养生相关问题，回答需包含核心原则、具体方法、避坑要点，若涉及体质 / 人群差异，需明确区分适用场景，给出可落地的步骤，而非笼统概念。`,
  
  constitution: `你是专注中医体质辨证与定制调理的养生专家，精通九种体质（平和质、气虚质、阳虚质、阴虚质、痰湿质、湿热质、血瘀质、气郁质、特禀质）的辨证要点，能通过用户描述的症状快速精准判断体质，且结合体质给出饮食、作息、运动、穴位按摩的一站式定制调理方案，方案需贴合日常作息，食材易获取、动作易操作、穴位易寻找，同时标注体质调理的核心禁忌和见效周期，避免调理误区。`,
  
  chronic: `你是专注慢性病养生康养的资深专家，擅长结合西医临床标准和中医调理理念，为高血压、糖尿病、高血脂、慢性胃炎、失眠、关节不适等慢病人群定制非药物养生方案。解答需严格遵循慢病调理的医学原则，明确饮食禁忌、适宜运动、作息要求、情绪调节的具体标准（如量化饮食摄入量、运动时长 / 强度），同时提醒与药物配合的注意事项，避免养生方案与临床治疗冲突，语言专业但不晦涩，方便患者及家属执行。`,
  
  season: `你是深耕四季养生与二十四节气康养的专家，精通中医 “天人合一” 养生理念，结合不同季节 / 节气的气候特点、脏腑对应规律，给出时令饮食、起居、运动、防护的专属养生方案，方案需贴合当季时令食材、气候特征（如夏季防暑祛湿、冬季温补御寒），同时包含节气专属的养生小妙招（如节气茶饮、食疗方、简易养生操），兼顾实用性和传统养生文化，让方案易落地、易坚持。`,
  
  workplace: `你是专注职场人群亚健康调理的养生专家，熟悉职场人久坐、熬夜、饮食不规律、精神压力大、用眼过度等核心问题，擅长给出碎片化、高适配的养生方案，所有方法均能在办公室 / 通勤中 / 睡前完成，无需额外设备 / 时间，解答需包含亚健康问题改善（如颈椎不适、视力疲劳、失眠、脾胃虚弱）、高效精力恢复、职场防护要点，兼顾职场效率和养生需求，拒绝 “不切实际的养生建议”。`
};

// 输出要求配置
const OUTPUT_STYLES = {
  concise: `回答控制在 300 字内，提炼3 个核心要点 + 1 个避坑重点，直击关键，适合快速阅读；`,
  detailed: `分点分层解答，标注重点内容，包含原理 + 方法 + 案例 / 量化标准，方便收藏执行；`,
  popular: `搭配通俗比喻拆解专业原理，避免专业术语，适合零基础人群理解，可附带记忆口诀 / 小技巧；`,
  plan: `以清单式 / 步骤式输出，明确每日 / 每周执行要求，可标注 “必做项”“选做项”，适配不同执行力的人群。`
};

// 云函数入口函数
exports.main = async (event, context) => {
  const { content, scene = 'basic', style = 'detailed', history = [] } = event;
  
  // ==============================================================================
  // ⚠️⚠️⚠️ 关键步骤：已配置智谱AI (GLM-4-Flash) ⚠️⚠️⚠️
  const API_KEY = '1cd936070bbc49d5a76086c8ede33d42.PzNGMRn6Hkqa1SRf'; 
  // ==============================================================================

  try {
    if (!API_KEY || API_KEY.startsWith('sk-在此处')) {
      throw new Error('请先在 cloudfunctions/chatAgent/index.js 中配置 API Key');
    }

    // 智谱AI V4 接口地址 (OpenAI 兼容)
    const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    
    // 构建 System Prompt
    let systemContent = PROMPTS[scene] || PROMPTS.basic;
    const styleInstruction = OUTPUT_STYLES[style] || OUTPUT_STYLES.detailed;
    
    systemContent += `\n\n【输出要求】\n${styleInstruction}`;

    // 构建消息历史
    // 智谱/OpenAI 接口要求 role 必须是 "user", "assistant", "system"
    // 前端传来的可能是 "ai"，需要转换为 "assistant"
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const messages = [
      { role: "system", content: systemContent },
      ...formattedHistory.slice(-4), 
      { role: "user", content: content }
    ];

    const requestData = {
      model: "glm-4-flash", // 使用智谱 GLM-4-Flash 免费模型
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    };

    const response = await axios.post(API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    const aiContent = response.data.choices[0].message.content;
    
    return {
      success: true,
      content: aiContent
    };

  } catch (error) {
    // 详细记录错误信息以便排查
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('AI对话失败详细信息:', errorDetails);
    
    // 区分错误类型返回友好提示
    let userMessage = '抱歉，养生专家正在忙碌中，请稍后再试。';
    
    if (errorDetails.includes('配置 API Key')) {
      userMessage = '系统提示：请先在云函数 chatAgent 中配置 API Key。';
    } else if (error.response) {
      // 透传部分 API 错误信息以便前端调试
      console.log('API Error Status:', error.response.status);
      console.log('API Error Data:', error.response.data);
      
      if (error.response.status === 401) {
        userMessage = '系统提示：API Key 无效或已过期。';
      } else if (error.response.status === 400) {
        // 智谱常见 400 错误：参数格式不对，或者历史消息中有非法字段
        userMessage = '系统提示：请求参数有误，请重试。(400)';
      }
    }

    return {
      success: false,
      error: errorDetails,
      content: userMessage
    };
  }
}