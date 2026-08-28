#!/usr/bin/env node

// 图片自适应演示：用 vision model 分析图片，根据用户上下文调整展示
// 用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo-image.mjs [image-url]

import {
  makeImage,
  makeText,
  makeMixed,
  createDefaultUser,
  createTimeContext,
  createRenderContext,
  adaptSegment,
  describeSegment,
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

async function run() {
  if (!API_KEY) {
    console.error('请设置 DEEPSEEK_API_KEY 环境变量')
    process.exit(1)
  }

  const imageUrl = process.argv[2] || 'https://example.com/sample.jpg'

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║   图片自适应演示                                        ║')
  console.log('║   同一张图片 → 不同用户 → 不同展示方式                  ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  const imageSeg = makeImage('img-1', { url: imageUrl })

  // 用户 A: 正常浏览
  const userA = createDefaultUser({
    userId: 'user-img-a',
    displayName: '浏览者A',
    preferences: {
      includeTopics: [],
      excludeTopics: [],
      excludeSentiments: [],
      preferredTone: 'neutral',
      preferredDetailLevel: 'normal',
      customPrompt: '正常浏览，无特殊偏好',
    },
  })
  const timeA = createTimeContext()
  const ctxA = createRenderContext(userA, timeA, '禁止低俗色情', '友善', 'light')

  // 用户 B: 不想看到可能令人不适的图片
  const userB = createDefaultUser({
    userId: 'user-img-b',
    displayName: '浏览者B',
    preferences: {
      includeTopics: [],
      excludeTopics: [],
      excludeSentiments: ['negative'],
      preferredTone: 'neutral',
      preferredDetailLevel: 'normal',
      customPrompt: '我不想看到可能令人不适的图片，如果图片内容可能引起不适，请用文字描述替代',
    },
  })
  const timeB = createTimeContext()
  const ctxB = createRenderContext(userB, timeB, '禁止低俗色情', '友善', 'moderate')

  console.log('\n[1/2] 用户 A (正常浏览) 适配中...')
  const resultA = await adaptSegment(config, imageSeg, ctxA)
  console.log(`\n结果:`)
  console.log(`  原始: ${describeSegment(imageSeg)}`)
  console.log(`  适配: ${describeSegment(resultA.adapted)}`)
  console.log(`  原因: ${resultA.adaptationReason}`)

  console.log('\n[2/2] 用户 B (不想看不适宜图片) 适配中...')
  const resultB = await adaptSegment(config, imageSeg, ctxB)
  console.log(`\n结果:`)
  console.log(`  原始: ${describeSegment(imageSeg)}`)
  console.log(`  适配: ${describeSegment(resultB.adapted)}`)
  console.log(`  原因: ${resultB.adaptationReason}`)
  if (resultB.changes.length > 0) {
    console.log('  变更:')
    for (const c of resultB.changes) {
      console.log(`    - ${c.field}: "${c.before}" → "${c.after}" (${c.reason})`)
    }
  }
}

run().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
