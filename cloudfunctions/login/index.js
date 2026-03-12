// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询数据库中是否已有该用户
    const result = await db.collection('users').where({
      _openid: openid
    }).get()

    let userData = null
    if (result.data.length > 0) {
      userData = result.data[0]
    } else {
      // 如果没有，可以返回基础信息，或者在这里静默注册（为了简单，我们先只返回 openid，注册留给 updateUserInfo）
    }

    return {
      openid: openid,
      userInfo: userData
    }
  } catch (err) {
    console.error(err)
    return {
      openid: openid,
      userInfo: null,
      error: err
    }
  }
}