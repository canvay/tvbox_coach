/**
 * 直播源转换 —— 页面脚本（原生 TS，由 live-convert.astro 的 <script> 引入）。
 * 纯函数逻辑在 ../tools/liveSource，本文件只做 DOM 接线。
 */
import { detectFormat, dedupeByUrl, groupStats, parseLiveSource, toM3u, toTxt } from '../tools/liveSource'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

function esc(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const SAMPLE = [
  '#EXTM3U',
  '#EXTINF:-1 tvg-name="CCTV1" group-title="央视频道",CCTV-1 综合',
  'http://example.tv/cctv1.m3u8',
  '#EXTINF:-1 tvg-name="CCTV5" group-title="央视频道",CCTV-5 体育',
  'http://example.tv/cctv5.m3u8',
  '#EXTINF:-1 tvg-name="东方卫视" group-title="卫视频道",东方卫视',
  'http://example.tv/dftv.m3u8',
].join('\n')

const inputEl = $<HTMLTextAreaElement>('live-input')
const targetEl = $<HTMLSelectElement>('live-target')
const dedupeEl = $<HTMLInputElement>('live-dedupe')
const errorEl = $('alert-error')
const noticeEl = $('alert-notice')
const statsPanel = $('stats-panel')
const statsTitle = $('stats-title')
const statsEl = $('stats')
const resultPanel = $('result-panel')
const outputEl = $('output')
let output = ''

function showAlert(el: HTMLElement, msg: string) {
  el.textContent = msg
  el.classList.add('show')
}

function hideAlerts() {
  errorEl.classList.remove('show')
  noticeEl.classList.remove('show')
}

function convert() {
  hideAlerts()
  statsPanel.hidden = true
  resultPanel.hidden = true
  const text = inputEl.value.trim()
  if (!text) {
    showAlert(errorEl, '请先粘贴直播源内容。')
    return
  }
  const detected = detectFormat(text)
  if (!detected) {
    showAlert(
      errorEl,
      '无法识别格式：内容既不是 m3u（缺少 #EXTINF / #EXTM3U），也不是 txt（缺少 #genre#）。',
    )
    return
  }
  const target = targetEl.value as 'txt' | 'm3u'
  if (detected === target) {
    showAlert(errorEl, `输入内容已经是 ${target.toUpperCase()} 格式，无需转换。`)
    return
  }
  const parsed = parseLiveSource(text)
  if (!parsed || parsed.channels.length === 0) {
    showAlert(errorEl, '解析到的频道数为 0，请检查内容格式。')
    return
  }
  const rawCount = parsed.channels.length
  const channels = dedupeEl.checked ? dedupeByUrl(parsed.channels) : parsed.channels

  statsTitle.textContent = `分组统计（共 ${channels.length} 条）`
  statsEl.innerHTML = groupStats(channels)
    .map(
      ([g, n]) =>
        `<div class="stat"><div class="v small">${esc(g)}</div><div class="k">${n} 个频道</div></div>`,
    )
    .join('')
  statsPanel.hidden = false

  output = target === 'm3u' ? toM3u(channels) : toTxt(channels)
  outputEl.textContent = output
  resultPanel.hidden = false
  showAlert(
    noticeEl,
    `识别到 ${detected.toUpperCase()} 格式，共 ${rawCount} 条，输出 ${channels.length} 条。`,
  )
}

inputEl.addEventListener('input', () => {
  $<HTMLButtonElement>('btn-convert').disabled = !inputEl.value.trim()
})
$('btn-convert').addEventListener('click', convert)
$('btn-sample').addEventListener('click', () => {
  inputEl.value = SAMPLE
  $<HTMLButtonElement>('btn-convert').disabled = false
})
$('btn-clear').addEventListener('click', () => {
  inputEl.value = ''
  output = ''
  $<HTMLButtonElement>('btn-convert').disabled = true
  statsPanel.hidden = true
  resultPanel.hidden = true
  hideAlerts()
})
$('btn-copy').addEventListener('click', () => {
  if (output) void navigator.clipboard.writeText(output)
  showAlert(noticeEl, '已复制到剪贴板。')
})
$('btn-download').addEventListener('click', () => {
  if (!output) return
  const target = targetEl.value as 'txt' | 'm3u'
  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `live-source.${target === 'm3u' ? 'm3u' : 'txt'}`
  a.click()
  URL.revokeObjectURL(a.href)
})
