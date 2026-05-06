// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 1. 获取当前用户已有的好友列表 (避免推荐已加好友)
    const myRelations = await db.collection('relations').where(_.or([
      { user_a: openid },
      { user_b: openid }
    ])).get()

    const friendIds = new Set()
    friendIds.add(openid) // 排除自己

    myRelations.data.forEach(rel => {
      friendIds.add(rel.user_a)
      friendIds.add(rel.user_b)
    })

    // 2. 查找活跃用户
    const users = await db.collection('users')
      .where({
        _openid: _.nin(Array.from(friendIds)),
        last_checkin_date: _.neq(null)
      })
      .limit(20)
      .get()

    // 3. 随机选取 5 个
    let candidates = users.data
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const DEFAULT_AVATAR = 'https://img.yzcdn.cn/vant/cat.jpeg';

    const recommendedUsers = candidates.slice(0, 5).map(u => ({
      openid: u._openid,
      nickname: u.nickname || u.nickName || '神秘水友',
      avatar_url: u.avatarUrl || u.avatar_url || DEFAULT_AVATAR,
      current_title: u.current_title || '饮水萌新',
      consecutive_days: u.consecutive_days || 0
    }))

    return {
      success: true,
      data: recommendedUsers
    }

  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}
