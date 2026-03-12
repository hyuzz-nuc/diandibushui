// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const articles = [
  {
    title: "口腔溃疡反反复复？喝水有讲究！",
    summary: "口腔溃疡期间，不仅要多喝水，还要注意水温和酸碱度。这份饮水指南请收好...",
    cover_img: "https://img.yzcdn.cn/vant/cat.jpeg", // 暂用占位图
    content: "口腔溃疡期间，建议保持每日饮水量在 2500ml 以上，以促进新陈代谢。同时，避免饮用过热或过酸的饮品（如柠檬水、橙汁），推荐饮用温凉的白开水或淡盐水。淡盐水漱口也有助于消炎杀菌。",
    tags: ["口腔溃疡", "上火"],
    recommend_amount: 2500,
    createTime: new Date()
  },
  {
    title: "感冒发烧多喝水，真的是万能药吗？",
    summary: "感冒时多喝水确实有助于退烧和代谢病毒，但喝错了可能适得其反！",
    cover_img: "https://img.yzcdn.cn/vant/cat.jpeg",
    content: "感冒发烧时，身体水分流失加快，确实需要补充水分。建议少量多次饮用温开水，每小时 100-200ml。如果出汗较多，可适当补充电解质水（如淡盐糖水）。切忌一次性牛饮，以免增加肾脏负担。",
    tags: ["感冒", "发烧"],
    recommend_amount: 3000,
    createTime: new Date()
  },
  {
    title: "经常熬夜皮肤差？补水是关键！",
    summary: "熬夜会加速皮肤水分流失，导致暗沉、爆痘。睡前喝一杯水，真的有效吗？",
    cover_img: "https://img.yzcdn.cn/vant/cat.jpeg",
    content: "熬夜党必须重视补水！建议在熬夜过程中，每隔一小时喝 150ml 水。睡前 1 小时可以喝一小杯（约 100ml），但不宜过多以免水肿。早起空腹一杯温水，是唤醒肌肤的最佳方式。",
    tags: ["熬夜", "护肤"],
    recommend_amount: 2200,
    createTime: new Date()
  },
  {
    title: "运动后狂灌冰水？当心身体“炸裂”！",
    summary: "剧烈运动后口渴难耐，冰水虽然解渴，但可能引发胃痉挛甚至心脏骤停...",
    cover_img: "https://img.yzcdn.cn/vant/cat.jpeg",
    content: "运动后应遵循“少量多次”原则补水。水温以 10-15℃ 为宜，不要喝冰水。如果运动时间超过 1 小时，建议饮用运动饮料补充电解质。休息 15-30 分钟后再进食。",
    tags: ["运动", "补水误区"],
    recommend_amount: 2800,
    createTime: new Date()
  }
]

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const collection = db.collection('articles')
    
    // 批量检查并插入（简单起见，这里直接插入，实际项目可做去重）
    // 为了方便测试，我们先清空旧数据（慎用！仅限开发阶段）
    // await collection.where({}).remove() 
    
    // 更好的方式：查询是否已存在，不存在则插入
    // 这里简单实现：直接返回预置数据供前端调用，或者手动在控制台执行一次插入
    // 本云函数设计为“手动触发一次”即可初始化数据
    
    for (const article of articles) {
      await collection.add({
        data: article
      })
    }

    return {
      success: true,
      message: `成功初始化 ${articles.length} 篇文章`
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}