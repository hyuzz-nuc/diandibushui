// 云函数入口文件 - 定时发送喝水提醒
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 订阅消息模板 ID
const REMIND_TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo'

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('[定时提醒] 开始执行:', new Date().toLocaleString('zh-CN'))
  
  try {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute // 转换为分钟数
    
    console.log('[定时提醒] 当前时间:', `${currentHour}:${currentMinute}`, '分钟数:', currentTime)
    
    // 1. 获取所有开启了提醒的用户
    const usersRes = await db.collection('users').where({
      'settings.subscribeEnabled': true
    }).get()
    
    console.log('[定时提醒] 开启提醒的用户数:', usersRes.data.length)
    
    let successCount = 0
    let failCount = 0
    
    // 2. 遍历每个用户，检查是否需要发送提醒
    for (const user of usersRes.data) {
      try {
        const settings = user.settings || {}
        const startTime = settings.startTime || '09:00'
        const endTime = settings.endTime || '21:00'
        const interval = settings.interval || '1 小时'
        
        // 解析时间
        const [startHour, startMinute] = startTime.split(':').map(Number)
        const [endHour, endMinute] = endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMinute
        const endMinutes = endHour * 60 + endMinute
        
        // 解析间隔（转换为分钟）
        let intervalMinutes = 60 // 默认 1 小时
        if (interval.includes('30 分钟')) intervalMinutes = 30
        else if (interval.includes('1.5 小时')) intervalMinutes = 90
        else if (interval.includes('2 小时')) intervalMinutes = 120
        
        // 检查当前时间是否在提醒时间段内
        if (currentTime < startMinutes || currentTime > endMinutes) {
          continue // 不在提醒时间段内
        }
        
        // 检查是否到了提醒时间（整点或半点）
        const shouldRemind = (currentTime - startMinutes) % intervalMinutes === 0
        
        if (!shouldRemind) {
          continue // 还没到提醒时间
        }
        
        // 检查今日是否已喝够目标量
        const todayStart = new Date(now.setHours(0, 0, 0, 0)).getTime()
        const recordsRes = await db.collection('records').where({
          _openid: user._openid,
          timestamp: _.gte(todayStart)
        }).get()
        
        const todayTotal = recordsRes.data.reduce((sum, r) => sum + r.amount, 0)
        const dailyGoal = user.daily_goal || 2000
        
        if (todayTotal >= dailyGoal) {
          console.log('[定时提醒] 用户', user._openid, '今日已达标，跳过')
          continue
        }
        
        // 3. 发送订阅消息提醒
        await cloud.openapi.subscribeMessage.send({
          touser: user._openid,
          templateId: REMIND_TEMPLATE_ID,
          page: 'pages/index/index',
          data: {
            thing1: { value: '喝水小助手' },
            time2: { value: `${currentHour}:${String(currentMinute).padStart(2, '0')}` },
            thing3: { value: '该喝水啦！保持身体水分平衡～' }
          },
          miniprogramState: 'trial'
        })
        
        successCount++
        console.log('[定时提醒] 发送成功:', user._openid)
        
        // 避免频率限制，稍微延迟
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        failCount++
        console.error('[定时提醒] 发送失败:', user._openid, err.message)
      }
    }
    
    return {
      success: true,
      message: `定时提醒完成，成功：${successCount}, 失败：${failCount}`
    }
    
  } catch (err) {
    console.error('[定时提醒] 执行异常:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
