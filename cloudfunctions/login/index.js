// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { avatarUrl, nickName } = event || {}

  try {
    // 查询数据库中是否已有该用户
    const result = await db.collection('users').where({
      _openid: openid
    }).get()

    let userData = null

    if (result.data.length > 0) {
      // 用户已存在，返回用户数据
      userData = result.data[0]

      // 如果前端传入了新的头像URL，更新数据库
      if (avatarUrl) {
        try {
          await db.collection('users').where({
            _openid: openid
          }).update({
            data: {
              avatarUrl: avatarUrl
            }
          })
          userData.avatarUrl = avatarUrl
          console.log('[login] 头像已更新:', avatarUrl)
        } catch (err) {
          console.error('[login] 头像更新失败:', err.message)
        }
      }

      // 如果前端传入了新的昵称，更新数据库
      if (nickName) {
        try {
          await db.collection('users').where({
            _openid: openid
          }).update({
            data: {
              nickName: nickName
            }
          })
          userData.nickName = nickName
          console.log('[login] 昵称已更新:', nickName)
        } catch (err) {
          console.error('[login] 昵称更新失败:', err.message)
        }
      }

    } else {
      // 用户不存在，创建新用户
      console.log('[login] 新用户，创建记录')
      const newUser = {
        _openid: openid,
        daily_goal: 2000,
        current_title: '饮水萌新',
        consecutive_days: 0,
        total_days: 0,
        coins: 0,
        exp: 0,
        level: 1,
        createTime: db.serverDate()
      }

      if (avatarUrl) {
        newUser.avatarUrl = avatarUrl
      }
      if (nickName) {
        newUser.nickName = nickName
      }

      await db.collection('users').add({
        data: newUser
      })

      userData = newUser
    }

    return {
      openid: openid,
      userInfo: userData,
      // 商城数据合并返回
      shopData: {
        coins: userData.coins || 0,
        level: userData.level || 1,
        decorations: userData.decorations || {}
      }
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
