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
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    const user = userRes.data[0]

    return {
      success: true,
      data: {
        coins: user.coins || 0,
        level: user.level || 1,
        decorations: user.decorations || {}
      }
    }
  } catch (err) {
    console.error('获取商城数据失败:', err)
    return { success: false, message: '获取失败', error: err }
  }
}
