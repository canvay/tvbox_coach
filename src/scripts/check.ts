/**
 * 接口测活 —— 页面脚本（原生 TS，由 check.astro 的 <script> 引入）。
 * 探测与并发调度逻辑在 ../tools/checker（fetch 校验 JSON → CORS 降级 no-cors → 不可达）。
 */
import { checkAll, extractUrls, DEFAULT_CONCURRENCY, type CheckResult } from '../tools/checker'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`missing #${id}`)
  return el as T
}

const SAMPLE = [
  '# 示例（可用你自己的接口地址替换）',
  'httpbin JSON,https://httpbin.org/json',
  'https://httpbin.org/status/404',
  'https://no-such-host.invalid/config.json',
].join('\n')

const STATUS_LABEL: Record<CheckResult['status'], string> = {
  valid: '✅ 有效 JSON',
  reachable: '⚠️ 可达未验证',
  unreachable: '❌ 不可达',
}

const inputEl = $<HTMLTextAreaElement>('check-input')
const concEl = $<HTMLInputElement>('check-conc')
const timeoutEl = $<HTMLInputElement>('check-timeout')
const startBtn = $<HTMLButtonElement>('btn-start')
const stopBtn = $<HTMLButtonElement>('btn-stop')
const progressEl = $('progress')
const resultPanel = $('result-panel')
const resultBody = $('result-body')

let running = false
let controller: AbortController | null = null
let total = 0
let done = 0

function appendRow(result: CheckResult, label: string) {
  const tr = document.createElement('tr')
  const cells: Array<[string, string?]> = [
    [label !== result.url ? label : '—'],
    [result.url, 'url'],
    [STATUS_LABEL[result.status], `status-${result.status}`],
    [`${result.ms} ms`],
    [result.detail],
  ]
  for (const [text, cls] of cells) {
    const td = document.createElement('td')
    if (cls) td.className = cls
    td.textContent = text
    tr.appendChild(td)
  }
  resultBody.appendChild(tr)
}

function updateProgress() {
  if (total === 0) {
    progressEl.classList.remove('show')
    return
  }
  progressEl.textContent = running
    ? `检测中：${done}/${total} 已完成…`
    : `检测完成：${done}/${total}`
  progressEl.classList.add('show')
}

function start() {
  if (running) return
  const targets = extractUrls(inputEl.value)
  if (targets.length === 0) {
    alert('未识别到任何接口地址，请每行填写一个地址（支持「备注,地址」格式）。')
    return
  }
  running = true
  controller = new AbortController()
  total = targets.length
  done = 0
  resultBody.innerHTML = ''
  resultPanel.hidden = false
  startBtn.disabled = true
  stopBtn.disabled = false
  updateProgress()

  const concurrency = Math.max(1, Number(concEl.value) || DEFAULT_CONCURRENCY)
  const timeoutMs = Math.max(1, Number(timeoutEl.value) || 8) * 1000

  void checkAll(targets, {
    concurrency,
    timeoutMs,
    signal: controller.signal,
    onResult: (result, label) => {
      done++
      appendRow(result, label)
      updateProgress()
    },
  }).finally(() => {
    running = false
    controller = null
    startBtn.disabled = !inputEl.value.trim()
    stopBtn.disabled = true
    updateProgress()
  })
}

inputEl.addEventListener('input', () => {
  startBtn.disabled = running || !inputEl.value.trim()
})
startBtn.addEventListener('click', start)
stopBtn.addEventListener('click', () => controller?.abort())
$('btn-sample').addEventListener('click', () => {
  inputEl.value = SAMPLE
  startBtn.disabled = false
})
startBtn.disabled = true
