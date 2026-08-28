// LLM + Vision API 封装
// 支持 DeepSeek text + vision 模型

export interface LLMConfig {
  apiKey: string
  apiBase: string
  model: string
  visionModel: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

export async function callLLM(
  config: LLMConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<string> {
  const res = await fetch(config.apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model ?? config.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLM API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function callLLMJSON<T>(
  config: LLMConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<T> {
  const raw = await callLLM(config, messages, options)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`LLM did not return valid JSON: ${raw.slice(0, 300)}`)
  }
  return JSON.parse(jsonMatch[0]) as T
}

export async function callLLMArray<T>(
  config: LLMConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<T[]> {
  const raw = await callLLM(config, messages, options)
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error(`LLM did not return valid JSON array: ${raw.slice(0, 300)}`)
  }
  return JSON.parse(jsonMatch[0]) as T[]
}

export async function analyzeImage(
  config: LLMConfig,
  imageUrl: string,
  prompt: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ]

  return callLLM(config, messages, {
    temperature: 0.2,
    model: config.visionModel,
    maxTokens: 2048,
  })
}
