import type { LLMConfig } from '../lib/llm.js'
import { callLLMJSON } from '../lib/llm.js'

export interface ModerationResult {
  passed: boolean
  violations: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    snippet: string
    reason: string
  }>
  summary: string
}

export async function moderateContent(
  config: LLMConfig,
  content: string,
  platformRules: string
): Promise<ModerationResult> {
  const messages = [
    {
      role: 'system' as const,
      content: `你是一个内容审核助手。根据以下平台规则审核用户内容，返回 JSON。

${platformRules}

返回格式：
{
  "passed": true/false,
  "violations": [
    { "type": "违规类型", "severity": "low/medium/high", "snippet": "违规片段", "reason": "原因" }
  ],
  "summary": "审核总结"
}

如果没有违规，violations 为空数组，passed 为 true。`,
    },
    {
      role: 'user' as const,
      content: `请审核以下内容：\n\n${content}`,
    },
  ]

  return callLLMJSON<ModerationResult>(config, messages, { temperature: 0.1 })
}
