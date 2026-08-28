// DeepSeek Harness Plugin: Content Adaptive
// 多模态内容动态自适应引擎

// 导出核心模块
export type { Segment, TextSegment, ImageSegment, AudioSegment, VideoSegment, MixedSegment, AdaptedSegment, SegmentChange } from './models/segment.js'
export { makeText, makeImage, makeAudio, makeVideo, makeMixed, describeSegment } from './models/segment.js'
export type { UserContext, UserPreference, TimeContext, RenderContext } from './models/context.js'
export { createDefaultUser, createTimeContext, createRenderContext, describeContext } from './models/context.js'
export type { LLMConfig, ChatMessage } from './lib/llm.js'
export { callLLM, callLLMJSON, callLLMArray, analyzeImage } from './lib/llm.js'
export { speechToText, textToSpeech } from './lib/audio.js'
export { extractVideoContent } from './lib/video.js'
export { segmentText, analyzeImageSegment, ingestAudio, ingestVideo, ingestMixed } from './pipeline/ingest.js'
export { adaptSegment, adaptSegments, adaptTextSegment, adaptImageSegment, adaptAudioSegment, adaptVideoSegment } from './pipeline/adapt.js'
export type { AdaptConfig } from './pipeline/adapt.js'
export { renderContent, compareRenderings, printComparison, getVersionHistory, clearVersionHistory } from './pipeline/render.js'
export type { RenderedVersion, VersionComparison } from './pipeline/render.js'

// ─── DSH Plugin Entry ──────────────────────────────────────────

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

import type { LLMConfig } from './lib/llm.js'
import type { Segment } from './models/segment.js'
import { makeText, makeImage, makeAudio, makeVideo, describeSegment } from './models/segment.js'
import { createDefaultUser, createTimeContext, createRenderContext } from './models/context.js'
import type { RenderContext } from './models/context.js'
import { segmentText } from './pipeline/ingest.js'
import { adaptSegment, adaptSegments } from './pipeline/adapt.js'
import { renderContent, compareRenderings, printComparison, clearVersionHistory } from './pipeline/render.js'

export const name = 'content-adaptive'
export const inject = ['tools']

export interface Config extends LLMConfig {
  visionModel: string
  whisperEndpoint: string
  ttsEndpoint: string
  ffmpegPath: string
  platformRules: string
  communityVibe: string
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().description('DeepSeek API Key').default(''),
  apiBase: Schema.string().default('https://api.deepseek.com/v1/chat/completions'),
  model: Schema.string().default('deepseek-chat'),
  visionModel: Schema.string().default('deepseek-chat'),
  whisperEndpoint: Schema.string().default(''),
  ttsEndpoint: Schema.string().default(''),
  ffmpegPath: Schema.string().default('ffmpeg'),
  platformRules: Schema.string().default('禁止人身攻击、虚假信息、隐私泄露、煽动仇恨、低俗色情'),
  communityVibe: Schema.string().default('友善、包容、理性'),
})

export function apply(ctx: Context, config: Config) {
  const llmConfig: LLMConfig = {
    apiKey: config.apiKey,
    apiBase: config.apiBase,
    model: config.model,
    visionModel: config.visionModel,
  }
  const adaptConfig = {
    llm: llmConfig,
    audio: { whisperEndpoint: config.whisperEndpoint, ttsEndpoint: config.ttsEndpoint },
  }

  // 工具 1: 文本分段
  ctx.tools.register(defineTool({
    name: 'segment_text',
    description: '将长文本按语义分段，返回 Segment 数组。',
    parameters: {
      text: { type: 'string', required: true, description: '要分段的文本' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const segs = await segmentText(llmConfig, args.text)
      return JSON.stringify(segs, null, 2)
    },
  }))

  // 工具 2: 逐段自适应改写
  ctx.tools.register(defineTool({
    name: 'adapt_segments',
    description: '根据用户上下文自适应改写内容片段。支持文本/图片/音频/视频。',
    parameters: {
      segments: { type: 'string', required: true, description: 'Segment JSON 数组' },
      userPrefs: { type: 'string', required: true, description: '用户偏好提示词' },
      timeOfDay: { type: 'string', description: 'morning/afternoon/evening/night' },
      adaptationLevel: { type: 'string', description: 'off/light/moderate/aggressive' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const segments = JSON.parse(args.segments) as Segment[]
      const user = createDefaultUser({
        preferences: {
          includeTopics: [],
          excludeTopics: [],
          excludeSentiments: [],
          preferredTone: 'neutral',
          preferredDetailLevel: 'normal',
          customPrompt: args.userPrefs,
        },
      })
      const time = createTimeContext()
      if (args.timeOfDay) {
        time.timeOfDay = args.timeOfDay as any
      }
      const ctx = createRenderContext(
        user,
        time,
        config.platformRules,
        config.communityVibe,
        (args.adaptationLevel as any) ?? 'moderate'
      )
      const results = await adaptSegments(adaptConfig, segments, ctx)
      return JSON.stringify(results, null, 2)
    },
  }))

  // 工具 3: 动态渲染（同内容不同上下文 → 不同版本）
  ctx.tools.register(defineTool({
    name: 'render_content',
    description: '动态渲染内容：同一条内容，不同用户/不同时间 → 不同版本。',
    parameters: {
      contentId: { type: 'string', required: true, description: '内容 ID' },
      segments: { type: 'string', required: true, description: 'Segment JSON 数组' },
      userPrefs: { type: 'string', required: true, description: '用户偏好提示词' },
      timeOfDay: { type: 'string', description: 'morning/afternoon/evening/night' },
      adaptationLevel: { type: 'string', description: 'off/light/moderate/aggressive' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const segments = JSON.parse(args.segments) as Segment[]
      const user = createDefaultUser({
        preferences: {
          includeTopics: [],
          excludeTopics: [],
          excludeSentiments: [],
          preferredTone: 'neutral',
          preferredDetailLevel: 'normal',
          customPrompt: args.userPrefs,
        },
      })
      const time = createTimeContext()
      if (args.timeOfDay) {
        time.timeOfDay = args.timeOfDay as any
      }
      const ctx = createRenderContext(
        user,
        time,
        config.platformRules,
        config.communityVibe,
        (args.adaptationLevel as any) ?? 'moderate'
      )
      const version = await renderContent(adaptConfig, args.contentId, segments, ctx)
      return JSON.stringify(version, null, 2)
    },
  }))

  // 工具 4: 版本对比
  ctx.tools.register(defineTool({
    name: 'compare_renderings',
    description: '对比同一内容在不同上下文下的渲染结果。',
    parameters: {
      contentId: { type: 'string', required: true, description: '内容 ID' },
      segments: { type: 'string', required: true, description: 'Segment JSON 数组' },
      scenarios: { type: 'string', required: true, description: '场景 JSON 数组 [{label, userPrefs, timeOfDay}]' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const segments = JSON.parse(args.segments) as Segment[]
      const scenarios = JSON.parse(args.scenarios) as Array<{
        label: string
        userPrefs: string
        timeOfDay: string
      }>

      clearVersionHistory()

      const contexts = scenarios.map((s) => {
        const user = createDefaultUser({
          preferences: {
            includeTopics: [],
            excludeTopics: [],
            excludeSentiments: [],
            preferredTone: 'neutral',
            preferredDetailLevel: 'normal',
            customPrompt: s.userPrefs,
          },
        })
        const time = createTimeContext()
        time.timeOfDay = s.timeOfDay as any
        return {
          label: s.label,
          context: createRenderContext(user, time, config.platformRules, config.communityVibe),
        }
      })

      const comparison = await compareRenderings(adaptConfig, args.contentId, segments, contexts)
      return JSON.stringify(comparison, null, 2)
    },
  }))
}
