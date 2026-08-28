// 视频处理：用 ffmpeg 提取关键帧 + 音轨
// 需要 ffmpeg 已安装

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const execFileAsync = promisify(execFile)

export interface VideoConfig {
  ffmpegPath: string
}

export interface ExtractedVideo {
  keyframes: string[]
  audioPath: string | null
  duration: number
}

export async function extractVideoContent(
  config: VideoConfig,
  videoPath: string,
  maxKeyframes: number = 5
): Promise<ExtractedVideo> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-video-'))
  const ffmpeg = config.ffmpegPath || 'ffmpeg'
  const ffprobe = config.ffmpegPath.replace('ffmpeg', 'ffprobe') || 'ffprobe'

  // 1. 获取视频时长
  let duration = 0
  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      ['-v', 'quiet', '-print_format', 'json', '-show_format', videoPath],
      { timeout: 10000 }
    )
    const info = JSON.parse(stdout)
    duration = parseFloat(info.format?.duration ?? '0')
  } catch {
    // ffprobe 不可用，跳过
  }

  // 2. 提取关键帧
  const frameInterval = duration > 0 ? Math.floor(duration / maxKeyframes) : 1
  const keyframes: string[] = []

  for (let i = 0; i < maxKeyframes; i++) {
    const timestamp = i * frameInterval
    const framePath = join(tmpDir, `frame_${i}.jpg`)
    try {
      await execFileAsync(
        ffmpeg,
        [
          '-y', '-ss', String(timestamp), '-i', videoPath,
          '-frames:v', '1', '-q:v', '2', framePath,
        ],
        { timeout: 15000 }
      )
      const buf = await readFile(framePath)
      keyframes.push(`data:image/jpeg;base64,${buf.toString('base64')}`)
    } catch {
      // 跳过无法提取的帧
    }
  }

  // 3. 提取音轨
  let audioPath: string | null = null
  const audioFilePath = join(tmpDir, 'audio.mp3')
  try {
    await execFileAsync(
      ffmpeg,
      ['-y', '-i', videoPath, '-vn', '-acodec', 'libmp3lame', '-q:a', '4', audioFilePath],
      { timeout: 30000 }
    )
    audioPath = audioFilePath
  } catch {
    // 无音轨或提取失败
  }

  return { keyframes, audioPath, duration }
}

export async function getVideoTranscript(
  config: VideoConfig,
  audioPath: string,
  whisperEndpoint?: string
): Promise<string | null> {
  if (!whisperEndpoint) return null

  const { speechToText } = await import('./audio.js')
  const { readFile } = await import('node:fs/promises')

  const buffer = await readFile(audioPath)
  const blob = new Blob([buffer])

  const formData = new FormData()
  formData.append('file', blob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'zh')

  const res = await fetch(`${whisperEndpoint}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}` },
    body: formData,
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.text ?? null
}
