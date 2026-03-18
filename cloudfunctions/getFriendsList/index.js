// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const myOpenid = wxContext.OPENID

  // 获取今日零点时间戳
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()

  try {
    // 1. 查找所有好友关系
    const relations = await db.collection('relations').where(_.or([
      { user_a: myOpenid },
      { user_b: myOpenid }
    ])).get()

    if (relations.data.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 提取好友 openid 列表
    const friendOpenids = relations.data.map(r => {
      return r.user_a === myOpenid ? r.user_b : r.user_a
    })

    // 3. 聚合查询：同时获取好友信息和今日喝水总量
    // 由于 aggregate 跨表联查比较复杂，这里为了逻辑清晰，拆分为两步并行查询
    // (小规模数据下性能差异不大，且代码更易维护)

    const friendsDataPromise = db.collection('users')
      .where({
        _openid: _.in(friendOpenids)
      })
      .get()

    // 4. 批量查询所有好友今日的记录
    const recordsPromise = db.collection('records')
      .where({
        _openid: _.in(friendOpenids),
        timestamp: _.gte(todayStart)
      })
      .get()

    const [friendsRes, recordsRes] = await Promise.all([friendsDataPromise, recordsPromise])
    
    // 5. 数据组装
    const DEFAULT_AVATAR = 'https://img.yzcdn.cn/vant/cat.jpeg'; // Vant 默认头像
    
    const result = await Promise.all(friendsRes.data.map(async (user) => {
      // 计算该好友今日总量
      const userRecords = recordsRes.data.filter(r => r._openid === user._openid)
      const todayAmount = userRecords.reduce((sum, r) => sum + r.amount, 0)
      
      const dailyGoal = user.daily_goal || 2000
      
      // 处理头像：如果是云存储路径，转换为临时访问 URL
      let avatarUrl = DEFAULT_AVATAR;
      
      if (user.avatarUrl) {
        console.log('[getFriendsList] 原始头像路径:', user.avatarUrl);
        
        // 检查是否是云存储路径
        if (user.avatarUrl.startsWith('cloud://')) {
          console.log('[getFriendsList] 检测到云存储路径，开始转换...');
          
          try {
            const tempFilePath = await cloud.getTempFileURL({
              fileList: [user.avatarUrl]
            });
            
            console.log('[getFriendsList] getTempFileURL 返回:', JSON.stringify(tempFilePath));
            
            if (tempFilePath.fileList && 
                tempFilePath.fileList.length > 0 && 
                tempFilePath.fileList[0].tempFileURL) {
              avatarUrl = tempFilePath.fileList[0].tempFileURL;
              console.log('[getFriendsList] ✅ 转换成功，临时 URL:', avatarUrl);
            } else {
              console.warn('[getFriendsList] ❌ tempFileURL 为空，使用默认头像');
            }
          } catch (err) {
            console.error('[getFriendsList] ❌ getTempFileURL 异常:', err.message);
          }
        } else if (user.avatarUrl.startsWith('http://') || user.avatarUrl.startsWith('https://')) {
          console.log('[getFriendsList] ✅ 使用 HTTP URL:', user.avatarUrl);
          avatarUrl = user.avatarUrl;
        } else {
          console.warn('[getFriendsList] ❌ 未知路径格式，使用默认头像');
        }
      }
      
      // 最终确认
      console.log('[getFriendsList] 最终 avatarUrl:', avatarUrl);
      if (!avatarUrl || avatarUrl.startsWith('cloud://')) {
        console.log('[getFriendsList] ⚠️ 头像 URL 无效，使用默认头像');
        avatarUrl = DEFAULT_AVATAR;
      }
      console.log('[getFriendsList] 📤 返回的 avatar_url:', avatarUrl);

      return {
        openid: user._openid,
        nickname: user.nickName || user.nickname || '未命名',
        avatar_url: avatarUrl,
        current_title: user.current_title || '饮水萌新',
        today_water: todayAmount,
        daily_goal: dailyGoal,
        is_target_reached: todayAmount >= dailyGoal
      }
    }))

    return {
      success: true,
      data: result
    }

  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}