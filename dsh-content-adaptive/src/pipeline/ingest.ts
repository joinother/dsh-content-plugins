// 内容摄取和分段管线
// 将原始输入（文本/图片/音频/视频）解析为统一的 Segment 序列

import type { Segment, TextSegment, ImageSegment, AudioSegment, VideoSegment, MixedSegment } from '../models/segment.js'
import { makeText, makeImage, makeAudio, makeVideo, makeMixed } from '../models/segment.js'
import type { LLMConfig } from '../lib/llm.js'
import { callLLM, callLLMJSON } from '../lib/llm.js'
import type { VideoConfig } from '../lib/video.js'
import { extractVideoContent, getVideoTranscript } from '../lib/video.js'
import type { AudioConfig } from '../lib/audio.js'
import { speechToText } from '../lib/audio.js'

export interface IngestConfig {
  llm: LLMConfig
  audio: AudioConfig
  video: VideoConfig
}

export interface IngestResult {
  segments: Segment[]
  summary: string
}

// 文本分段：把长文按语义段落拆分
export async function segmentText(
  llmConfig: LLMConfig,
  text: string
): Promise<TextSegment[]> {
  if (text.length < 200) {
    return [makeText('seg-1', text)]
  }

  const messages = [
    {
      role: 'system' as const,
      content: `你是一个文本分段助手。将输入文本按语义段落分成若干段，返回 JSON 数组：
[
  { "id": "seg-1", "content": "段落1内容", "summary": "段落1摘要" }
]

原则：
- 每段是一个完整的语义单元
- 保留原文，不修改内容
- 段落 ID 从 seg-1 递增`,
    },
    { role: 'user' as const, content: text },
  ]

  const segments = await callLLMJSON<
    Array<{ id: string; content: string; summary: string }>
  >(llmConfig, messages, { temperature: 0.1 })

  return segments.map((s) => makeText(s.id, s.content))
}

// 图片分析：用 vision model 生成图片描述
export async function analyzeImageSegment(
  llmConfig: LLMConfig,
  imageUrl: string,
  segmentId: string = 'img-1'
): Promise<ImageSegment> {
  const { analyzeImage } = await import('../lib/llm.js')

  const description = await analyzeImage(
    llmConfig,
    imageUrl,
    '详细描述这张图片的内容，包括场景、人物、物体、文字、情绪和任何可能违规的元素。'
  )

  return makeImage(segmentId, { url: imageUrl, description })
}

// 音频转文字
export async function ingestAudio(
  config: IngestConfig,
  audioPathOrUrl: string,
  segmentId: string = 'audio-1'
): Promise<AudioSegment> {
  const transcript = await speechToText(config.audio, audioPathOrUrl)
  return makeAudio(segmentId, { url: audioPathOrUrl, transcript })
}

// 视频提取关键帧 + 音轨转文字
export async function ingestVideo(
  config: IngestConfig,
  videoPath: string,
  segmentId: string = 'video-1'
): Promise<VideoSegment> {
  const extracted = await extractVideoContent(config.video, videoPath)

  let transcript: string | undefined
  if (extracted.audioPath) {
    transcript = await getVideoTranscript(
      config.video,
      extracted.audioPath,
      config.audio.whisperEndpoint
    ) ?? undefined
  }

  return makeVideo(segmentId, {
    url: videoPath,
    keyframes: extracted.keyframes,
    transcript,
    metadata: { duration: extracted.duration },
  })
}

// 混合内容摄取
export async function ingestMixed(
  config: IngestConfig,
  inputs: Array<{ type: 'text' | 'image' | 'audio' | 'video'; path: string }>
): Promise<MixedSegment> {
  const parts: Segment[] = []

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const id = `mixed-${i}`

    switch (input.type) {
      case 'text':
        const text = await readFile(input.path)
        const textSegs = await segmentText(config.llm, text)
        parts.push(...textSegs)
        break
      case 'image':
        parts.push(await analyzeImageSegment(config.llm, input.path, id))
        break
      case 'audio':
        parts.push(await ingestAudio(config, input.path, id))
        break
      case 'video':
        parts.push(await ingestVideo(config, input.path, id))
        break
    }
  }

  return makeMixed('mixed-0', parts)
}

async function readFile(path: string): Promise<string> {
  const { readFile: rf } = await import('node:fs/promises')
  return rf(path, 'utf-8')
}
