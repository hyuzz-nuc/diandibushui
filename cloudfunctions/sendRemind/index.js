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
    console.log('[sendRemind] 发送者 openid:', myOpenid);
    console.log('[sendRemind] 接收者 openid:', friendOpenid);
    
    let myInfo = {};
    try {
      const userRes = await db.collection('users').doc(myOpenid).get();
      myInfo = userRes.data;
      console.log('[sendRemind] 用户信息:', myInfo);
    } catch (err) {
      console.error('[sendRemind] 获取用户信息失败:', err);
    }
    
    const myName = myInfo.nickName || myInfo.nickname || '好友';
    console.log('[sendRemind] 提醒人昵称:', myName);

    // 2. 发送订阅消息
    // 注意：接收者必须之前已经授权过该模板 ID，否则会发送失败
    // 在实际生产环境中，应该先检查数据库中该用户是否有可用的订阅次数
    
    // 如果没有配置模板 ID，返回模拟成功
    if (!TEMPLATE_ID || TEMPLATE_ID === 'YOUR_TEMPLATE_ID_HERE') {
      console.log(`[模拟发送] 向用户 ${friendOpenid} 发送提醒：${myName} 叫你喝水啦！`)
      return {
        success: true,
        message: '已模拟发送提醒（请配置真实模板 ID）',
        isSimulated: true
      }
    }

    // 格式化时间（微信订阅消息要求格式，转换为中国时区 UTC+8）
    const now = new Date();
    // 转换为 UTC+8 时间（中国标准时间）
    const utc8Time = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const year = utc8Time.getUTCFullYear();
    const month = String(utc8Time.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8Time.getUTCDate()).padStart(2, '0');
    const hours = String(utc8Time.getUTCHours()).padStart(2, '0');
    const minutes = String(utc8Time.getUTCMinutes()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hours}:${minutes}`;
    console.log('[sendRemind] 当前 UTC 时间:', now.toISOString());
    console.log('[sendRemind] 转换后北京时间:', timeStr);
    
    console.log('[sendRemind] 发送数据:', {
      thing1: myName,
      time2: timeStr,
      thing3: '该喝水啦！记得及时补充水分哦～'
    });
    
    const result = await cloud.openapi.subscribeMessage.send({
      touser: friendOpenid,
      templateId: TEMPLATE_ID,
      page: 'pages/index/index', // 点击消息卡片跳转的页面
      data: {
        thing1: {
          value: myName // 提醒人
        },
        time2: {
          value: timeStr // 时间：2026-03-18 10:21
        },
        thing3: {
          value: '该喝水啦！记得及时补充水分哦～' // 温馨提醒
        }
      },
      miniprogramState: 'trial' // 跳转小程序类型：developer 为开发版；trial 为体验版；formal 为正式版
    })

    return {
      success: true,
      message: '提醒发送成功',
      // 不返回 result.data，避免 BigInt 序列化问题
      sendTime: timeStr
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
