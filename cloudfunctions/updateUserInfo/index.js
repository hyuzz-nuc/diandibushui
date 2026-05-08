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

  const { nickName, avatarUrl, daily_goal, settings } = event

  const updateData = {}
  if (nickName !== undefined) updateData.nickName = nickName
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
  if (daily_goal !== undefined) updateData.daily_goal = daily_goal
  if (settings !== undefined) updateData.settings = settings

  // 更新时间
  updateData.updateTime = db.serverDate()

  try {
    // 先查询用户是否存在
    const userQuery = await db.collection('users').where({
      _openid: openid
    }).get()

    let userData = null

    if (userQuery.data.length > 0) {
      // 用户存在，更新
      await db.collection('users').where({
        _openid: openid
      }).update({
        data: updateData
      })

      // 获取更新后的用户数据
      const updatedUser = await db.collection('users').where({
        _openid: openid
      }).get()

      userData = updatedUser.data[0]
    } else {
      // 用户不存在，创建新用户
      const newUser = {
        _openid: openid,
        ...updateData,
        daily_goal: daily_goal || 2000,
        current_title: '饮水萌新',
        consecutive_days: 0,
        total_days: 0,
        createTime: db.serverDate()
      }

      await db.collection('users').add({
        data: newUser
      })

      userData = newUser
    }

    return {
      success: true,
      message: '更新成功',
      userInfo: userData
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      message: e.message
    }
  }
}
