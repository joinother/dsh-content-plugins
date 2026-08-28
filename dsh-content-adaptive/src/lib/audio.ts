// 音频处理：STT (语音转文字) + TTS (文字转语音)
// 支持 OpenAI Whisper API 或本地 whisper.cpp
// 支持 OpenAI TTS API 或本地 edge-tts

export interface AudioConfig {
  whisperEndpoint: string
  ttsEndpoint: string
}

export async function speechToText(
  config: AudioConfig,
  audioPathOrUrl: string
): Promise<string> {
  if (!config.whisperEndpoint) {
    throw new Error('未配置 Whisper endpoint。请在配置中设置 whisperEndpoint。')
  }

  let audioBlob: Blob
  if (audioPathOrUrl.startsWith('http')) {
    const res = await fetch(audioPathOrUrl)
    audioBlob = await res.blob()
  } else {
    const { readFile } = await import('node:fs/promises')
    const buffer = await readFile(audioPathOrUrl)
    audioBlob = new Blob([buffer])
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'zh')

  const res = await fetch(`${config.whisperEndpoint}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`STT error ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return data.text ?? ''
}

export async function textToSpeech(
  config: AudioConfig,
  text: string,
  voice: string = 'alloy'
): Promise<Buffer> {
  if (!config.ttsEndpoint) {
    throw new Error('未配置 TTS endpoint。请在配置中设置 ttsEndpoint。')
  }

  const res = await fetch(`${config.ttsEndpoint}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  })

  if (!res.ok) {
    throw new Error(`TTS error ${res.status}: ${await res.text()}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
