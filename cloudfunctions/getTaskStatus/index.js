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

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const user = userRes.data[0]

    // 获取今日记录
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const recordRes = await db.collection('records').where({
      _openid: openid,
      date: todayStr
    }).get()

    // 计算今日喝水量
    let todayWater = 0
    let drinkCount = 0
    if (recordRes.data.length > 0) {
      recordRes.data.forEach(record => {
        todayWater += record.amount || 0
        drinkCount++
      })
    }

    // 获取连续打卡天数
    const consecutiveDays = user.consecutiveDays || 0

    // 获取经验值
    const exp = user.exp || 0

    // 获取每日目标
    const dailyGoal = user.daily_goal || 2000

    // 获取已领取的任务列表
    const claimedTasks = user.claimedTasks || []

    // 计算每日任务状态
    const dailyTasks = {
      login: true, // 进入页面即签到成功
      drinkCount: drinkCount,
      remindFriends: user.remindFriendsToday || 0
    }

    // 返回任务数据
    return {
      success: true,
      data: {
        exp,
        dailyTasks,
        growthTasks: {},
        consecutiveDays,
        todayWater,
        dailyGoal,
        claimedTasks
      }
    }
  } catch (err) {
    console.error('获取任务状态失败:', err)
    return {
      success: false,
      message: '获取任务状态失败',
      error: err
    }
  }
}
