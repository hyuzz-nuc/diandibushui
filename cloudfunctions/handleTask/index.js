// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 任务经验配置
const TASK_EXP = {
  1: 10, 2: 15, 3: 20, 4: 10,
  101: 30, 102: 50, 103: 80, 104: 150
}

// 任务金币配置
const TASK_COINS = {
  1: 10, 2: 15, 3: 20, 4: 10,
  101: 30, 102: 50, 103: 80, 104: 150
}

// 等级配置
const LEVEL_CONFIG = [
  { level: 1, exp: 0, title: '饮水小白' },
  { level: 2, exp: 100, title: '饮水萌新' },
  { level: 3, exp: 300, title: '饮水达人' },
  { level: 4, exp: 600, title: '饮水高手' },
  { level: 5, exp: 1000, title: '饮水王者' },
  { level: 6, exp: 1500, title: '饮水大神' },
  { level: 7, exp: 2500, title: '饮水宗师' },
  { level: 8, exp: 4000, title: '传奇水神' }
]

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, taskId } = event

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    const user = userRes.data[0]

    // 获取今日记录
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    const recordRes = await db.collection('records').where({
      _openid: openid,
      timestamp: _.gte(todayStart)
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

    // 获取用户数据
    const consecutiveDays = user.consecutiveDays || 0
    const exp = user.exp || 0
    const dailyGoal = user.daily_goal || 2000
    const claimedTasks = user.claimedTasks || []

    // ========== 获取任务状态 ==========
    if (action === 'get' || !action) {
      const dailyTasks = {
        login: true,
        drinkCount: drinkCount,
        remindFriends: user.remindFriendsToday || 0
      }

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
    }

    // ========== 领取任务奖励 ==========
    if (action === 'claim') {
      if (!taskId) {
        return { success: false, message: '缺少任务ID' }
      }

      // 检查是否已领取
      if (claimedTasks.includes(taskId)) {
        return { success: false, message: '已领取过奖励' }
      }

      // 获取任务奖励
      const taskExp = TASK_EXP[taskId] || 0
      const taskCoins = TASK_COINS[taskId] || 0
      if (taskExp === 0) {
        return { success: false, message: '任务不存在' }
      }

      // 计算新经验和新称号
      const newExp = exp + taskExp
      let newTitle = user.title || '饮水小白'
      for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (newExp >= LEVEL_CONFIG[i].exp) {
          newTitle = LEVEL_CONFIG[i].title
          break
        }
      }

      // 更新用户数据
      await db.collection('users').doc(user._id).update({
        data: {
          exp: newExp,
          title: newTitle,
          coins: _.inc(taskCoins),
          claimedTasks: _.push(taskId)
        }
      })

      return {
        success: true,
        message: '领取成功',
        data: {
          exp: taskExp,
          coins: taskCoins,
          totalExp: newExp,
          title: newTitle,
          titleUpgraded: newTitle !== user.title
        }
      }
    }

    return { success: false, message: '未知操作' }

  } catch (err) {
    console.error('任务操作失败:', err)
    return { success: false, message: '操作失败', error: err }
  }
}
