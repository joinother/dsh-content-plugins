#!/usr/bin/env node

// 文本自适应演示：同一条内容，不同用户/不同时间 → 不同版本
// 用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo-text.mjs

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

// 同一条内容
const contentId = 'post-001'
const segments = [
  makeText('seg-1', '这个产品的设计简直是垃圾，用了三天就坏了，客服还一脸不耐烦，建议大家千万别买，买了就是扔钱！'),
  makeText('seg-2', '不过说实话，它的外观确实还行，颜色搭配挺好看的，如果质量能跟上就完美了。'),
]

// 场景 1: 普通用户，白天，中等适应
const user1 = createDefaultUser({
  userId: 'user-a',
  displayName: '小明',
  preferences: {
    includeTopics: [],
    excludeTopics: [],
    excludeSentiments: [],
    preferredTone: 'casual',
    preferredDetailLevel: 'normal',
    customPrompt: '我是普通消费者，想看真实的产品评价',
  },
})
const time1 = createTimeContext(new Date('2026-08-28T10:00:00'))
const ctx1 = createRenderContext(user1, time1, '禁止人身攻击和虚假信息', '友善、理性', 'moderate')

// 场景 2: 不想看负能量的用户，晚上，轻度适应
const user2 = createDefaultUser({
  userId: 'user-b',
  displayName: '小红',
  preferences: {
    includeTopics: [],
    excludeTopics: [],
    excludeSentiments: ['negative', 'controversial'],
    preferredTone: 'casual',
    preferredDetailLevel: 'brief',
    customPrompt: '我今天心情不好，不想看到负能量和负面评价，只想看积极的内容',
  },
})
const time2 = createTimeContext(new Date('2026-08-28T21:00:00'))
time2.timeOfDay = 'night'
const ctx2 = createRenderContext(user2, time2, '禁止人身攻击和虚假信息', '友善、理性', 'moderate')

// 场景 3: 专业用户，早晨，积极适应（需要详细信息）
const user3 = createDefaultUser({
  userId: 'user-c',
  displayName: '产品经理老王',
  preferences: {
    includeTopics: ['科技', '产品'],
    excludeTopics: [],
    excludeSentiments: [],
    preferredTone: 'formal',
    preferredDetailLevel: 'detailed',
    customPrompt: '我是产品经理，需要客观详细的产品反馈信息，用于改进产品',
  },
  demographics: { expertiseLevel: 'expert' },
})
const time3 = createTimeContext(new Date('2026-08-28T08:00:00'))
const ctx3 = createRenderContext(user3, time3, '禁止人身攻击和虚假信息', '友善、理性', 'aggressive')

async function run() {
  if (!API_KEY) {
    console.error('请设置 DEEPSEEK_API_KEY 环境变量')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║   Content Adaptive 文本自适应演示                       ║')
  console.log('║   同一条内容 → 3 个用户 → 3 个不同版本                  ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  console.log('\n原文:')
  for (const seg of segments) {
    console.log(`  ${seg.content}`)
  }

  clearVersionHistory()

  const comparison = await compareRenderings(config, contentId, segments, [
    { label: '小明 (白天·普通用户·中等适应)', context: ctx1 },
    { label: '小红 (晚上·不想看负能量·中等适应)', context: ctx2 },
    { label: '老王 (早晨·产品经理·积极适应)', context: ctx3 },
  ])

  printComparison(comparison)
}

run().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
