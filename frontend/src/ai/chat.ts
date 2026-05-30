import type { ElementTree } from '../types/element'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import { buildSystemPrompt } from '../prompts/system'
import { searchIcons } from './tools'

const MOCK_TREES: Record<string, ElementTree> = {
  button: {
    type: 'Frame',
    width: 200,
    height: 48,
    fill: '#EF4444',
    cornerRadius: 24,
    autoLayout: {
      direction: 'row',
      gap: 8,
      align: 'center',
    },
    children: [
      { type: 'Icon', name: 'search', size: 20, color: '#FFFFFF' },
      { type: 'Text', text: '搜索', fontSize: 16, fill: '#FFFFFF', fontWeight: 500 },
    ],
  },
  login: {
    type: 'Frame',
    width: 375,
    fill: '#FFFFFF',
    autoLayout: { direction: 'column', gap: 24, padding: 32 },
    children: [
      {
        type: 'Frame',
        autoLayout: { direction: 'column', gap: 8, align: 'center' },
        children: [
          { type: 'Icon', name: 'account_circle', size: 64, color: '#4F46E5' },
          { type: 'Text', text: '欢迎回来', fontSize: 28, fontWeight: 700, fill: '#1A1A1A', textAlign: 'center' },
        ],
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'column', gap: 12 },
        children: [
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12 },
            fill: '#F5F5F5',
            cornerRadius: 12,
            children: [
              { type: 'Icon', name: 'email', size: 24, color: '#666666' },
              { type: 'Text', text: '请输入邮箱', fontSize: 14, fill: '#999999' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12 },
            fill: '#F5F5F5',
            cornerRadius: 12,
            children: [
              { type: 'Icon', name: 'lock', size: 24, color: '#666666' },
              { type: 'Text', text: '请输入密码', fontSize: 14, fill: '#999999' },
              { type: 'Icon', name: 'visibility_off', size: 24, color: '#999999' },
            ],
          },
        ],
      },
      {
        type: 'Frame',
        width: 'fill',
        height: 48,
        cornerRadius: 24,
        fill: '#4F46E5',
        autoLayout: { direction: 'row', align: 'center' },
        children: [
          { type: 'Text', text: '登录', fontSize: 16, fill: '#FFFFFF', fontWeight: 600, textAlign: 'center' },
        ],
      },
      { type: 'Text', text: '忘记密码？', fontSize: 14, fill: '#4F46E5', textAlign: 'center' },
    ],
  },
  music: {
    type: 'Frame',
    width: 375,
    fill: '#121212',
    autoLayout: { direction: 'column', gap: 16, padding: 24 },
    children: [
      {
        type: 'Frame',
        autoLayout: { direction: 'row', gap: 12, align: 'center' },
        children: [
          { type: 'Text', text: '发现音乐', fontSize: 24, fontWeight: 700, fill: '#FFFFFF' },
        ],
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'row', gap: 12, align: 'center' },
        fill: '#2A2A2A',
        cornerRadius: 12,
        children: [
          { type: 'Icon', name: 'search', size: 20, color: '#999999' },
          { type: 'Text', text: '搜索歌曲、歌手...', fontSize: 14, fill: '#999999' },
        ],
      },
      {
        type: 'Text', text: '为你推荐', fontSize: 18, fontWeight: 600, fill: '#FFFFFF',
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'row', gap: 12 },
        children: [
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#818CF8' },
              { type: 'Text', text: '每日推荐', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#34D399' },
              { type: 'Text', text: '热门歌曲', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#F59E0B' },
              { type: 'Text', text: '新歌速递', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#EF4444' },
              { type: 'Text', text: '排行榜', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
        ],
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'column', gap: 8 },
        children: [
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12, align: 'center' },
            fill: '#2A2A2A',
            cornerRadius: 8,
            children: [
              { type: 'Icon', name: 'music_note', size: 24, color: '#818CF8' },
              { type: 'Text', text: '晴天 - 周杰伦', fontSize: 14, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12, align: 'center' },
            fill: '#2A2A2A',
            cornerRadius: 8,
            children: [
              { type: 'Icon', name: 'music_note', size: 24, color: '#818CF8' },
              { type: 'Text', text: '稻香 - 周杰伦', fontSize: 14, fill: '#E0E0E0' },
            ],
          },
        ],
      },
    ],
  },
}

function matchMock(userText: string): ElementTree {
  const lower = userText.toLowerCase()
  if (lower.includes('登录') || lower.includes('login')) return MOCK_TREES.login
  if (lower.includes('音乐') || lower.includes('music')) return MOCK_TREES.music
  return MOCK_TREES.button
}

export interface SendMessageOptions {
  pageType: PageType
  colorScheme: ColorScheme
  history: Array<{ role: string; content: string }>
  onStreaming?: (text: string) => void
}

export async function sendMessageToLLM(
  userText: string,
  options: SendMessageOptions
): Promise<{ content: string; tree: ElementTree }> {
  const systemPrompt = buildSystemPrompt(options.pageType, options.colorScheme)

  console.log('System prompt length:', systemPrompt.length)

  await new Promise((r) => setTimeout(r, 600))

  const tree = matchMock(userText)

  let content = '已为你生成了设计稿。'
  if (userText.includes('登录')) content = '已为你设计了一个简约登录页面。'
  if (userText.includes('音乐')) content = '已为你设计了一个深色风格的音乐App首页。'

  return { content, tree }
}
