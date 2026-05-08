// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取最新的公告（按日期降序）
    const result = await db.collection('announcements')
      .orderBy('date', 'desc')
      .limit(5)
      .get()

    return {
      success: true,
      data: result.data
    }
  } catch (err) {
    console.error('[getAnnouncements] 获取公告失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}