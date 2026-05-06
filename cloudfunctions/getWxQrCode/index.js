// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const { page = 'pages/index/index', scene = '' } = event

  try {
    // 调用微信接口生成小程序码
    // 使用 getUnlimited 接口，适用于需要的页面路径较少的场景
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: scene, // 场景值，最多32个字符
      page: page,   // 跳转页面
      width: 280,   // 二维码宽度
      auto_color: false,
      line_color: {
        r: 0,
        g: 176,
        b: 255
      },
      is_hyaline: false // 不透明背景
    })

    // result.buffer 是小程序码的 Buffer 数据
    // 需要上传到云存储，返回临时URL给前端使用
    const uploadResult = await cloud.uploadFile({
      cloudPath: `qrcodes/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`,
      fileContent: result.buffer
    })

    // 获取临时访问URL
    const urlResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })

    return {
      success: true,
      fileID: uploadResult.fileID,
      tempFileURL: urlResult.fileList[0].tempFileURL
    }
  } catch (err) {
    console.error('[getWxQrCode] 生成小程序码失败:', err)
    return {
      success: false,
      error: err.message || '生成小程序码失败'
    }
  }
}
