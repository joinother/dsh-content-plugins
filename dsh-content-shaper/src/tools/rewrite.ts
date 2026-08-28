import type { LLMConfig } from '../lib/llm.js'
import { callLLM } from '../lib/llm.js'
import type { ModerationResult } from './moderate.js'

export interface RewriteResult {
  original: string
  rewritten: string
  changes: Array<{
    originalSnippet: string
    rewrittenSnippet: string
    reason: string
  }>
  preservedIntent: string
}

export async function rewriteContent(
  config: LLMConfig,
  content: string,
  moderation: ModerationResult,
  platformRules: string,
  communityVibe: string
): Promise<RewriteResult> {
  const violationsText = moderation.violations
    .map((v) => `- 类型: ${v.type}，严重度: ${v.severity}，片段: "${v.snippet}"，原因: ${v.reason}`)
    .join('\n')

  const messages = [
    {
      role: 'system' as const,
      content: `你是一个内容改写助手。你的任务是将违规内容改写为符合平台规则的版本，同时尽量保留用户的原始意图和表达风格。

${platformRules}

${communityVibe}

改写原则：
1. 保留用户的核心观点和意图
2. 移除或替换违规部分（人身攻击→理性批评，虚假信息→中性表述）
3. 调整语气使其符合社区氛围
4. 不要添加用户没有表达的观点
5. 尽量保持原文长度和结构

请直接输出改写后的内容，不要加任何解释。`,
    },
    {
      role: 'user' as const,
      content: `原文：${content}

检测到的违规：
${violationsText}

请改写这段内容使其符合规则。`,
    },
  ]

  const rewritten = await callLLM(config, messages, { temperature: 0.4 })

  const changes = moderation.violations.map((v) => ({
    originalSnippet: v.snippet,
    rewrittenSnippet: '(已改写)',
    reason: `${v.type}: ${v.reason}`,
  }))

  return {
    original: content,
    rewritten: rewritten.trim(),
    changes,
    preservedIntent: '改写保留了用户核心意图，仅调整了违规表达',
  }
}
