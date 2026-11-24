/**
 * 接口解析与格式化 —— 页面脚本（原生 TS，由 parse.astro 的 <script> 引入）。
 * 纯函数逻辑在 ../tools/parser，本文件只做 DOM 接线。
 */
import { parseConfig, type ParseSummary } from '../tools/parser'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

/** HTML 转义，用于把用户数据插入模板字符串 */
function esc(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statCard(k: string, v: string, small = false): string {
  return `<div class="stat"><div class="k">${k}</div><div class="v${small ? ' small' : ''}">${v}</div></div>`
}

function renderSummary(s: ParseSummary): string {
  let html = statCard(
    '仓库类型',
    s.repoType === 'multi' ? '多仓' : s.repoType === 'single' ? '单仓' : '未知',
  )
  if (s.repoType === 'single') {
    html += statCard('站点数（sites）', String(s.sitesCount))
    html += statCard('直播配置（lives）', String(s.livesCount))
  }
  if (s.repoType === 'multi') {
    html += statCard('子仓数量', String(s.storeHouses.length))
  }
  if (s.spider) html += statCard('Spider', esc(s.spider), true)
  if (s.wallpaper) html += statCard('壁纸', esc(s.wallpaper), true)
  html += statCard('顶层字段', esc(s.topKeys.join(' / ')), true)
  return html
}

const SAMPLE = JSON.stringify(
  {
    spider: './jar/spider.jar;md5;0123456789abcdef0123456789abcdef',
    wallpaper: 'https://example.tv/wallpaper.jpg',
    sites: [
      { key: 'demo1', name: '示例站点一', type: 3, api: 'csp_Demo', searchable: 1 },
      { key: 'demo2', name: '示例站点二', type: 0, api: 'https://example.tv/api/v1/vod', searchable: 1 },
    ],
    lives: [
      { name: '示例直播', type: 0, url: 'https://example.tv/live.txt', epg: 'https://epg.example.tv' },
    ],
  },
  null,
  2,
)

const rawEl = $<HTMLTextAreaElement>('parse-raw')
const urlEl = $<HTMLInputElement>('parse-url')
const errorEl = $('alert-error')
const noticeEl = $('alert-notice')
const resultPanel = $('result-panel')
const summaryEl = $('summary')
const outputEl = $('output')
let formatted = ''

function showAlert(el: HTMLElement, msg: string) {
  el.textContent = msg
  el.classList.add('show')
}

function hideAlerts() {
  errorEl.classList.remove('show')
  noticeEl.classList.remove('show')
}

function parseText(text: string) {
  hideAlerts()
  const result = parseConfig(text)
  if (!result.ok) {
    showAlert(errorEl, result.error)
    resultPanel.hidden = true
    return
  }
  formatted = JSON.stringify(result.data, null, 2)
  summaryEl.innerHTML = renderSummary(result.summary)
  outputEl.textContent = formatted
  resultPanel.hidden = false
}

async function fetchUrl() {
  const target = urlEl.value.trim()
  if (!target) return
  const btn = $<HTMLButtonElement>('btn-fetch')
  btn.disabled = true
  btn.textContent = '抓取中…'
  hideAlerts()
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(12000), redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    rawEl.value = text
    parseText(text)
  } catch (e) {
    resultPanel.hidden = true
    const reason = e instanceof Error ? e.message : String(e)
    showAlert(
      errorEl,
      `抓取失败（${reason}）。多数情况下是配置服务器未开启跨域（CORS）——浏览器端无法直接读取。` +
        '请用电脑/手机浏览器打开配置地址，全选复制内容后粘贴到文本框再解析。',
    )
  } finally {
    btn.disabled = false
    btn.textContent = '抓取并解析'
    syncButtons()
  }
}

function syncButtons() {
  $<HTMLButtonElement>('btn-parse').disabled = !rawEl.value.trim()
  $<HTMLButtonElement>('btn-fetch').disabled = !urlEl.value.trim()
}

rawEl.addEventListener('input', syncButtons)
urlEl.addEventListener('input', syncButtons)
$('btn-parse').addEventListener('click', () => parseText(rawEl.value))
$('btn-fetch').addEventListener('click', () => void fetchUrl())
$('btn-sample').addEventListener('click', () => {
  rawEl.value = SAMPLE
  syncButtons()
  parseText(SAMPLE)
})
$('btn-clear').addEventListener('click', () => {
  rawEl.value = ''
  urlEl.value = ''
  formatted = ''
  resultPanel.hidden = true
  hideAlerts()
  syncButtons()
})
$('btn-copy').addEventListener('click', () => {
  if (formatted) void navigator.clipboard.writeText(formatted)
  showAlert(noticeEl, '已复制格式化 JSON 到剪贴板。')
})

syncButtons()
