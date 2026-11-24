/**
 * 直播源解析与互转：m3u（#EXTINF）↔ txt（#genre#）。
 * 纯函数，不依赖 DOM / 网络。
 */

export interface LiveChannel {
  group: string
  name: string
  url: string
}

export type LiveFormat = 'm3u' | 'txt'

/** 检测文本属于哪种直播源格式 */
export function detectFormat(text: string): LiveFormat | null {
  const t = text.trim()
  if (!t) return null
  if (/^#EXTM3U/m.test(t) || /^#EXTINF/m.test(t)) return 'm3u'
  if (/#genre#/.test(t)) return 'txt'
  return null
}

/** 解析 m3u 文本 */
export function parseM3u(text: string): LiveChannel[] {
  const lines = text.split(/\r?\n/)
  const channels: LiveChannel[] = []
  let pending: { name: string; group: string } | null = null
  for (const line of lines) {
    const l = line.trim()
    if (!l) continue
    if (l.startsWith('#EXTINF')) {
      // #EXTINF:-1 tvg-name="xx" group-title="分组",频道名
      const commaIdx = l.lastIndexOf(',')
      const name = commaIdx >= 0 ? l.slice(commaIdx + 1).trim() : '未知频道'
      const groupMatch = l.match(/group-title="([^"]*)"/)
      pending = { name, group: groupMatch?.[1]?.trim() || '未分组' }
    } else if (l.startsWith('#EXTGRP')) {
      // #EXTGRP:分组名
      const g = l.split(':')[1]?.trim()
      if (pending && g) pending.group = g
    } else if (l.startsWith('#')) {
      continue
    } else if (pending) {
      channels.push({ group: pending.group, name: pending.name, url: l })
      pending = null
    }
  }
  return channels
}

/** 解析 txt 文本（分类名,#genre# + 频道名,url） */
export function parseTxt(text: string): LiveChannel[] {
  const lines = text.split(/\r?\n/)
  const channels: LiveChannel[] = []
  let group = '未分组'
  for (const line of lines) {
    const l = line.trim()
    if (!l || l.startsWith('#')) continue
    if (l.endsWith('#genre#')) {
      group = l.split(',')[0].trim() || group
      continue
    }
    const commaIdx = l.indexOf(',')
    if (commaIdx > 0) {
      const name = l.slice(0, commaIdx).trim()
      const url = l.slice(commaIdx + 1).trim()
      // 支持一行多地址：名称,url1#url2
      for (const u of url.split('#')) {
        if (u.trim()) channels.push({ group, name, url: u.trim() })
      }
    }
  }
  return channels
}

/** 解析任意格式直播源文本 */
export function parseLiveSource(
  text: string,
): { format: LiveFormat; channels: LiveChannel[] } | null {
  const format = detectFormat(text)
  if (!format) return null
  return { format, channels: format === 'm3u' ? parseM3u(text) : parseTxt(text) }
}

/** 导出为 m3u 文本 */
export function toM3u(channels: LiveChannel[]): string {
  const out = ['#EXTM3U']
  for (const c of channels) {
    out.push(`#EXTINF:-1 tvg-name="${c.name}" group-title="${c.group}",${c.name}`)
    out.push(c.url)
  }
  return out.join('\n') + '\n'
}

/** 导出为 txt 文本（TVBox / 影视仓常见格式） */
export function toTxt(channels: LiveChannel[]): string {
  const out: string[] = []
  let lastGroup = ''
  for (const c of channels) {
    if (c.group !== lastGroup) {
      out.push(`${c.group},#genre#`)
      lastGroup = c.group
    }
    out.push(`${c.name},${c.url}`)
  }
  return out.join('\n') + '\n'
}

/** 按 url 去重（保留首次出现） */
export function dedupeByUrl(channels: LiveChannel[]): LiveChannel[] {
  const seen = new Set<string>()
  return channels.filter((c) => {
    if (seen.has(c.url)) return false
    seen.add(c.url)
    return true
  })
}

/** 分组统计：组名 → 频道数 */
export function groupStats(channels: LiveChannel[]): Array<[string, number]> {
  const map = new Map<string, number>()
  for (const c of channels) {
    map.set(c.group, (map.get(c.group) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}
