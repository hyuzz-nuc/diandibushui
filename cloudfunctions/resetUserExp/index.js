// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 1. 重置所有用户经验为0
    const usersRes = await db.collection('users').get()
    let resetCount = 0

    for (const user of usersRes.data) {
      await db.collection('users').doc(user._id).update({
        data: {
          exp: 0,
          title: '饮水小白'
        }
      })
      resetCount++
    }

    // 2. 发送福利礼包给所有用户
    const welfareData = {
      type: 'welfare',
      title: '🎁 新手福利礼包',
      desc: '恭喜获得「饮水小白」称号 + 50经验值！',
      content: {
        title: '饮水小白',
        exp: 50
      },
      date: new Date().toISOString(),
      read: false
    }

    // 为每个用户添加福利消息
    for (const user of usersRes.data) {
      // 检查是否已有此福利
      const existWelfare = await db.collection('welfares').where({
        _openid: user._openid,
        type: 'welfare',
        'content.title': '饮水小白'
      }).get()

      if (existWelfare.data.length === 0) {
        await db.collection('welfares').add({
          data: {
            ...welfareData,
            _openid: user._openid
          }
        })
      }
    }

    return {
      success: true,
      message: `已重置 ${resetCount} 个用户的经验值，并发放新手福利礼包`,
      resetCount
    }
  } catch (err) {
    console.error('重置经验失败:', err)
    return {
      success: false,
      message: '重置失败',
      error: err
    }
  }
}
