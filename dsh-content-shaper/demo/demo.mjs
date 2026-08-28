#!/usr/bin/env node

// Content Shaper 发帖侧改写演示
// 用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo.mjs

import { moderateContent, rewriteContent, verifyRewrite } from '../src/index.ts'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const API_BASE = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

const PLATFORM_RULES = `平台内容规则：
1. 禁止人身攻击、侮辱、谩骂
2. 禁止虚假信息和恶意造谣
3. 禁止泄露他人隐私
4. 禁止煽动仇恨和歧视
5. 禁止低俗色情内容
6. 鼓励理性、建设性的讨论`

const COMMUNITY_VIBE = `社区氛围设定：
- 友善、包容、理性
- 鼓励多元观点但反对恶意攻击
- 对新手友好，乐于解答`

const config = { apiKey: API_KEY, apiBase: API_BASE, model: MODEL }

const samples = [
  {
    label: '人身攻击',
    content: '你这个白痴，写的什么垃圾代码，脑子是不是有问题？回家种地去吧！',
  },
  {
    label: '虚假信息',
    content: '据内部消息，某公司马上要倒闭了，大家快抛售股票，我已经全清了。',
  },
  {
    label: '正常内容',
    content: '今天试了新的红烧肉做法，用了冰糖炒糖色，味道比之前好太多了，分享给大家。',
  },
]

function hr(label) {
  const line = '═'.repeat(50)
  console.log(`\n${line}\n  ${label}\n${line}`)
}

async function run() {
  if (!API_KEY) {
    console.error('请设置 DEEPSEEK_API_KEY 环境变量')
    console.error('用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo.mjs')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║     Content Shaper 发帖侧改写演示               ║')
  console.log('║     moderate → rewrite → verify                 ║')
  console.log('╚══════════════════════════════════════════════════╝')

  for (const sample of samples) {
    hr(`样本: ${sample.label}`)

    // Step 1: 审核
    console.log('\n[1/3] 内容审核...')
    const moderation = await moderateContent(config, sample.content, PLATFORM_RULES)
    console.log(`  通过: ${moderation.passed ? '是' : '否'}`)
    console.log(`  总结: ${moderation.summary}`)
    if (moderation.violations.length > 0) {
      console.log('  违规:')
      for (const v of moderation.violations) {
        console.log(`    - [${v.severity}] ${v.type}: "${v.snippet}" — ${v.reason}`)
      }
    }

    if (moderation.passed) {
      console.log('\n  ✓ 内容合规，无需改写，直接发布。')
      continue
    }

    // Step 2: 改写
    console.log('\n[2/3] 内容改写...')
    const rewrite = await rewriteContent(
      config,
      sample.content,
      moderation,
      PLATFORM_RULES,
      COMMUNITY_VIBE
    )
    console.log(`  原文: ${rewrite.original}`)
    console.log(`  改写: ${rewrite.rewritten}`)
    console.log(`  意图: ${rewrite.preservedIntent}`)

    // Step 3: 复验
    console.log('\n[3/3] 改写复验...')
    const verify = await verifyRewrite(config, sample.content, rewrite.rewritten, PLATFORM_RULES)
    console.log(`  合规: ${verify.moderation.passed ? '是' : '否'}`)
    console.log(`  意图保留: ${verify.intentPreserved ? '是' : '否'}`)
    console.log(`  意图分析: ${verify.intentAnalysis}`)
    console.log(`  最终通过: ${verify.passed ? '是 ✓' : '否 ✗'}`)
  }

  hr('演示完成')
}

run().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
