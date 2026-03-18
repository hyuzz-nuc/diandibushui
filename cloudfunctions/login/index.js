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
      userData = result.data[0]
      
      // 如果有传入新头像，更新数据库
      if (avatarUrl && avatarUrl.startsWith('cloud://')) {
        try {
          // 转换 cloud:// 为临时 URL
          const tempFile = await cloud.getTempFileURL({
            fileList: [avatarUrl]
          })
          
          if (tempFile.fileList && tempFile.fileList[0] && tempFile.fileList[0].tempFileURL) {
            // 更新数据库
            await db.collection('users').doc(openid).update({
              data: {
                avatarUrl: tempFile.fileList[0].tempFileURL
              }
            })
            userData.avatarUrl = tempFile.fileList[0].tempFileURL
            console.log('[login] 头像已更新为 HTTP URL:', userData.avatarUrl)
          }
        } catch (err) {
          console.error('[login] 头像转换失败:', err.message)
        }
      }
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