// 自适应改写引擎
// 核心：Segment + RenderContext → AdaptedSegment
// 支持文本/图片/音频/视频的逐段改写

import type { Segment, TextSegment, ImageSegment, AudioSegment, VideoSegment, AdaptedSegment, SegmentChange } from '../models/segment.js'
import { makeText, makeImage, makeAudio, makeVideo, describeSegment } from '../models/segment.js'
import type { RenderContext } from '../models/context.js'
import type { LLMConfig } from '../lib/llm.js'
import { callLLM, callLLMJSON, analyzeImage } from '../lib/llm.js'
import type { AudioConfig } from '../lib/audio.js'
import { textToSpeech } from '../lib/audio.js'

export interface AdaptConfig {
  llm: LLMConfig
  audio: AudioConfig
}

// ─── 文本自适应 ──────────────────────────────────────────────

export async function adaptTextSegment(
  config: AdaptConfig,
  segment: TextSegment,
  ctx: RenderContext
): Promise<AdaptedSegment<TextSegment>> {
  const contextPrompt = buildContextPrompt(ctx)

  const messages = [
    {
      role: 'system' as const,
      content: `你是一个内容自适应引擎。根据用户上下文调整文本内容。

${ctx.platformRules}

${ctx.communityVibe}

用户上下文：
${contextPrompt}

改写原则（适应级别: ${ctx.adaptationLevel}）：
- off: 原样返回
- light: 微调语气和措辞，不改内容结构
- moderate: 调整语气、详略、侧重角度，移除违规内容
- aggressive: 大幅重构，按用户偏好重新组织信息

返回 JSON：
{
  "content": "改写后的内容",
  "changes": [
    { "field": "content", "before": "原文片段", "after": "改后片段", "reason": "原因" }
  ],
  "adaptationReason": "整体改写说明"
}

重要：保留用户的核心信息和意图，不编造新事实。`,
    },
    {
      role: 'user' as const,
      content: `原文：${segment.content}`,
    },
  ]

  const result = await callLLMJSON<{
    content: string
    changes: SegmentChange[]
    adaptationReason: string
  }>(config.llm, messages, { temperature: 0.4 })

  const adapted = makeText(segment.id, result.content, segment.metadata)

  return {
    original: segment,
    adapted,
    changes: result.changes,
    adaptationReason: result.adaptationReason,
  }
}

// ─── 图片自适应 ──────────────────────────────────────────────

export async function adaptImageSegment(
  config: AdaptConfig,
  segment: ImageSegment,
  ctx: RenderContext
): Promise<AdaptedSegment<ImageSegment>> {
  // 如果有图片 URL，用 vision model 分析
  let analysis = segment.description ?? ''
  if (segment.url && !analysis) {
    analysis = await analyzeImage(
      config.llm,
      segment.url,
      `分析这张图片，检查是否有违规内容，描述图片内容、情绪和适用场景。`
    )
  }

  const contextPrompt = buildContextPrompt(ctx)
  const messages = [
    {
      role: 'system' as const,
      content: `你是一个图片内容自适应引擎。根据用户上下文，决定如何调整图片的展示方式。

图片描述：${analysis}

用户上下文：
${contextPrompt}

返回 JSON：
{
  "action": "show/fold/hide/describe_only",
  "adaptedDescription": "调整后的图片描述（如果用户不想直接看图，用文字描述替代）",
  "warning": "可选的预警信息",
  "changes": [
    { "field": "description", "before": "原描述", "after": "新描述", "reason": "原因" }
  ],
  "adaptationReason": "整体调整说明"
}

action 说明：
- show: 正常展示图片
- fold: 折叠，用户点击后展开
- hide: 隐藏（严重违规或用户明确排除）
- describe_only: 只展示文字描述，不展示原图（如用户不想看某些类型图片）`,
    },
    {
      role: 'user' as const,
      content: `用户上下文已提供，请决定图片展示方式。`,
    },
  ]

  const result = await callLLMJSON<{
    action: 'show' | 'fold' | 'hide' | 'describe_only'
    adaptedDescription: string
    warning?: string
    changes: SegmentChange[]
    adaptationReason: string
  }>(config.llm, messages, { temperature: 0.3 })

  const adapted = makeImage(segment.id, {
    ...segment,
    description: result.adaptedDescription,
  })

  return {
    original: segment,
    adapted,
    changes: result.changes,
    adaptationReason: result.adaptationReason,
  }
}

// ─── 音频自适应 ──────────────────────────────────────────────

export async function adaptAudioSegment(
  config: AdaptConfig,
  segment: AudioSegment,
  ctx: RenderContext
): Promise<AdaptedSegment<AudioSegment>> {
  if (!segment.transcript) {
    return {
      original: segment,
      adapted: segment,
      changes: [],
      adaptationReason: '无转录文本，跳过自适应',
    }
  }

  // 先把转录文本当文本段自适应
  const textSeg = makeText(segment.id, segment.transcript, { speaker: segment.metadata?.speaker })
  const textResult = await adaptTextSegment(config, textSeg, ctx)

  // 如果有 TTS 配置，生成新的音频
  let newAudioBase64: string | undefined
  try {
    if (config.audio.ttsEndpoint) {
      const audioBuffer = await textToSpeech(
        config.audio,
        textResult.adapted.content,
        'alloy'
      )
      newAudioBase64 = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`
    }
  } catch {
    // TTS 不可用，只返回改写后的转录文本
  }

  const adapted = makeAudio(segment.id, {
    ...segment,
    base64: newAudioBase64 ?? segment.base64,
    transcript: textResult.adapted.content,
  })

  return {
    original: segment,
    adapted,
    changes: textResult.changes,
    adaptationReason: `音频转录文本已自适应改写${newAudioBase64 ? '，并重新合成语音' : ''}。${textResult.adaptationReason}`,
  }
}

// ─── 视频自适应 ──────────────────────────────────────────────

export async function adaptVideoSegment(
  config: AdaptConfig,
  segment: VideoSegment,
  ctx: RenderContext
): Promise<AdaptedSegment<VideoSegment>> {
  const parts: string[] = []

  if (segment.keyframes?.length) {
    parts.push(`关键帧数量: ${segment.keyframes.length}`)
  }
  if (segment.transcript) {
    parts.push(`转录文本: ${segment.transcript}`)
  }
  if (segment.metadata?.duration) {
    parts.push(`时长: ${segment.metadata.duration}秒`)
  }

  // 如果有转录文本，先改写文本
  let adaptedTranscript = segment.transcript
  let changes: SegmentChange[] = []
  let reason = '视频内容自适应'

  if (segment.transcript) {
    const textSeg = makeText(segment.id, segment.transcript)
    const textResult = await adaptTextSegment(config, textSeg, ctx)
    adaptedTranscript = textResult.adapted.content
    changes = textResult.changes
    reason = textResult.adaptationReason
  }

  // 分析关键帧是否需要调整
  if (segment.keyframes?.length && segment.keyframes[0]?.startsWith('data:image')) {
    const frameAnalysis = await analyzeImage(
      config.llm,
      segment.keyframes[0],
      `分析这个视频关键帧。根据以下上下文判断是否需要隐藏或折叠视频：\n${buildContextPrompt(ctx)}`
    )
    reason += `\n关键帧分析: ${frameAnalysis}`
  }

  const adapted = makeVideo(segment.id, {
    ...segment,
    transcript: adaptedTranscript ?? undefined,
  })

  return {
    original: segment,
    adapted,
    changes,
    adaptationReason: reason,
  }
}

// ─── 统一入口 ────────────────────────────────────────────────

export async function adaptSegment(
  config: AdaptConfig,
  segment: Segment,
  ctx: RenderContext
): Promise<AdaptedSegment> {
  switch (segment.modality) {
    case 'text':
      return adaptTextSegment(config, segment, ctx)
    case 'image':
      return adaptImageSegment(config, segment, ctx)
    case 'audio':
      return adaptAudioSegment(config, segment, ctx)
    case 'video':
      return adaptVideoSegment(config, segment, ctx)
    case 'mixed':
      const results = await Promise.all(
        segment.parts.map((part) => adaptSegment(config, part, ctx))
      )
      return {
        original: segment,
        adapted: {
          ...segment,
          parts: results.map((r) => r.adapted),
        },
        changes: results.flatMap((r) => r.changes),
        adaptationReason: results.map((r, i) =>
          `[${i}] ${r.adaptationReason}`
        ).join('\n'),
      }
  }
}

export async function adaptSegments(
  config: AdaptConfig,
  segments: Segment[],
  ctx: RenderContext
): Promise<AdaptedSegment[]> {
  // 串行处理以保留对话上下文
  const results: AdaptedSegment[] = []
  for (const seg of segments) {
    const result = await adaptSegment(config, seg, ctx)
    results.push(result)
  }
  return results
}

// ─── 辅助 ────────────────────────────────────────────────────

function buildContextPrompt(ctx: RenderContext): string {
  const lines: string[] = []

  lines.push(`用户: ${ctx.user.displayName}`)
  lines.push(`偏好语气: ${ctx.user.preferences.preferredTone}`)
  lines.push(`偏好详略: ${ctx.user.preferences.preferredDetailLevel}`)
  lines.push(`时间: ${ctx.time.timeOfDay} / ${ctx.time.dayOfWeek}`)

  if (ctx.user.preferences.includeTopics.length)
    lines.push(`偏好主题: ${ctx.user.preferences.includeTopics.join(', ')}`)
  if (ctx.user.preferences.excludeTopics.length)
    lines.push(`排除主题: ${ctx.user.preferences.excludeTopics.join(', ')}`)
  if (ctx.user.preferences.excludeSentiments.length)
    lines.push(`排除情感: ${ctx.user.preferences.excludeSentiments.join(', ')}`)
  if (ctx.user.preferences.customPrompt)
    lines.push(`自定义偏好: ${ctx.user.preferences.customPrompt}`)
  if (ctx.user.conversationContext)
    lines.push(`对话上下文: ${ctx.user.conversationContext}`)
  if (ctx.user.demographics?.expertiseLevel)
    lines.push(`专业水平: ${ctx.user.demographics.expertiseLevel}`)

  // 时间相关的自适应
  if (ctx.time.timeOfDay === 'night') {
    lines.push('注意: 用户在夜间浏览，偏好轻松简短的内容')
  } else if (ctx.time.timeOfDay === 'morning') {
    lines.push('注意: 用户在早晨浏览，偏好信息密度高的内容')
  }

  return lines.join('\n')
}
