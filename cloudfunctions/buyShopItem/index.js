// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { type, name, price } = event

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    const user = userRes.data[0]
    const currentCoins = user.coins || 0

    // 检查金币是否足够
    if (currentCoins < price) {
      return { success: false, message: '金币不足' }
    }

    // 更新用户数据
    const decorations = user.decorations || {}
    if (!decorations[type]) {
      decorations[type] = {}
    }

    // 免费商品永久有效，付费商品30天
    if (price === 0) {
      decorations[type][name] = {
        expireAt: null, // 永久
        buyTime: new Date().toISOString(),
        permanent: true
      }
    } else {
      const expireAt = new Date()
      expireAt.setDate(expireAt.getDate() + 30)
      decorations[type][name] = {
        expireAt: expireAt.toISOString(),
        buyTime: new Date().toISOString()
      }
    }

    await db.collection('users').doc(user._id).update({
      data: {
        coins: _.inc(-price),
        decorations: decorations
      }
    })

    return {
      success: true,
      message: '购买成功',
      data: {
        remainCoins: currentCoins - price,
        permanent: price === 0
      }
    }
  } catch (err) {
    console.error('购买失败:', err)
    return { success: false, message: '购买失败', error: err }
  }
}
