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
  const { welfareId } = event

  try {
    // 获取福利信息
    const welfareRes = await db.collection('welfares').doc(welfareId).get()

    if (!welfareRes.data) {
      return { success: false, message: '福利不存在' }
    }

    const welfare = welfareRes.data

    if (welfare._openid !== openid) {
      return { success: false, message: '无权领取' }
    }

    if (welfare.claimed) {
      return { success: false, message: '已领取过' }
    }

    // 发放奖励
    const { title, exp } = welfare.content || {}

    // 更新用户经验
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length > 0) {
      const user = userRes.data[0]
      const newExp = (user.exp || 0) + (exp || 0)

      await db.collection('users').doc(user._id).update({
        data: {
          exp: newExp,
          title: title || user.title
        }
      })
    }

    // 标记福利已领取
    await db.collection('welfares').doc(welfareId).update({
      data: {
        claimed: true,
        claimTime: new Date().toISOString(),
        read: true
      }
    })

    return {
      success: true,
      message: '领取成功',
      data: {
        exp: exp || 0,
        title: title || ''
      }
    }
  } catch (err) {
    console.error('领取福利失败:', err)
    return {
      success: false,
      message: '领取失败',
      error: err
    }
  }
}
