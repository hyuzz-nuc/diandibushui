// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 请将此处的模板 ID 替换为您在微信公众平台申请的真实模板 ID
// 模板标题建议：喝水提醒
// 关键词建议：温馨提示 (thing1)、提醒时间 (time2)、备注 (thing3)
const DEFAULT_TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo'; 

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID
  
  const { friendOpenid, friendName, templateId } = event
  const TEMPLATE_ID = templateId || DEFAULT_TEMPLATE_ID;

  if (!friendOpenid) {
    return { success: false, message: '参数错误：friendOpenid 不能为空' }
  }

  try {
    // 1. 获取发送者（我）的信息，用于在消息中显示是谁提醒的
    const myInfo = await db.collection('users').doc(myOpenid).get().then(res => res.data).catch(() => ({}))
    const myName = myInfo.nickName || myInfo.nickname || '你的好友';

    // 2. 发送订阅消息
    // 注意：接收者必须之前已经授权过该模板 ID，否则会发送失败
    // 在实际生产环境中，应该先检查数据库中该用户是否有可用的订阅次数
    
    // 临时调试：强制使用模拟模式（解决权限问题 -604101）
    // 删除下面这行 `if (true ||` 和最后的 `)` 即可启用真实发送
    // 注意：体验版小程序需要 miniprogramState: 'trial'
    if (true || !TEMPLATE_ID || TEMPLATE_ID === 'YOUR_TEMPLATE_ID_HERE') {
      console.log(`[模拟发送] 向用户 ${friendOpenid} 发送提醒：${myName} 叫你喝水啦！`)
      return {
        success: true,
        message: '模拟提醒成功（模板权限问题，已临时禁用真实发送）',
        isSimulated: true
      }
    }

    const result = await cloud.openapi.subscribeMessage.send({
      touser: friendOpenid,
      templateId: TEMPLATE_ID,
      page: 'pages/index/index', // 点击消息卡片跳转的页面
      data: {
        thing1: {
          value: '该喝水啦！'
        },
        time2: {
          value: new Date().toLocaleString() // 简单格式化，实际建议用 dayjs
        },
        thing3: {
          value: `${myName} 喊你起来喝水~`
        }
      },
      miniprogramState: 'trial' // 跳转小程序类型：developer 为开发版；trial 为体验版；formal 为正式版
    })

    return {
      success: true,
      data: result
    }

  } catch (err) {
    console.error(err)
    
    // 错误码 43101: 用户拒绝接受消息，或没有订阅
    if (err.errCode === 43101) {
      return {
        success: false,
        message: '对方暂未开启提醒权限',
        errCode: 43101
      }
    }

    return {
      success: false,
      error: err,
      message: '发送失败'
    }
  }
}
