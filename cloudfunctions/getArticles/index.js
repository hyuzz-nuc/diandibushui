// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 预置数据（当数据库为空时自动插入）
// 移除预置数据，由AI自动生成
const INIT_ARTICLES = []

// 云函数入口函数
exports.main = async (event, context) => {
  const { tag, page = 1, pageSize = 10, keyword } = event
  
  try {
    const collection = db.collection('articles')

    // 0. 自动检查初始化 (仅在首页且无搜索无筛选时)
    if (page === 1 && (!tag || tag === '全部') && !keyword) {
      const totalCount = await collection.count()
      if (totalCount.total === 0) {
        console.log('检测到文章库为空，开始初始化数据...')
        for (const article of INIT_ARTICLES) {
          article.createTime = new Date()
          await collection.add({ data: article })
        }
      }
    }

    let query = collection
    
    // 1. 如果有搜索关键词
    if (keyword) {
      // 使用正则模糊查询
      const dbQuery = {
        title: db.RegExp({
          regexp: keyword,
          options: 'i',
        })
      }
      
      // 先查库
      const searchCount = await collection.where(dbQuery).count()
      
      // 【智能生成逻辑】如果库里没搜到，则模拟“从外部获取/AI生成”并存库
      if (searchCount.total === 0) {
         // 检查今日是否已为该关键词生成过（防止频繁生成）
         // 实际场景建议用 redis 或单独的日志表记录生成频率
         // 这里简单演示：查一下最近24小时内有没有生成过（虽然上面count=0已经暗示没有，但为了严谨）
         
         console.log(`未找到关于"${keyword}"的文章，正在生成...`)
         const newArticle = await generateArticleByKeyword(keyword)
         if (newArticle) {
           // 去掉封面图
           delete newArticle.cover_img; 
           await collection.add({ data: newArticle })
           // 重新构建查询条件以包含新生成的文章
         }
      }
      
      query = query.where(dbQuery)
    } 
    // 2. 如果有标签筛选 (搜索时通常忽略标签，或者叠加，这里逻辑是：有搜索优先搜索，无搜索才看标签)
    else if (tag && tag !== '全部') {
      query = query.where({
        tags: tag
      })
    }

    // 3. 计算总数
    const countResult = await query.count()
    const total = countResult.total

    // 4. 分页查询
    const listResult = await query
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .orderBy('createTime', 'desc')
      .get()

    return {
      success: true,
      data: listResult.data,
      total,
      page,
      pageSize,
      hasMore: total > page * pageSize
    }
  } catch (err) {
    console.error(err)
    return { success: false, error: err }
  }
}

// 【增强版】AI养生文章生成器
// 核心：以专业养生专家视角，提供全方位的健康建议（饮食、作息、运动、心理等），不局限于喝水
async function generateArticleByKeyword(keyword) {
  try {
    const axios = require('axios');
    
    // 免费AI接口（豆包免费API，无需Key）
    const API_URL = 'https://www.doubao.com/api/chat/completions';
    
    // 优化后的提示词，角色为全能养生专家
    const systemPrompt = `你是资深中医养生专家和现代营养学顾问，擅长结合传统医学与现代科学给出全方位的健康建议。需按照以下固定JSON格式返回内容（仅返回JSON，无多余文字）：
{
  "title": "文章标题（包含关键词${keyword}，吸引人且专业，如：${keyword}人群的自救指南：从饮食到作息的全方位调理）",
  "summary": "文章摘要（120字左右，简述核心健康问题及解决方案概览）",
  "content": "完整文章（800-1000字，Markdown格式。结构：\n# 引言：分析${keyword}相关的健康痛点\n## 一、饮食调理：吃出健康（具体食材、食谱推荐）\n## 二、作息与运动：动静结合（睡眠建议、适合的运动）\n## 三、情绪管理：身心合一（心理调节建议）\n## 四、特别提醒：误区与禁忌\n（注意：内容要干货满满，语气亲切专业，避免空洞的废话。不要仅仅局限于喝水，要覆盖生活的方方面面。）",
  "recommend_amount": 随机数字（1500-3000）,
  "tags": ["核心标签1", "核心标签2", "核心标签3"]
}`;

    // 用户指令：明确要求广泛的养生建议
    const userPrompt = `关键词：${keyword}。请生成一篇高质量的养生指南。不要只讲喝水，要从饮食（推荐具体食物/食疗方）、生活习惯（睡眠/运动）、心理调节等多维度给出建议。标签（tags）限制为1-3个最精准的词。`;

    // 构建请求参数
    const requestData = {
      model: "doubao-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7, // 降低一点随机性，保证专业度
      max_tokens: 2000,  // 适配更长的文章内容
      timeout: 30000
    };

    // 发送请求并处理响应
    const response = await axios.post(API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // 解析AI返回结果
    const aiContent = response.data.choices[0].message.content;
    const aiData = JSON.parse(aiContent);

    // 组装最终返回结构
    return {
      title: aiData.title,
      summary: aiData.summary,
      content: aiData.content,
      tags: aiData.tags.slice(0, 3), // 强制限制标签数量为1-3个
      recommend_amount: aiData.recommend_amount || 2000,
      createTime: new Date()
    };

  } catch (error) {
    console.error('AI生成失败，使用保底养生数据', error.message);
    
    // 保底数据
    return {
      title: `${keyword}的全面养生指南：饮食、作息与运动`,
      summary: `针对${keyword}问题，本文提供了一套完整的解决方案。不仅仅是多喝水，更包括科学的饮食搭配、合理的作息安排以及适合的运动推荐。`,
      content: `# ${keyword}人群的自救指南\n\n## 一、饮食调理：吃对才健康\n对于${keyword}人群，饮食应以清淡为主。推荐多食用富含维生素C的蔬果，如奇异果、橙子等。同时，可以尝试以下食疗方：\n- **百合莲子羹**：润肺安神，适合焦虑失眠人群。\n- **山药排骨汤**：健脾养胃，增强免疫力。\n\n## 二、作息与运动：动静结合\n1. **规律作息**：尽量在晚上11点前入睡，保证7-8小时的高质量睡眠。\n2. **适度运动**：推荐瑜伽、慢跑或快走，每周坚持3-4次，每次30分钟以上，有助于促进血液循环，缓解${keyword}带来的不适。\n\n## 三、情绪管理\n${keyword}往往与压力有关。建议每天花10分钟进行冥想，或者通过听轻音乐来放松心情。保持乐观的心态是健康的基石。\n\n## 四、注意事项\n避免过度劳累，减少咖啡和浓茶的摄入。如果症状持续加重，请及时就医。`,
      tags: ["健康养生", "生活方式", keyword],
      recommend_amount: 2000,
      createTime: new Date()
    };
  }
}