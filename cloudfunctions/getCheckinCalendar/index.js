const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatYM(year, month) {
  return `${year}-${pad2(month)}`
}

function formatYMD(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startOfMonth(year, month) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0).getTime()
}

function startOfNextMonth(year, month) {
  if (month === 12) return new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime()
  return new Date(year, month, 1, 0, 0, 0, 0).getTime()
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const now = new Date()
  const year = Number(event && event.year) || now.getFullYear()
  const month = Number(event && event.month) || (now.getMonth() + 1)

  const monthStart = startOfMonth(year, month)
  const monthEnd = startOfNextMonth(year, month)

  try {
    const userRes = await db.collection('users').where({ _openid: openid }).get()
    const user = userRes.data && userRes.data[0]
    const dailyGoal = (user && user.daily_goal) || 2000
    const consecutiveDays = (user && user.consecutive_days) || 0
    const totalDays = (user && user.total_days) || 0
    const currentTitle = (user && user.current_title) || '饮水萌新'

    const recordsRes = await db.collection('records')
      .where({
        _openid: openid,
        timestamp: _.gte(monthStart).and(_.lt(monthEnd))
      })
      .get()

    const amountByDay = Object.create(null)
    for (const r of recordsRes.data) {
      const key = formatYMD(new Date(r.timestamp))
      amountByDay[key] = (amountByDay[key] || 0) + (Number(r.amount) || 0)
    }

    const reachedDates = []
    let reachedCount = 0

    const daysInMonth = new Date(year, month, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad2(month)}-${pad2(d)}`
      const amount = amountByDay[key] || 0
      if (amount >= dailyGoal) {
        reachedDates.push(key)
        reachedCount++
      }
    }

    const avgAmount = daysInMonth > 0 ? Math.round(Object.values(amountByDay).reduce((s, x) => s + x, 0) / daysInMonth) : 0
    const reachRate = daysInMonth > 0 ? Math.round((reachedCount / daysInMonth) * 100) : 0

    let series = null;
    if (event.includeWeek) {
      // 获取过去7天的数据
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      const weekRecordsRes = await db.collection('records')
        .where({
          _openid: openid,
          timestamp: _.gte(sevenDaysAgo)
        })
        .get();
        
      const weekAmountByDay = {};
      for (const r of weekRecordsRes.data) {
        const key = formatYMD(new Date(r.timestamp));
        weekAmountByDay[key] = (weekAmountByDay[key] || 0) + (Number(r.amount) || 0);
      }
      
      series = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const k = formatYMD(d);
        series.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          amount: weekAmountByDay[k] || 0
        });
      }
    }

    return {
      success: true,
      data: {
        month: formatYM(year, month),
        year,
        monthNum: month,
        dailyGoal,
        consecutiveDays,
        totalDays,
        currentTitle,
        reachedDates,
        amountByDay,
        daysInMonth,
        reachedCount,
        reachRate,
        avgAmount,
        series
      }
    }
  } catch (err) {
    return { success: false, error: err }
  }
}

