#!/usr/bin/env node

// 动态内容演示：同一用户在不同时间看到同一内容的不同版本
// 用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo-dynamic.mjs

import {
  makeText,
  createDefaultUser,
  createTimeContext,
  createRenderContext,
  compareRenderings,
  printComparison,
  clearVersionHistory,
} from '../src/index.ts'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const config = {
  llm: {
    apiKey: API_KEY,
    apiBase: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    visionModel: 'deepseek-chat',
  },
  audio: { whisperEndpoint: '', ttsEndpoint: '' },
}

// 一条包含多观点的内容
const contentId = 'discussion-042'
const segments = [
  makeText('seg-1', '关于这个新政策，有人支持有人反对。支持的人认为这能促进市场竞争，反对的人担心小企业会被挤垮。我个人觉得两方都有道理。'),
  makeText('seg-2', '另外，从技术角度看，这个政策涉及的合规成本不低，中小企业可能需要额外投入20-30%的IT预算来满足要求。'),
  makeText('seg-3', '说实话，昨天和朋友聊到这个话题差点吵起来，他觉得我太悲观了。但我觉得现实就是这么复杂，不是非黑即白的。'),
]

// 同一个用户，不同时间/不同心情
const baseUser = {
  userId: 'user-x',
  displayName: '小李',
  preferences: {
    includeTopics: [],
    excludeTopics: [],
    excludeSentiments: [],
    preferredTone: 'casual',
    preferredDetailLevel: 'normal',
  },
}

async function run() {
  if (!API_KEY) {
    console.error('请设置 DEEPSEEK_API_KEY 环境变量')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║   动态内容演示：同一用户，不同时间 → 不同版本           ║')
  console.log('║   展示"内容不是静态的，而是渲染函数"                    ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  console.log('\n原文:')
  for (const seg of segments) {
    console.log(`  [${seg.id}] ${seg.content}`)
  }

  clearVersionHistory()

  // 场景 1: 早晨，精力充沛，想看深度分析
  const morningUser = createDefaultUser({
    ...baseUser,
    preferences: {
      ...baseUser.preferences,
      customPrompt: '早晨精力充沛，想看有深度的分析，偏好详细的技术信息',
    },
  })
  const morningTime = createTimeContext(new Date('2026-08-28T08:30:00'))
  const morningCtx = createRenderContext(morningUser, morningTime, '禁止人身攻击和虚假信息', '友善、理性', 'moderate')

  // 场景 2: 午休，想轻松看
  const noonUser = createDefaultUser({
    ...baseUser,
    preferences: {
      ...baseUser.preferences,
      preferredDetailLevel: 'brief',
      customPrompt: '午休时间，想快速浏览要点，不要太长',
    },
  })
  const noonTime = createTimeContext(new Date('2026-08-28T12:30:00'))
  noonTime.timeOfDay = 'afternoon'
  const noonCtx = createRenderContext(noonUser, noonTime, '禁止人身攻击和虚假信息', '友善、理性', 'light')

  // 场景 3: 深夜，不想看争议性内容
  const nightUser = createDefaultUser({
    ...baseUser,
    preferences: {
      ...baseUser.preferences,
      excludeSentiments: ['controversial'],
      preferredTone: 'calm',
      customPrompt: '深夜了，不想看争议性内容，想要平静温和的表述',
    },
  })
  const nightTime = createTimeContext(new Date('2026-08-28T23:00:00'))
  nightTime.timeOfDay = 'night'
  const nightCtx = createRenderContext(nightUser, nightTime, '禁止人身攻击和虚假信息', '友善、理性', 'moderate')

  const comparison = await compareRenderings(config, contentId, segments, [
    { label: '早晨 8:30 (精力充沛·想看深度分析)', context: morningCtx },
    { label: '午休 12:30 (快速浏览·轻松模式)', context: noonCtx },
    { label: '深夜 23:00 (不想看争议·平静模式)', context: nightCtx },
  ])

  printComparison(comparison)

  console.log('\n\n' + '═'.repeat(60))
  console.log('  关键观察:')
  console.log('═'.repeat(60))
  console.log('  1. 同一条内容，同一个用户，不同时间 → 不同版本')
  console.log('  2. 早晨版本可能更详细、保留技术分析')
  console.log('  3. 午休版本可能被压缩为要点')
  console.log('  4. 深夜版本可能软化了争议性表述')
  console.log('  5. 每个版本都有版本号，可追溯、可审计')
}

run().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
