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

function startOfDayTs(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const range = (event && event.range) || 'week'
  const days = range === 'month' ? 30 : 7

  const todayStart = startOfDayTs(new Date())
  const startTs = todayStart - (days - 1) * 24 * 60 * 60 * 1000

  try {
    const userRes = await db.collection('users').where({ _openid: openid }).get()
    const user = userRes.data && userRes.data[0]
    const dailyGoal = (user && user.daily_goal) || 2000

    const recordsRes = await db.collection('records')
      .where({
        _openid: openid,
        timestamp: _.gte(startTs)
      })
      .get()

    const map = Object.create(null)
    for (const r of recordsRes.data) {
      const key = formatYMD(new Date(r.timestamp))
      map[key] = (map[key] || 0) + (Number(r.amount) || 0)
    }

    const series = []
    for (let i = 0; i < days; i++) {
      const dayTs = startTs + i * 24 * 60 * 60 * 1000
      const key = formatYMD(new Date(dayTs))
      const amount = map[key] || 0
      series.push({
        date: key,
        amount,
        reached: amount >= dailyGoal
      })
    }

    return {
      success: true,
      data: {
        range,
        days,
        dailyGoal,
        series
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}

