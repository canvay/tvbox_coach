export interface ToolMeta {
  path: string
  name: string
  icon: string
  /** Lotus FeatureCard 用的 Iconify 图标名 */
  iconName: string
  desc: string
  tags: string[]
}

export const tools: ToolMeta[] = [
  {
    path: '/tvbox_coach/tools/parse',
    name: '接口解析与格式化',
    icon: '🔍',
    iconName: 'lucide:file-json',
    desc: '粘贴 TVBox 配置 JSON 或输入配置地址，格式化展示并提取站点数、直播分组、Spider 等关键信息。',
    tags: ['JSON', '配置'],
  },
  {
    path: '/tvbox_coach/tools/live-convert',
    name: '直播源转换',
    icon: '🔁',
    iconName: 'lucide:repeat',
    desc: 'm3u 与 txt（#genre#）两种直播源格式互转，支持按地址去重、分组统计，一键复制或下载。',
    tags: ['m3u', 'txt', '直播源'],
  },
  {
    path: '/tvbox_coach/tools/check',
    name: '接口测活',
    icon: '🩺',
    iconName: 'lucide:stethoscope',
    desc: '批量检测接口地址：是否可达、返回是否为有效 JSON，并发探测、带超时与耗时统计。',
    tags: ['测活', '批量'],
  },
]
