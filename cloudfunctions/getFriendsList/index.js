// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID

  // 获取今日零点时间戳
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()

  try {
    // 1. 查找所有好友关系
    const relations = await db.collection('relations').where(_.or([
      { user_a: myOpenid },
      { user_b: myOpenid }
    ])).get()

    if (relations.data.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 提取好友 openid 列表
    const friendOpenids = relations.data.map(r => {
      return r.user_a === myOpenid ? r.user_b : r.user_a
    })

    // 3. 查询好友信息和今日喝水记录
    const friendsDataPromise = db.collection('users')
      .where({
        _openid: _.in(friendOpenids)
      })
      .get()

    const recordsPromise = db.collection('records')
      .where({
        _openid: _.in(friendOpenids),
        timestamp: _.gte(todayStart)
      })
      .get()

    const [friendsRes, recordsRes] = await Promise.all([friendsDataPromise, recordsPromise])

    // 4. 数据组装
    const DEFAULT_AVATAR = 'https://img.yzcdn.cn/vant/cat.jpeg';

    const result = friendsRes.data.map((user) => {
      const userRecords = recordsRes.data.filter(r => r._openid === user._openid)
      const todayAmount = userRecords.reduce((sum, r) => sum + r.amount, 0)
      const dailyGoal = user.daily_goal || 2000

      return {
        openid: user._openid,
        nickname: user.nickName || user.nickname || '未命名',
        avatar_url: user.avatarUrl || user.avatar_url || DEFAULT_AVATAR,
        current_title: user.current_title || '饮水萌新',
        today_water: todayAmount,
        daily_goal: dailyGoal,
        is_target_reached: todayAmount >= dailyGoal
      }
    })

    return {
      success: true,
      data: result
    }

  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}