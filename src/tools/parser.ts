/**
 * TVBox 配置解析：把接口 JSON 解析为结构化摘要。
 * 纯函数，不依赖 DOM / 网络。
 */

export interface ParseSummary {
  /** 仓库类型：multi = 多仓（有 storeHouse / urls），single = 单仓（直接含 sites 等） */
  repoType: 'multi' | 'single' | 'unknown'
  /** 单仓时的站点数量 */
  sitesCount: number
  /** 单仓时的直播配置数量 */
  livesCount: number
  /** Spider 壳地址 */
  spider: string
  /** 壁纸地址 */
  wallpaper: string
  /** 多仓时的仓库地址列表 */
  storeHouses: string[]
  /** 顶层字段列表 */
  topKeys: string[]
}

export type ParseResult =
  | { ok: true; data: unknown; summary: ParseSummary }
  | { ok: false; error: string }

/** 去除 BOM / 零宽字符后解析 JSON */
export function parseConfig(raw: string): ParseResult {
  const text = raw.replace(/^﻿/, '').trim()
  if (!text) return { ok: false, error: '内容为空，请粘贴配置 JSON 或填入配置地址。' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    return {
      ok: false,
      error: `JSON 解析失败：${e instanceof Error ? e.message : String(e)}。请检查内容是否为完整有效的接口 JSON。`,
    }
  }
  return { ok: true, data, summary: buildSummary(data) }
}

function buildSummary(data: unknown): ParseSummary {
  const summary: ParseSummary = {
    repoType: 'unknown',
    sitesCount: 0,
    livesCount: 0,
    spider: '',
    wallpaper: '',
    storeHouses: [],
    topKeys: [],
  }
  if (typeof data !== 'object' || data === null) return summary
  const obj = data as Record<string, unknown>
  summary.topKeys = Object.keys(obj)

  // 多仓配置：{ storeHouse: [...] } 或 { urls: [...] }
  const houses = Array.isArray(obj.storeHouse)
    ? obj.storeHouse
    : Array.isArray(obj.urls)
      ? obj.urls
      : undefined
  if (houses) {
    summary.repoType = 'multi'
    for (const h of houses) {
      if (typeof h === 'object' && h !== null) {
        const src = (h as Record<string, unknown>).sourceName ?? ''
        const url =
          (h as Record<string, unknown>).sourceUrl ?? (h as Record<string, unknown>).url ?? ''
        summary.storeHouses.push([String(src || ''), String(url || '')].filter(Boolean).join(' · '))
      }
    }
    return summary
  }

  if ('sites' in obj || 'lives' in obj) {
    summary.repoType = 'single'
    summary.sitesCount = Array.isArray(obj.sites) ? obj.sites.length : 0
    summary.livesCount = Array.isArray(obj.lives) ? obj.lives.length : 0
    summary.spider = typeof obj.spider === 'string' ? obj.spider : ''
    summary.wallpaper = typeof obj.wallpaper === 'string' ? obj.wallpaper : ''
  }
  return summary
}
