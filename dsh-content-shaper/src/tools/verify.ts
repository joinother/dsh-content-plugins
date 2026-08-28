import type { LLMConfig } from '../lib/llm.js'
import { callLLMJSON } from '../lib/llm.js'
import { moderateContent, type ModerationResult } from './moderate.js'

export interface VerifyResult {
  passed: boolean
  moderation: ModerationResult
  intentPreserved: boolean
  intentAnalysis: string
}

export async function verifyRewrite(
  config: LLMConfig,
  original: string,
  rewritten: string,
  platformRules: string
): Promise<VerifyResult> {
  const moderation = await moderateContent(config, rewritten, platformRules)

  const messages = [
    {
      role: 'system' as const,
      content: `你是一个内容审核助手。判断改写后的内容是否保留了原文的核心意图。返回 JSON：
{
  "intentPreserved": true/false,
  "intentAnalysis": "分析说明"
}`,
    },
    {
      role: 'user' as const,
      content: `原文：${original}

改写后：${rewritten}

改写后的内容是否保留了原文的核心意图？`,
    },
  ]

  const intentResult = await callLLMJSON<{ intentPreserved: boolean; intentAnalysis: string }>(
    config,
    messages,
    { temperature: 0.1 }
  )

  return {
    passed: moderation.passed && intentResult.intentPreserved,
    moderation,
    intentPreserved: intentResult.intentPreserved,
    intentAnalysis: intentResult.intentAnalysis,
  }
}
