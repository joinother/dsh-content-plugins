# dsh-content-shaper

> DeepSeek Harness 插件：AI 驱动的内容审核、改写与读者侧过滤原型机

实验性项目，探索用 LLM 实现"发帖侧合规改写 + 读者侧个性化过滤"的完整闭环。

## 架构

```
发帖侧                          读者侧
┌──────────────────┐     ┌──────────────────┐
│  用户输入内容     │     │  信息流内容       │
│       ↓          │     │       ↓          │
│  moderate_content│     │  tag_content     │
│  (审核是否违规)   │     │  (标注分类/情感)  │
│       ↓          │     │       ↓          │
│  rewrite_content │     │  filter_feed     │
│  (改写合规版本)   │     │  (按偏好过滤)     │
│       ↓          │     │       ↓          │
│  verify_rewrite  │     │  个性化展示       │
│  (复验+意图检查)  │     │                  │
│       ↓          │     │                  │
│  发布/拦截        │     │                  │
└──────────────────┘     └──────────────────┘
```

## 安装

### 前置条件

- Node.js 18+
- DeepSeek API Key（[获取地址](https://platform.deepseek.com)）

### 方式 1: 作为 DSH 插件加载

```bash
# 克隆 DeepSeek Harness
git clone https://github.com/deepseek-ai/deepseek-harness
cd deepseek-harness

# 添加本插件
dsh plugin --profile demo add /path/to/dsh-content-shaper

# 配置 API Key
# 编辑 cordis.patch.yml 中的 apiKey 字段

# 启动
dsh --profile demo
```

### 方式 2: 独立运行演示

```bash
cd dsh-content-shaper

# 发帖侧改写演示
DEEPSEEK_API_KEY=sk-xxx node demo/demo.mjs

# 读者侧过滤演示
DEEPSEEK_API_KEY=sk-xxx node demo/demo-filter.mjs
```

## 工具列表

### 发帖侧

| 工具 | 功能 |
|------|------|
| `moderate_content` | 审核 content 是否违反 platformRules，返回 violations 数组 |
| `rewrite_content` | 根据 violations 将 content 改写为合规版本 |
| `verify_rewrite` | 复验改写结果：是否合规 + 是否保留原文意图 |

### 读者侧

| 工具 | 功能 |
|------|------|
| `tag_content` | 标注内容：分类、情感、能量级别、主题、关键词 |
| `filter_feed` | 按用户偏好提示词过滤信息流，返回 show/fold/hide 动作 |

## 配置项

| 配置 | 说明 | 默认值 |
|------|------|--------|
| `apiKey` | DeepSeek API Key | `''` |
| `apiBase` | API endpoint | `https://api.deepseek.com/v1/chat/completions` |
| `model` | 模型名 | `deepseek-chat` |
| `platformRules` | 平台规则提示词 | 基础规则 |
| `communityVibe` | 社区氛围提示词 | 友善包容理性 |

## 读者侧偏好示例

```javascript
// 只想看厨艺
"今天只想看厨艺相关的内容"

// 不看争议和负能量
"不想看争议性内容和负能量"

// 不看动物
"不想看有关动物的内容"

// 自定义
"今天心情不好，只想看治愈系和美食"
```

系统会自动解析偏好提示词，提取 includeTopics、excludeTopics、excludeSentiments 等结构化偏好，再传给 LLM 做语义过滤。

## 项目结构

```
dsh-content-shaper/
├── package.json
├── cordis.patch.yml          # DSH 插件注册配置
├── src/
│   ├── index.ts              # 插件入口，注册 5 个工具
│   ├── lib/
│   │   └── llm.ts            # LLM 调用封装
│   └── tools/
│       ├── moderate.ts       # 内容审核
│       ├── rewrite.ts        # 内容改写
│       ├── verify.ts         # 改写复验
│       ├── tag.ts            # 内容标注
│       └── filter.ts         # 读者侧过滤
├── skills/
│   └── content-shaper/
│       └── SKILL.md          # Agent 技能描述
├── presets/
│   └── content-shaper/
│       ├── preset.yml        # 预设元数据
│       └── agent.cordis.yml  # Agent 配置
├── demo/
│   ├── demo.mjs              # 发帖侧改写演示
│   └── demo-filter.mjs       # 读者侧过滤演示
└── README.md
```

## 许可证

MIT
