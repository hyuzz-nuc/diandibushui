// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatYMD(date) {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { amount } = event

  if (!amount) {
    return { success: false, message: '饮水量不能为空' }
  }

  // 获取今日零点时间戳
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
  const now = new Date()

  try {
    // 1. 插入喝水记录
    await db.collection('records').add({
      data: {
        _openid: openid,
        amount: Number(amount),
        timestamp: Date.now(),
        date_str: formatYMD(now),
        createTime: db.serverDate()
      }
    })

    // 2. 检查是否达标
    // 拉取今日所有记录
    const records = await db.collection('records')
      .where({
        _openid: openid,
        timestamp: _.gte(todayStart)
      })
      .get()
    
    const totalAmount = records.data.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    
    // 获取用户目标（默认2000）
    let dailyGoal = 2000
    const userRes = await db.collection('users').where({ _openid: openid }).get()
    let userData = null
    
    if (userRes.data.length > 0) {
      userData = userRes.data[0]
      dailyGoal = userData.daily_goal || 2000
    } else {
      // 如果用户不存在，静默创建
      await db.collection('users').add({
        data: {
          _openid: openid,
          daily_goal: 2000,
          current_title: '饮水萌新',
          consecutive_days: 0,
          total_days: 0,
          createTime: db.serverDate()
        }
      })
      // 重新获取
      const newUser = await db.collection('users').where({ _openid: openid }).get()
      userData = newUser.data[0]
    }

    let isTargetReached = false
    let newTitle = null
    let titleUpgraded = false
    let consecutiveDays = userData.consecutive_days || 0

    // 判定逻辑：使用 checkins 集合作为原子锁，防止并发重复打卡
    const todayStr = formatYMD(now)
    const checkinId = `${openid}_${todayStr}`
    const yesterdayStr = formatYMD(new Date(now.getTime() - 24 * 60 * 60 * 1000))

    if (totalAmount >= dailyGoal) {
      try {
        // 尝试插入打卡记录，利用 _id 唯一性保证幂等
        // 如果 checkins 集合不存在，云开发会自动创建（但在某些环境下可能需要手动，建议在控制台确认）
        await db.collection('checkins').add({
          data: {
            _id: checkinId,
            _openid: openid,
            date_str: todayStr,
            createTime: db.serverDate()
          }
        })

        // 如果上面没有抛出错误，说明是今天首次达标
        isTargetReached = true
        
        // 更新用户统计数据
        const prevConsecutive = userData.consecutive_days || 0
        const lastCheckinDate = userData.last_checkin_date
        const newConsecutiveDays = lastCheckinDate === yesterdayStr ? (prevConsecutive + 1) : 1
        const newTotalDays = (userData.total_days || 0) + 1
        consecutiveDays = newConsecutiveDays
        
        // 称号计算
        const currentTitle = userData.current_title
        if (newConsecutiveDays >= 30) newTitle = '饮水大神'
        else if (newConsecutiveDays >= 15) newTitle = '饮水王者'
        else if (newConsecutiveDays >= 7) newTitle = '饮水达人'
        else if (newConsecutiveDays >= 3) newTitle = '饮水萌新'
        
        // 检查是否升级
        if (newTitle && newTitle !== currentTitle) {
          titleUpgraded = true
        }

        await db.collection('users').where({
          _openid: openid
        }).update({
          data: {
            last_checkin_date: todayStr,
            consecutive_days: newConsecutiveDays,
            total_days: newTotalDays,
            current_title: newTitle || currentTitle,
            updateTime: db.serverDate()
          }
        })

      } catch (e) {
        // 如果报错（duplicate key error），说明今天已经打过卡了
        console.log('Today already checked in, skipping update.', e)
        // isTargetReached 保持 false，避免重复弹窗
      }
    }

    return {
      success: true,
      data: {
        totalAmount,
        dailyGoal,
        consecutiveDays,
        isTargetReached,
        titleUpgraded,
        newTitle
      }
    }

  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}
