/**
 * 扫描 frontend/public/icons/ 下的 SVG 文件，
 * 生成 icon-index.json（图标搜索索引）
 *
 * 使用: cd frontend && npm run icons
 * 或:   npx tsx scripts/generate-icon-index.ts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

const ICONS_DIR = path.join(PROJECT_ROOT, 'frontend/public/icons')
const OUTPUT = path.join(ICONS_DIR, 'icon-index.json')

// 常用中英文同义词映射（辅助 AI 搜索）
const SYNONYMS: Record<string, string[]> = {
  search: ['find', 'lookup', 'magnifier', '搜索', '查找'],
  home: ['house', '首页', '主页'],
  settings: ['config', 'preferences', 'gear', 'options', '设置', '配置'],
  person: ['user', 'profile', 'account', 'avatar', '用户', '个人'],
  delete: ['remove', 'trash', 'bin', 'clear', '删除', '移除'],
  add: ['create', 'new', 'plus', '新增', '添加'],
  edit: ['pencil', 'write', 'modify', '编辑', '修改'],
  email: ['mail', 'message', 'contact', 'envelope', '邮件', '邮箱'],
  lock: ['secure', 'password', 'privacy', 'safety', '锁', '密码', '安全'],
  notifications: ['bell', 'alert', 'remind', '通知', '提醒', '铃铛'],
  favorite: ['heart', 'like', 'love', 'star', '收藏', '喜欢', '心形'],
  close: ['x', 'cancel', 'dismiss', 'exit', '关闭', '取消'],
  check: ['done', 'confirm', 'ok', 'tick', 'verify', '完成', '确认', '勾选'],
  menu: ['hamburger', 'list', '菜单', '导航'],
  info: ['information', 'help', 'about', 'detail', '信息', '关于'],
  warning: ['alert', 'caution', 'danger', 'error', '警告', '错误'],
  image: ['photo', 'picture', '图片', '照片', '图像'],
  calendar: ['date', 'schedule', 'event', '日历', '日期'],
  shopping_cart: ['cart', 'buy', 'shop', 'purchase', '购物车', '商城'],
  download: ['save', 'download', '下载'],
  upload: ['upload', '上传'],
  share: ['share', '分享'],
  music: ['audio', 'song', '音乐', '歌曲', '音频'],
  video: ['movie', 'film', '视频', '影片', '电影'],
  chat: ['message', 'talk', '消息', '聊天', '对话'],
  phone: ['call', 'telephone', '电话', '通话'],
  camera: ['photo', '拍照', '相机', '摄像'],
  arrow: ['direction', '箭头', '方向'],
  play: ['start', '播放', '开始'],
  pause: ['stop', '暂停', '停止'],
  file: ['document', '文件', '文档'],
  folder: ['directory', '文件夹', '目录'],
  star: ['favorite', 'rate', '星星', '评分'],
  bookmark: ['save', '收藏', '书签'],
  location: ['place', 'pin', '位置', '定位'],
  time: ['clock', '时间', '时钟'],
  key: ['password', '钥匙', '密钥'],
  link: ['chain', '链接', '连接'],
  cloud: ['云端', '云', '在线'],
  hospital: ['medical', 'health', '医院', '医疗', '健康'],
  badge: ['徽章', '标记'],
  shield: ['安全', '盾牌', '保护'],
  light: ['明亮', '亮度', '灯光'],
  dark: ['暗色', '夜晚', '夜间'],
  code: ['dev', 'programming', '代码', '开发', '编程'],
  dashboard: ['仪表盘', '面板', '仪表板'],
  map: ['地图', '导航'],
  chart: ['图表', '统计', '数据'],
  database: ['数据', '数据库', '存储'],
  sports: ['运动', '体育'],
  restaurant: ['dining', 'food', '餐厅', '餐饮', '食物'],
  weather: ['天气', '气候'],
  payment: ['money', '支付', '信用卡', '钱包'],
  transport: ['car', 'bus', 'train', '交通', '运输'],
  printer: ['打印'],
  scanner: ['扫描'],
  wifi: ['网络', '无线'],
  bluetooth: ['蓝牙'],
  battery: ['电池', '电量'],
  school: ['education', '学校', '教育'],
  workplace: ['work', '办公', '工作'],
  construction: ['build', '建筑', '工程'],
  medical: ['hospital', 'doctor', '医疗', '医学', '健康', '医院'],
}

interface IconEntry {
  name: string
  display: string
  file: string
  keywords: string[]
}

function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    console.error(`❌ 目录不存在: ${ICONS_DIR}`)
    console.error('请先把 SVG 图标放到 frontend/public/icons/ 下')
    process.exit(1)
  }

  const files = fs.readdirSync(ICONS_DIR)
    .filter(f => f.endsWith('.svg') && f !== 'icon-index.json')
    .sort()

  const index: IconEntry[] = files.map(file => {
    const name = path.basename(file, '.svg')

    // 从 snake_case 拆分关键词
    const segments = name.split('_')

    const keywords = new Set<string>([
      name,                                    // 全名 "flight_takeoff"
      name.replace(/_/g, ''),                  // 无分隔符 "flighttakeoff"（模糊匹配）
      ...segments,                              // 分词 "flight", "takeoff"
    ])

    // 查找同义词
    for (const seg of segments) {
      const syns = SYNONYMS[seg]
      if (syns) syns.forEach(s => keywords.add(s))
    }

    return {
      name,
      display: segments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      file,
      keywords: [...keywords].filter(Boolean),
    }
  })

  // 开发环境用美化格式，生产环境用压缩格式
  const isProd = process.env.NODE_ENV === 'production'
  const json = isProd ? JSON.stringify(index) : JSON.stringify(index, null, 2)
  fs.writeFileSync(OUTPUT, json, 'utf-8')

  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1)
  console.log(`✅ 已生成 ${OUTPUT}`)
  console.log(`   共 ${index.length} 个图标索引, ${sizeKB}KB (${isProd ? '压缩' : '美化'})`)
}

main()
