// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  const { friendOpenid } = event

  if (!friendOpenid) {
    return { success: false, message: '好友ID不能为空' }
  }

  if (myOpenid === friendOpenid) {
    return { success: false, message: '不能绑定自己哦' }
  }

  try {
    // 1. 检查是否已经绑定
    const existRelation = await db.collection('relations').where(_.or([
      { user_a: myOpenid, user_b: friendOpenid },
      { user_a: friendOpenid, user_b: myOpenid }
    ])).get()

    if (existRelation.data.length > 0) {
      return { success: false, message: '你们已经是好友啦' }
    }

    // 2. 创建绑定关系 (双向)
    await db.collection('relations').add({
      data: {
        user_a: myOpenid,
        user_b: friendOpenid,
        status: 'active',
        created_at: db.serverDate(),
        permissions: {
          show_data: true // 默认允许对方看数据
        }
      }
    })

    return {
      success: true,
      message: '绑定成功'
    }

  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}