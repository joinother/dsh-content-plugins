import type { LLMConfig } from '../lib/llm.js'
import { callLLMJSON } from '../lib/llm.js'
import type { ContentTag } from './tag.js'

export interface UserPreference {
  includeTopics: string[]
  excludeTopics: string[]
  excludeSentiments: string[]
  excludeEnergyLevels: string[]
  customPrompt: string
}

export interface FeedItem {
  id: string
  content: string
  tag?: ContentTag
}

export interface FilteredFeedItem extends FeedItem {
  relevanceScore: number
  action: 'show' | 'fold' | 'hide'
  reason: string
}

export async function filterFeed(
  config: LLMConfig,
  feed: FeedItem[],
  preference: UserPreference
): Promise<FilteredFeedItem[]> {
  const feedText = feed
    .map((item) => `[${item.id}] ${item.content.slice(0, 200)}`)
    .join('\n---\n')

  const excludeTopicsText = preference.excludeTopics.length
    ? `排除主题: ${preference.excludeTopics.join(', ')}`
    : ''
  const includeTopicsText = preference.includeTopics.length
    ? `优先包含主题: ${preference.includeTopics.join(', ')}`
    : ''
  const excludeSentimentsText = preference.excludeSentiments.length
    ? `排除情感倾向: ${preference.excludeSentiments.join(', ')}`
    : ''
  const excludeEnergyText = preference.excludeEnergyLevels.length
    ? `排除能量级别: ${preference.excludeEnergyLevels.join(', ')}`
    : ''

  const messages = [
    {
      role: 'system' as const,
      content: `你是一个个性化信息流过滤助手。根据用户的阅读偏好，对信息流中的每条内容进行评分和过滤。

返回 JSON 数组：
[
  {
    "id": "内容ID",
    "relevanceScore": 0-100的整数,
    "action": "show/fold/hide",
    "reason": "过滤理由"
  }
]

规则：
- show: 相关度高，正常展示
- fold: 相关度中等或用户可能不感兴趣，折叠展示
- hide: 用户明确排除的内容，隐藏

${includeTopicsText}
${excludeTopicsText}
${excludeSentimentsText}
${excludeEnergyText}
${preference.customPrompt ? `用户自定义偏好: ${preference.customPrompt}` : ''}`,
    },
    {
      role: 'user' as const,
      content: `请过滤以下信息流：\n\n${feedText}`,
    },
  ]

  const results = await callLLMJSON<Array<{
    id: string
    relevanceScore: number
    action: 'show' | 'fold' | 'hide'
    reason: string
  }>>(config, messages, { temperature: 0.1 })

  const resultMap = new Map(results.map((r) => [r.id, r]))

  return feed.map((item) => {
    const result = resultMap.get(item.id)
    return {
      ...item,
      relevanceScore: result?.relevanceScore ?? 50,
      action: result?.action ?? 'show',
      reason: result?.reason ?? '未评估',
    }
  })
}

export function createPreferenceFromPrompt(prompt: string): UserPreference {
  const preference: UserPreference = {
    includeTopics: [],
    excludeTopics: [],
    excludeSentiments: [],
    excludeEnergyLevels: [],
    customPrompt: prompt,
  }

  const lower = prompt.toLowerCase()

  if (lower.match(/争议|争论|吵架/)) {
    preference.excludeSentiments.push('controversial')
  }
  if (lower.match(/负能量|消极|负面/)) {
    preference.excludeSentiments.push('negative')
  }
  if (lower.match(/动物|宠物/)) {
    if (lower.match(/不看|不要|排除/)) {
      preference.excludeTopics.push('动物')
    }
  }
  if (lower.match(/厨艺|烹饪|美食|做菜/)) {
    preference.includeTopics.push('美食')
  }
  if (lower.match(/激烈|吵架|高能/)) {
    preference.excludeEnergyLevels.push('high-energy')
  }

  return preference
}
