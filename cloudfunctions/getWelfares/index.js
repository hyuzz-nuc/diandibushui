// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询所有福利（不限制openid）
    const res = await db.collection('welfares').orderBy('date', 'desc').limit(100).get()

    return {
      success: true,
      data: res.data
    }
  } catch (err) {
    console.error('获取福利失败:', err)
    return {
      success: false,
      message: '获取福利失败',
      error: err
    }
  }
}
