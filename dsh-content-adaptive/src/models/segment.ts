// Content Segment Model
// 统一的内容片段抽象：文本/图片/音频/视频/混合

export type SegmentModality = 'text' | 'image' | 'audio' | 'video' | 'mixed'

export interface TextSegment {
  id: string
  modality: 'text'
  content: string
  metadata?: {
    language?: string
    speaker?: string
    timestamp?: number
  }
}

export interface ImageSegment {
  id: string
  modality: 'image'
  url?: string
  base64?: string
  description?: string
  metadata?: {
    width?: number
    height?: number
    source?: string
  }
}

export interface AudioSegment {
  id: string
  modality: 'audio'
  url?: string
  base64?: string
  transcript?: string
  metadata?: {
    duration?: number
    format?: string
    speaker?: string
  }
}

export interface VideoSegment {
  id: string
  modality: 'video'
  url?: string
  base64?: string
  keyframes?: string[]
  transcript?: string
  metadata?: {
    duration?: number
    width?: number
    height?: number
    fps?: number
  }
}

export interface MixedSegment {
  id: string
  modality: 'mixed'
  parts: Segment[]
}

export type Segment = TextSegment | ImageSegment | AudioSegment | VideoSegment | MixedSegment

export interface AdaptedSegment<T extends Segment = Segment> {
  original: T
  adapted: T
  changes: SegmentChange[]
  adaptationReason: string
}

export interface SegmentChange {
  field: string
  before: string
  after: string
  reason: string
}

export function makeText(id: string, content: string, metadata?: TextSegment['metadata']): TextSegment {
  return { id, modality: 'text', content, metadata }
}

export function makeImage(id: string, opts: Partial<ImageSegment>): ImageSegment {
  return { id, modality: 'image', ...opts }
}

export function makeAudio(id: string, opts: Partial<AudioSegment>): AudioSegment {
  return { id, modality: 'audio', ...opts }
}

export function makeVideo(id: string, opts: Partial<VideoSegment>): VideoSegment {
  return { id, modality: 'video', ...opts }
}

export function makeMixed(id: string, parts: Segment[]): MixedSegment {
  return { id, modality: 'mixed', parts }
}

export function describeSegment(seg: Segment): string {
  switch (seg.modality) {
    case 'text':
      return `[text:${seg.id}] ${seg.content.slice(0, 80)}...`
    case 'image':
      return `[image:${seg.id}] ${seg.description ?? '(no description)'}`
    case 'audio':
      return `[audio:${seg.id}] transcript: ${(seg.transcript ?? '(none)').slice(0, 80)}...`
    case 'video':
      return `[video:${seg.id}] ${seg.keyframes?.length ?? 0} keyframes, transcript: ${(seg.transcript ?? '(none)').slice(0, 80)}...`
    case 'mixed':
      return `[mixed:${seg.id}] ${seg.parts.length} parts: ${seg.parts.map((p) => p.modality).join(', ')}`
  }
}
