const BUTTON_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=block" rel="stylesheet"><style>*,::after,::before{box-sizing:border-box;margin:0;padding:0}body{width:200px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}</style></head>
<body><button style="display:flex;align-items:center;gap:8px;padding:12px 24px;background:#EF4444;color:#fff;border:none;border-radius:24px;font-size:16px;cursor:pointer"><span class="material-symbols-outlined">search</span>搜索</button></body></html>`

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=block" rel="stylesheet"><style>*,::after,::before{box-sizing:border-box;margin:0;padding:0}body{width:375px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#fff}</style></head>
<body><div style="display:flex;flex-direction:column;gap:24px;padding:32px"><div style="text-align:center"><span class="material-symbols-outlined" style="font-size:64px;color:#4F46E5">account_circle</span><h1 style="font-size:28px;font-weight:700;color:#1A1A1A;margin:8px 0 0">欢迎回来</h1></div><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:center;gap:12px;padding:16px;background:#F5F5F5;border-radius:12px"><span class="material-symbols-outlined" style="color:#666">email</span><span style="color:#999;font-size:14px">请输入邮箱</span></div><div style="display:flex;align-items:center;gap:12px;padding:16px;background:#F5F5F5;border-radius:12px"><span class="material-symbols-outlined" style="color:#666">lock</span><span style="color:#999;font-size:14px">请输入密码</span><span class="material-symbols-outlined" style="color:#999">visibility_off</span></div></div><button style="width:100%;height:48px;background:#4F46E5;color:#fff;border:none;border-radius:24px;font-size:16px;font-weight:600;cursor:pointer">登录</button><p style="text-align:center;color:#4F46E5;font-size:14px">忘记密码？</p></div></body></html>`

export function matchMock(userText: string): string {
  const lower = userText.toLowerCase()
  if (lower.includes('登录') || lower.includes('login')) return LOGIN_HTML
  if (lower.includes('按钮') || lower.includes('button')) return BUTTON_HTML
  return LOGIN_HTML
}
