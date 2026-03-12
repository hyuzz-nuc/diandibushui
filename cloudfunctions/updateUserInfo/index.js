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
  
  const { nickName, avatarUrl, daily_goal } = event
  
  const updateData = {}
  if (nickName !== undefined) updateData.nickName = nickName
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
  if (daily_goal !== undefined) updateData.daily_goal = daily_goal
  
  // 更新时间
  updateData.updateTime = db.serverDate()
  
  try {
    // 先查询用户是否存在
    const userQuery = await db.collection('users').where({
      _openid: openid
    }).get()
    
    if (userQuery.data.length > 0) {
      // 更新
      await db.collection('users').where({
        _openid: openid
      }).update({
        data: updateData
      })
      
      return {
        success: true,
        message: '更新成功'
      }
    } else {
      // 如果用户不存在（理论上不应该，因为有login），则创建
      await db.collection('users').add({
        data: {
          _openid: openid,
          ...updateData,
          createTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '创建并更新成功'
      }
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      message: e.message
    }
  }
}
