import type { PageType } from './page-types'

export function getFewShotExamples(pageType: PageType): string {
  const width = pageType === 'app' ? 375 : pageType === 'web' ? 1440 : 1280

  return `示例 - 登录页面:
用户: "设计一个简约的登录页面"
输出:
{
  "type": "Frame",
  "width": ${width},
  "fill": "#FFFFFF",
  "autoLayout": { "direction": "column", "gap": 24, "padding": 32 },
  "children": [
    { "type": "Frame", "autoLayout": { "direction": "column", "gap": 8, "align": "center" },
      "children": [
        { "type": "Icon", "name": "account_circle", "size": 64, "color": "#4F46E5" },
        { "type": "Text", "text": "欢迎回来", "fontSize": 28, "fontWeight": 700, "fill": "#1A1A1A" }
      ]
    },
    { "type": "Frame", "autoLayout": { "direction": "column", "gap": 12 },
      "children": [
        { "type": "Frame", "autoLayout": { "direction": "row", "gap": 12 }, "fill": "#F5F5F5", "cornerRadius": 12,
          "children": [
            { "type": "Icon", "name": "email", "size": 24, "color": "#666" },
            { "type": "Text", "text": "请输入邮箱", "fontSize": 14, "fill": "#999" }
          ]
        },
        { "type": "Frame", "autoLayout": { "direction": "row", "gap": 12 }, "fill": "#F5F5F5", "cornerRadius": 12,
          "children": [
            { "type": "Icon", "name": "lock", "size": 24, "color": "#666" },
            { "type": "Text", "text": "请输入密码", "fontSize": 14, "fill": "#999" }
          ]
        }
      ]
    },
    { "type": "Rect", "width": "fill", "height": 48, "cornerRadius": 24, "fill": "#4F46E5" },
    { "type": "Text", "text": "忘记密码？", "fontSize": 14, "fill": "#4F46E5" }
  ]
}`
}
