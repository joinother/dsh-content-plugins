// DeepSeek Harness Plugin: Content Shaper
// 发帖侧改写 + 读者侧过滤 原型机

export { moderateContent, type ModerationResult } from './tools/moderate.js'
export { rewriteContent, type RewriteResult } from './tools/rewrite.js'
export { verifyRewrite, type VerifyResult } from './tools/verify.js'
export { tagContent, type ContentTag } from './tools/tag.js'
export {
  filterFeed,
  createPreferenceFromPrompt,
  type UserPreference,
  type FeedItem,
  type FilteredFeedItem,
} from './tools/filter.js'
export { callLLM, callLLMJSON, type LLMConfig, type ChatMessage } from './lib/llm.js'

// ─── DSH Plugin Entry ──────────────────────────────────────────
// 当作为 DeepSeek Harness 插件加载时，注册以下工具：
//   - moderate_content: 审核内容是否违规
//   - rewrite_content: 改写违规内容使其合规
//   - verify_rewrite: 复验改写结果
//   - tag_content: 标注内容分类和情感
//   - filter_feed: 按读者偏好过滤信息流

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { moderateContent } from './tools/moderate.js'
import { rewriteContent } from './tools/rewrite.js'
import { verifyRewrite } from './tools/verify.js'
import { tagContent } from './tools/tag.js'
import { filterFeed, createPreferenceFromPrompt } from './tools/filter.js'
import type { LLMConfig } from './lib/llm.js'

export const name = 'content-shaper'
export const inject = ['tools']

export interface Config extends LLMConfig {
  platformRules: string
  communityVibe: string
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().description('DeepSeek API Key').default(''),
  apiBase: Schema.string()
    .description('API endpoint')
    .default('https://api.deepseek.com/v1/chat/completions'),
  model: Schema.string().description('Model name').default('deepseek-chat'),
  platformRules: Schema.string()
    .description('Platform content rules')
    .default('禁止人身攻击、虚假信息、隐私泄露、煽动仇恨、低俗色情'),
  communityVibe: Schema.string()
    .description('Community vibe setting')
    .default('友善、包容、理性'),
})

export function apply(ctx: Context, config: Config) {
  const llmConfig: LLMConfig = {
    apiKey: config.apiKey,
    apiBase: config.apiBase,
    model: config.model,
  }

  // 工具 1: 内容审核
  ctx.tools.register(
    defineTool({
      name: 'moderate_content',
      description: '审核内容是否违反平台规则。返回违规列表和严重度。',
      parameters: {
        content: { type: 'string', required: true, description: '要审核的内容' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const result = await moderateContent(llmConfig, args.content, config.platformRules)
        return JSON.stringify(result, null, 2)
      },
    })
  )

  // 工具 2: 内容改写
  ctx.tools.register(
    defineTool({
      name: 'rewrite_content',
      description: '将违规内容改写为合规版本，保留原始意图。',
      parameters: {
        content: { type: 'string', required: true, description: '原始内容' },
        violations: {
          type: 'string',
          required: true,
          description: '审核结果中的 violations JSON 字符串',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const violations = JSON.parse(args.violations)
        const result = await rewriteContent(
          llmConfig,
          args.content,
          { passed: false, violations, summary: '' },
          config.platformRules,
          config.communityVibe
        )
        return JSON.stringify(result, null, 2)
      },
    })
  )

  // 工具 3: 改写复验
  ctx.tools.register(
    defineTool({
      name: 'verify_rewrite',
      description: '验证改写后的内容是否合规且保留了原文意图。',
      parameters: {
        original: { type: 'string', required: true, description: '原始内容' },
        rewritten: { type: 'string', required: true, description: '改写后的内容' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const result = await verifyRewrite(
          llmConfig,
          args.original,
          args.rewritten,
          config.platformRules
        )
        return JSON.stringify(result, null, 2)
      },
    })
  )

  // 工具 4: 内容标注
  ctx.tools.register(
    defineTool({
      name: 'tag_content',
      description: '标注内容的分类、情感、能量级别、主题和关键词。',
      parameters: {
        content: { type: 'string', required: true, description: '要标注的内容' },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const result = await tagContent(llmConfig, args.content)
        return JSON.stringify(result, null, 2)
      },
    })
  )

  // 工具 5: 读者侧过滤
  ctx.tools.register(
    defineTool({
      name: 'filter_feed',
      description: '根据读者偏好过滤信息流。支持排除主题、情感、能量级别，或自定义提示词。',
      parameters: {
        feed: { type: 'string', required: true, description: '信息流 JSON 数组，每项含 id 和 content' },
        preferencePrompt: {
          type: 'string',
          required: true,
          description: '读者偏好提示词，如"今天不想看争议性内容和负能量，只想看厨艺相关"',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const feed = JSON.parse(args.feed)
        const preference = createPreferenceFromPrompt(args.preferencePrompt)
        const result = await filterFeed(llmConfig, feed, preference)
        return JSON.stringify(result, null, 2)
      },
    })
  )
}
