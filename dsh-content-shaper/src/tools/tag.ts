import type { LLMConfig } from '../lib/llm.js'
import { callLLMJSON } from '../lib/llm.js'

export interface ContentTag {
  categories: string[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'controversial'
  energyLevel: 'high-energy' | 'calm' | 'low-energy'
  topics: string[]
  keywords: string[]
}

export async function tagContent(
  config: LLMConfig,
  content: string
): Promise<ContentTag> {
  const messages = [
    {
      role: 'system' as const,
      content: `你是一个内容标注助手。分析内容并返回 JSON：
{
  "categories": ["分类1", "分类2"],
  "sentiment": "positive/neutral/negative/controversial",
  "energyLevel": "high-energy/calm/low-energy",
  "topics": ["主题1", "主题2"],
  "keywords": ["关键词1", "关键词2"]
}

分类示例：科技、美食、体育、政治、情感、动物、旅行、教育、金融、娱乐、生活、健康
sentiment: positive=积极, neutral=中性, negative=消极, controversial=争议性
energyLevel: high-energy=激烈, calm=平静, low-energy=低能量`,
    },
    {
      role: 'user' as const,
      content: `请标注以下内容：\n\n${content}`,
    },
  ]

  return callLLMJSON<ContentTag>(config, messages, { temperature: 0.1 })
}
