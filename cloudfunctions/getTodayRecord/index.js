// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 获取今日零点时间戳
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()

  try {
    const result = await db.collection('records')
      .where({
        _openid: wxContext.OPENID,
        timestamp: _.gte(todayStart)
      })
      .get()

    // 计算今日总水量
    const totalAmount = result.data.reduce((sum, record) => sum + record.amount, 0)

    return {
      success: true,
      data: {
        records: result.data,
        totalAmount: totalAmount
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}