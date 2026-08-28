export interface LLMConfig {
  apiKey: string
  apiBase: string
  model: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callLLM(
  config: LLMConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const res = await fetch(config.apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
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
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const raw = await callLLM(config, messages, options)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`LLM did not return valid JSON: ${raw.slice(0, 200)}`)
  }
  return JSON.parse(jsonMatch[0]) as T
}
