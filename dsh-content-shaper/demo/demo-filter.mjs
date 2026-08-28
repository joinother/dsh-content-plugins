#!/usr/bin/env node

// Content Shaper 读者侧过滤演示
// 用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo-filter.mjs

import { filterFeed, createPreferenceFromPrompt } from '../src/index.ts'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const API_BASE = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

const config = { apiKey: API_KEY, apiBase: API_BASE, model: MODEL }

const mockFeed = [
  {
    id: '1',
    content: '今天做了糖醋排骨，酸甜口正好吃，记录一下配方：排骨500g，冰糖30g，醋40ml...',
  },
  {
    id: '2',
    content: '某品牌手机就是垃圾，买了一个月就坏了，客服态度还差，大家千万别买！',
  },
  {
    id: '3',
    content: '转：最新研究显示，每天喝三杯咖啡可以延长寿命20年，科学家都震惊了！',
  },
  {
    id: '4',
    content: '我家猫今天又把花瓶打翻了，气死我了但看到它卖萌的样子又舍不得骂...',
  },
  {
    id: '5',
    content: '关于这个政策我觉得有好处也有坏处，一方面能促进行业发展，另一方面可能增加小企业负担。',
  },
  {
    id: '6',
    content: '红烧肉的关键在于火候，先大火收汁再小火慢炖，肥而不腻入口即化。',
  },
  {
    id: '7',
    content: '今天心情很差，什么都不想做，感觉人生没有意义...',
  },
  {
    id: '8',
    content: '刚刚看完一场精彩的足球比赛，最后十分钟连进两球逆转，太刺激了！',
  },
]

function hr(label) {
  const line = '═'.repeat(50)
  console.log(`\n${line}\n  ${label}\n${line}`)
}

async function run() {
  if (!API_KEY) {
    console.error('请设置 DEEPSEEK_API_KEY 环境变量')
    console.error('用法: DEEPSEEK_API_KEY=sk-xxx node demo/demo-filter.mjs')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║     Content Shaper 读者侧过滤演示               ║')
  console.log('║     用户偏好 → 信息流个性化过滤                  ║')
  console.log('╚══════════════════════════════════════════════════╝')

  // 场景 1: 只想看厨艺
  hr('场景 1: "今天只想看厨艺相关的内容"')
  const pref1 = createPreferenceFromPrompt('今天只想看厨艺相关的内容')
  console.log('解析偏好:', JSON.stringify(pref1, null, 2))
  console.log('\n过滤中...')
  const result1 = await filterFeed(config, mockFeed, pref1)
  printFeed(result1)

  // 场景 2: 不看争议和负能量
  hr('场景 2: "不想看争议性内容和负能量"')
  const pref2 = createPreferenceFromPrompt('不想看争议性内容和负能量')
  console.log('解析偏好:', JSON.stringify(pref2, null, 2))
  console.log('\n过滤中...')
  const result2 = await filterFeed(config, mockFeed, pref2)
  printFeed(result2)

  // 场景 3: 不看动物
  hr('场景 3: "不想看有关动物的内容"')
  const pref3 = createPreferenceFromPrompt('不想看有关动物的内容')
  console.log('解析偏好:', JSON.stringify(pref3, null, 2))
  console.log('\n过滤中...')
  const result3 = await filterFeed(config, mockFeed, pref3)
  printFeed(result3)

  // 场景 4: 自定义提示词
  hr('场景 4: 自定义提示词 "今天心情不好，只想看治愈系和美食"')
  const pref4 = createPreferenceFromPrompt('今天心情不好，只想看治愈系和美食')
  console.log('解析偏好:', JSON.stringify(pref4, null, 2))
  console.log('\n过滤中...')
  const result4 = await filterFeed(config, mockFeed, pref4)
  printFeed(result4)

  hr('演示完成')
}

function printFeed(items) {
  for (const item of items) {
    const icon = item.action === 'show' ? '✅' : item.action === 'fold' ? '📁' : '🚫'
    console.log(`\n  ${icon} [${item.id}] (相关度: ${item.relevanceScore}) ${item.action.toUpperCase()}`)
    console.log(`     内容: ${item.content.slice(0, 60)}...`)
    console.log(`     理由: ${item.reason}`)
  }
}

run().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
