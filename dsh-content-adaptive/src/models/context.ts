// User / Time / Conversation Context Model
// 决定"同一条内容如何渲染"的上下文

export interface UserContext {
  userId: string
  displayName: string
  preferences: UserPreference
  readingHistory: ReadingHistoryEntry[]
  conversationContext?: string
  demographics?: {
    ageRange?: string
    interests?: string[]
    expertiseLevel?: 'beginner' | 'intermediate' | 'expert'
  }
}

export interface UserPreference {
  includeTopics: string[]
  excludeTopics: string[]
  excludeSentiments: string[]
  preferredTone: 'casual' | 'formal' | 'academic' | 'humorous' | 'neutral'
  preferredDetailLevel: 'brief' | 'normal' | 'detailed'
  language?: string
  customPrompt: string
}

export interface ReadingHistoryEntry {
  contentId: string
  timestamp: number
  action: 'read' | 'skip' | 'like' | 'dislike' | 'comment'
  topics?: string[]
}

export interface TimeContext {
  timestamp: number
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: 'weekday' | 'weekend'
  season?: string
  mood?: 'energetic' | 'calm' | 'tired' | 'stressed'
}

export interface RenderContext {
  user: UserContext
  time: TimeContext
  platformRules: string
  communityVibe: string
  adaptationLevel: 'off' | 'light' | 'moderate' | 'aggressive'
}

export function createTimeContext(date: Date = new Date()): TimeContext {
  const hour = date.getHours()
  const day = date.getDay()

  let timeOfDay: TimeContext['timeOfDay']
  if (hour >= 6 && hour < 12) timeOfDay = 'morning'
  else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'
  else if (hour >= 18 && hour < 22) timeOfDay = 'evening'
  else timeOfDay = 'night'

  const dayOfWeek: TimeContext['dayOfWeek'] =
    day === 0 || day === 6 ? 'weekend' : 'weekday'

  return {
    timestamp: date.getTime(),
    timeOfDay,
    dayOfWeek,
  }
}

export function createDefaultUser(overrides?: Partial<UserContext>): UserContext {
  return {
    userId: 'default-user',
    displayName: '默认用户',
    preferences: {
      includeTopics: [],
      excludeTopics: [],
      excludeSentiments: [],
      preferredTone: 'neutral',
      preferredDetailLevel: 'normal',
      customPrompt: '',
    },
    readingHistory: [],
    ...overrides,
  }
}

export function createRenderContext(
  user: UserContext,
  time: TimeContext,
  platformRules: string,
  communityVibe: string,
  adaptationLevel: RenderContext['adaptationLevel'] = 'moderate'
): RenderContext {
  return { user, time, platformRules, communityVibe, adaptationLevel }
}

export function describeContext(ctx: RenderContext): string {
  const lines = [
    `用户: ${ctx.user.displayName} (${ctx.user.userId})`,
    `时间: ${ctx.time.timeOfDay} / ${ctx.time.dayOfWeek}`,
    `适应级别: ${ctx.adaptationLevel}`,
    `偏好语气: ${ctx.user.preferences.preferredTone}`,
    `偏好详略: ${ctx.user.preferences.preferredDetailLevel}`,
  ]
  if (ctx.user.preferences.includeTopics.length)
    lines.push(`包含主题: ${ctx.user.preferences.includeTopics.join(', ')}`)
  if (ctx.user.preferences.excludeTopics.length)
    lines.push(`排除主题: ${ctx.user.preferences.excludeTopics.join(', ')}`)
  if (ctx.user.preferences.excludeSentiments.length)
    lines.push(`排除情感: ${ctx.user.preferences.excludeSentiments.join(', ')}`)
  if (ctx.user.preferences.customPrompt)
    lines.push(`自定义: ${ctx.user.preferences.customPrompt}`)
  if (ctx.user.conversationContext)
    lines.push(`对话上下文: ${ctx.user.conversationContext.slice(0, 80)}...`)
  return lines.join('\n')
}
