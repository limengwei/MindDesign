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
  delete: ['remove', 'trash', 'bin', 'clear', '删除'],
  add: ['create', 'new', 'plus', '新增', '添加'],
  edit: ['pencil', 'write', 'modify', '编辑', '修改'],
  email: ['mail', 'message', 'contact', 'envelope', '邮件', '邮箱'],
  lock: ['secure', 'password', 'privacy', 'safety', '锁', '密码'],
  notifications: ['bell', 'alert', 'remind', '通知', '提醒'],
  favorite: ['heart', 'like', 'love', 'star', '收藏', '喜欢'],
  close: ['x', 'cancel', 'dismiss', 'exit', '关闭'],
  check: ['done', 'confirm', 'ok', 'tick', 'verify', '完成', '确认'],
  menu: ['hamburger', 'list', '菜单'],
  info: ['information', 'help', 'about', 'detail', '信息', '关于'],
  warning: ['alert', 'caution', 'danger', 'error', '警告', '错误'],
  image: ['photo', 'picture', '图片', '照片'],
  calendar: ['date', 'schedule', 'event', '日历', '日期'],
  shopping_cart: ['cart', 'buy', 'shop', 'purchase', '购物车'],
  download: ['save', 'download', '下载'],
  upload: ['upload', '上传'],
  share: ['share', '分享'],
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
