// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 任务经验配置
const TASK_EXP = {
  // 每日任务
  1: 10,  // 每日签到
  2: 15,  // 记录喝水3次
  3: 20,  // 达成每日目标
  4: 10,  // 提醒好友喝水
  // 成长任务
  101: 30,   // 连续打卡3天
  102: 50,   // 连续打卡7天
  103: 80,   // 连续打卡15天
  104: 150   // 连续打卡30天
}

// 任务金币配置
const TASK_COINS = {
  // 每日任务
  1: 10,  // 每日签到
  2: 15,  // 记录喝水3次
  3: 20,  // 达成每日目标
  4: 10,  // 提醒好友喝水
  // 成长任务
  101: 30,   // 连续打卡3天
  102: 50,   // 连续打卡7天
  103: 80,   // 连续打卡15天
  104: 150   // 连续打卡30天
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { taskId } = event

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    const user = userRes.data[0]

    // 检查是否已领取过此任务奖励
    const claimedTasks = user.claimedTasks || []
    if (claimedTasks.includes(taskId)) {
      return { success: false, message: '已领取过奖励' }
    }

    // 获取任务经验和金币
    const exp = TASK_EXP[taskId] || 0
    const coins = TASK_COINS[taskId] || 0
    if (exp === 0) {
      return { success: false, message: '任务不存在' }
    }

    // 更新用户经验
    const newExp = (user.exp || 0) + exp

    // 计算新等级
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
        coins: _.inc(coins),
        claimedTasks: _.push(taskId)
      }
    })

    return {
      success: true,
      message: '领取成功',
      data: {
        exp,
        coins,
        totalExp: newExp,
        title: newTitle,
        titleUpgraded: newTitle !== user.title
      }
    }
  } catch (err) {
    console.error('领取任务奖励失败:', err)
    return {
      success: false,
      message: '领取失败',
      error: err
    }
  }
}
