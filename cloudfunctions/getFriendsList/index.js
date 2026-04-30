// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

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

    // 3. 聚合查询：同时获取好友信息和今日喝水总量
    // 由于 aggregate 跨表联查比较复杂，这里为了逻辑清晰，拆分为两步并行查询
    // (小规模数据下性能差异不大，且代码更易维护)

    const friendsDataPromise = db.collection('users')
      .where({
        _openid: _.in(friendOpenids)
      })
      .get()

    // 4. 批量查询所有好友今日的记录
    const recordsPromise = db.collection('records')
      .where({
        _openid: _.in(friendOpenids),
        timestamp: _.gte(todayStart)
      })
      .get()

    const [friendsRes, recordsRes] = await Promise.all([friendsDataPromise, recordsPromise])
    
    // 5. 数据组装
    const DEFAULT_AVATAR = 'https://img.yzcdn.cn/vant/cat.jpeg';

    const result = friendsRes.data.map((user) => {
      // 计算该好友今日总量
      const userRecords = recordsRes.data.filter(r => r._openid === user._openid)
      const todayAmount = userRecords.reduce((sum, r) => sum + r.amount, 0)

      const dailyGoal = user.daily_goal || 2000

      // 获取用户头像，优先使用 avatarUrl，其次 avatar_url，最后默认头像
      const avatarUrl = user.avatarUrl || user.avatar_url || DEFAULT_AVATAR

      return {
        openid: user._openid,
        nickname: user.nickName || user.nickname || '未命名',
        avatar_url: avatarUrl,
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