/**
 * 接口测活：批量并发探测接口地址可用性。
 *
 * 探测策略：
 * 1. 正常 fetch（带超时）→ 拿到响应再校验是否为有效 JSON → valid
 * 2. 正常 fetch 因 CORS 失败 → 降级 no-cors 探测，能收到 opaque 响应即认为网络可达 → reachable
 * 3. 两者都失败 → unreachable
 */

export type CheckStatus = 'valid' | 'reachable' | 'unreachable'

export interface CheckResult {
  url: string
  status: CheckStatus
  /** 耗时（毫秒），unreachable 时为超时值 */
  ms: number
  detail: string
}

/** 默认并发数与超时 */
export const DEFAULT_CONCURRENCY = 5
export const DEFAULT_TIMEOUT_MS = 8000

/**
 * 从多行输入中提取待测地址。
 * 支持每行一个地址，或「备注,地址」「备注 地址」形式；忽略空行与 # 注释行。
 */
export function extractUrls(input: string): Array<{ label: string; url: string }> {
  const out: Array<{ label: string; url: string }> = []
  for (const line of input.split(/\r?\n/)) {
    const l = line.trim()
    if (!l || l.startsWith('#') || l.startsWith('//')) continue
    // 名称,地址（常见「名称,URL」格式；URL 内不含逗号则安全）
    const commaIdx = l.indexOf(',')
    if (commaIdx > 0) {
      const maybeUrl = l.slice(commaIdx + 1).trim()
      if (/^https?:\/\//i.test(maybeUrl)) {
        out.push({ label: l.slice(0, commaIdx).trim(), url: maybeUrl })
        continue
      }
    }
    // 纯地址或「名称 空格 地址」
    const parts = l.split(/\s+/)
    const url = parts.find((p) => /^https?:\/\//i.test(p)) ?? ''
    if (url) out.push({ label: parts.filter((p) => p !== url).join(' ') || url, url })
  }
  return out
}

export async function checkUrl(url: string, timeoutMs: number): Promise<CheckResult> {
  const start = performance.now()
  // 1. 正常请求：能读响应就校验 JSON
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    const ms = Math.round(performance.now() - start)
    if (!res.ok) {
      return { url, status: 'reachable', ms, detail: `HTTP ${res.status}` }
    }
    const text = await res.text()
    try {
      JSON.parse(text)
      return { url, status: 'valid', ms, detail: '有效 JSON' }
    } catch {
      const head = text.slice(0, 60).replace(/\s+/g, ' ')
      return { url, status: 'reachable', ms, detail: `返回非 JSON：${head}` }
    }
  } catch {
    // 继续降级探测
  }

  // 2. no-cors 探测：仅验证网络可达（响应不可读）
  const start2 = performance.now()
  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    return {
      url,
      status: 'reachable',
      ms: Math.round(performance.now() - start2),
      detail: '可达，但受 CORS 限制无法校验内容',
    }
  } catch (e) {
    return {
      url,
      status: 'unreachable',
      ms: Math.round(performance.now() - start2),
      detail:
        e instanceof DOMException && e.name === 'TimeoutError'
          ? `连接超时（${timeoutMs}ms）`
          : '无法连接（DNS / 网络错误）',
    }
  }
}

/** 并发执行测活，每个结果完成即回调；通过传入的 AbortSignal 支持中途停止 */
export async function checkAll(
  targets: Array<{ label: string; url: string }>,
  options: {
    concurrency: number
    timeoutMs: number
    signal?: AbortSignal
    onResult: (r: CheckResult, label: string) => void
  },
): Promise<void> {
  const { concurrency, timeoutMs, signal, onResult } = options
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (cursor < targets.length) {
      if (signal?.aborted) return
      const t = targets[cursor++]
      const result = await checkUrl(t.url, timeoutMs)
      if (signal?.aborted) return
      onResult(result, t.label)
    }
  })
  await Promise.all(workers)
}
