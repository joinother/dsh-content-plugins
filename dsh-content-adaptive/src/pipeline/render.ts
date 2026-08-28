// 动态渲染层
// 核心：同一条内容，不同用户/不同时间 → 不同版本
// 每次渲染都生成一个带版本号的快照

import type { Segment, AdaptedSegment } from '../models/segment.js'
import { describeSegment } from '../models/segment.js'
import type { RenderContext } from '../models/context.js'
import { describeContext } from '../models/context.js'
import type { AdaptConfig } from './adapt.js'
import { adaptSegments } from './adapt.js'

export interface RenderedVersion {
  versionId: string
  contentId: string
  userId: string
  timestamp: number
  context: RenderContext
  segments: AdaptedSegment[]
  renderedText: string
  metadata: {
    totalSegments: number
    adaptedSegments: number
    changesCount: number
    modalities: string[]
  }
}

// 版本缓存：记录同一内容给同一用户在不同时间的渲染历史
const versionHistory = new Map<string, RenderedVersion[]>()

export function getVersionHistory(contentId: string): RenderedVersion[] {
  return versionHistory.get(contentId) ?? []
}

export function clearVersionHistory(): void {
  versionHistory.clear()
}

export async function renderContent(
  config: AdaptConfig,
  contentId: string,
  segments: Segment[],
  ctx: RenderContext
): Promise<RenderedVersion> {
  // 1. 逐段自适应
  const adapted = await adaptSegments(config, segments, ctx)

  // 2. 生成渲染文本
  const renderedText = adapted
    .map((seg) => renderSegmentToText(seg))
    .join('\n\n---\n\n')

  // 3. 统计元数据
  const adaptedSegments = adapted.filter(
    (s) => s.changes.length > 0 || s.adaptationReason !== '无变化'
  )
  const modalities = [...new Set(segments.map((s) => s.modality))]

  // 4. 生成版本
  const versionId = `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const version: RenderedVersion = {
    versionId,
    contentId,
    userId: ctx.user.userId,
    timestamp: ctx.time.timestamp,
    context: ctx,
    segments: adapted,
    renderedText,
    metadata: {
      totalSegments: segments.length,
      adaptedSegments: adaptedSegments.length,
      changesCount: adapted.reduce((sum, s) => sum + s.changes.length, 0),
      modalities,
    },
  }

  // 5. 存入历史
  const history = versionHistory.get(contentId) ?? []
  history.push(version)
  versionHistory.set(contentId, history)

  return version
}

function renderSegmentToText(adapted: AdaptedSegment): string {
  const seg = adapted.adapted
  const lines: string[] = []

  lines.push(describeSegment(seg))

  switch (seg.modality) {
    case 'text':
      lines.push(`内容: ${seg.content}`)
      break
    case 'image':
      lines.push(`描述: ${seg.description ?? '(无描述)'}`)
      if (seg.url) lines.push(`图片: ${seg.url}`)
      break
    case 'audio':
      lines.push(`转录: ${seg.transcript ?? '(无转录)'}`)
      break
    case 'video':
      lines.push(`转录: ${seg.transcript ?? '(无转录)'}`)
      if (seg.keyframes?.length) lines.push(`关键帧: ${seg.keyframes.length} 张`)
      break
    case 'mixed':
      lines.push(`包含 ${seg.parts.length} 个子片段`)
      break
  }

  if (adapted.changes.length > 0) {
    lines.push(`改写 (${adapted.changes.length} 处):`)
    for (const change of adapted.changes) {
      lines.push(`  - ${change.field}: "${change.before}" → "${change.after}" (${change.reason})`)
    }
  }

  if (adapted.adaptationReason) {
    lines.push(`原因: ${adapted.adaptationReason}`)
  }

  return lines.join('\n')
}

// ─── 对比展示：同一内容，不同上下文 ──────────────────────────

export interface VersionComparison {
  contentId: string
  versions: Array<{
    label: string
    context: RenderContext
    version: RenderedVersion
  }>
}

export async function compareRenderings(
  config: AdaptConfig,
  contentId: string,
  segments: Segment[],
  contexts: Array<{ label: string; context: RenderContext }>
): Promise<VersionComparison> {
  const versions = []

  for (const { label, context } of contexts) {
    const version = await renderContent(config, contentId, segments, context)
    versions.push({ label, context, version })
  }

  return { contentId, versions }
}

export function printComparison(comparison: VersionComparison): void {
  const { contentId, versions } = comparison

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  内容 ID: ${contentId}`)
  console.log(`  版本数量: ${versions.length}`)
  console.log(`${'═'.repeat(60)}`)

  for (const { label, context, version } of versions) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`  场景: ${label}`)
    console.log(`  ${describeContext(context)}`)
    console.log(`${'─'.repeat(60)}`)
    console.log(`\n${version.renderedText}`)
    console.log(`\n  [版本 ${version.versionId}]`)
    console.log(`  改写片段: ${version.metadata.adaptedSegments}/${version.metadata.totalSegments}`)
    console.log(`  变更数: ${version.metadata.changesCount}`)
  }

  // 打印差异
  if (versions.length >= 2) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log('  版本差异:')
    console.log(`${'─'.repeat(60)}`)
    for (let i = 0; i < versions.length - 1; i++) {
      for (let j = i + 1; j < versions.length; j++) {
        const v1 = versions[i]
        const v2 = versions[j]
        const same = v1.version.renderedText === v2.version.renderedText
        console.log(`\n  ${v1.label} vs ${v2.label}: ${same ? '完全相同' : '内容不同'}`)
        if (!same) {
          console.log(`    ${v1.label} 变更数: ${v1.version.metadata.changesCount}`)
          console.log(`    ${v2.label} 变更数: ${v2.version.metadata.changesCount}`)
        }
      }
    }
  }
}
