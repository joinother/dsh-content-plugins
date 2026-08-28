# dsh-content-adaptive

> 多模态内容动态自适应引擎 — DeepSeek Harness 插件

实验性项目。核心理念：**内容不是静态的，而是"渲染函数"**。

```
render(content, user, time, context) → personalized_version
```

同一条内容：
- 不同用户 → 不同版本
- 同一用户，不同时间 → 不同版本
- 同一用户，同一内容，不同对话上下文 → 不同版本

## 架构

```
原始内容 (text/image/audio/video)
     ↓
┌─────────────────────────┐
│   Ingest (摄取+分段)     │  长文本→语义段落, 图片→vision描述, 音频→STT, 视频→帧+音轨
└───────────┬─────────────┘
            ↓
    [Segment, Segment, ...]
            ↓
┌─────────────────────────┐
│   Adapt (逐段自适应)     │  每段根据 user + time + context 独立改写
└───────────┬─────────────┘
            ↓
    [AdaptedSegment, ...]
            ↓
┌─────────────────────────┐
│   Render (动态渲染)      │  生成带版本号的快照，可追溯、可对比
└───────────┬─────────────┘
            ↓
    个性化版本 (versionId)
```

## 多模态支持

| 模态 | 摄取 | 改写 | 依赖 |
|------|------|------|------|
| 文本 | 语义分段 | LLM 改写语气/详略/侧重 | DeepSeek API |
| 图片 | Vision 生成描述 | 调整展示方式(show/fold/hide/描述替代) | DeepSeek Vision |
| 音频 | Whisper STT | 改写转录文本 → TTS 重新合成 | Whisper + TTS API |
| 视频 | ffmpeg 提取关键帧+音轨 | 帧分析 + 音轨改写 | ffmpeg + Whisper |

## 快速开始

### 前置条件

- Node.js 18+
- DeepSeek API Key

### 文本自适应演示

```bash
DEEPSEEK_API_KEY=sk-xxx node demo/demo-text.mjs
```

展示同一条产品评价内容，3 个不同用户（普通消费者/不想看负能量的用户/产品经理）各自看到不同版本。

### 动态内容演示

```bash
DEEPSEEK_API_KEY=sk-xxx node demo/demo-dynamic.mjs
```

展示同一个用户（小李）在早晨、午休、深夜三个时间点，看到同一条内容的不同版本。

### 图片自适应演示

```bash
DEEPSEEK_API_KEY=sk-xxx node demo/demo-image.mjs [image-url]
```

展示同一张图片，不同用户看到不同的展示方式（原图/折叠/文字描述替代）。

## 作为 DSH 插件接入

```bash
# 克隆 DeepSeek Harness
git clone https://github.com/deepseek-ai/deepseek-harness
cd deepseek-harness

# 添加本插件
dsh plugin --profile demo add /path/to/dsh-content-adaptive

# 配置 API Key（编辑 cordis.patch.yml）
# 启动
dsh --profile demo
```

## DSH 工具列表

| 工具 | 功能 |
|------|------|
| `segment_text` | 长文本按语义分段 |
| `adapt_segments` | 逐段自适应改写（支持全部模态） |
| `render_content` | 动态渲染，生成带版本号快照 |
| `compare_renderings` | 对比同一内容在不同上下文下的渲染差异 |

## 适应级别

| 级别 | 行为 |
|------|------|
| `off` | 原样返回 |
| `light` | 微调语气和措辞，不改内容结构 |
| `moderate` | 调整语气、详略、侧重，移除违规 |
| `aggressive` | 大幅重构，按偏好重新组织信息 |

## 项目结构

```
dsh-content-adaptive/
├── package.json
├── cordis.patch.yml
├── src/
│   ├── index.ts                 # DSH 插件入口，注册 4 个工具
│   ├── models/
│   │   ├── segment.ts           # 统一内容片段模型（text/image/audio/video/mixed）
│   │   └── context.ts           # 用户/时间/对话上下文模型
│   ├── lib/
│   │   ├── llm.ts               # LLM + Vision API 封装
│   │   ├── audio.ts             # STT (Whisper) + TTS 封装
│   │   └── video.ts             # ffmpeg 视频帧提取 + 音轨提取
│   ├── pipeline/
│   │   ├── ingest.ts            # 内容摄取和分段管线
│   │   ├── adapt.ts             # 自适应改写引擎（核心）
│   │   └── render.ts            # 动态渲染层 + 版本管理
│   └── tools/                   # (预留扩展)
├── skills/content-adaptive/
│   └── SKILL.md                 # Agent 技能描述
├── presets/content-adaptive/    # Agent 预设包
│   ├── preset.yml
│   └── agent.cordis.yml
├── demo/
│   ├── demo-text.mjs            # 文本自适应演示（3用户对比）
│   ├── demo-dynamic.mjs         # 动态内容演示（同用户不同时间）
│   └── demo-image.mjs           # 图片自适应演示
└── README.md
```

## 配置项

| 配置 | 说明 | 默认值 |
|------|------|--------|
| `apiKey` | DeepSeek API Key | `''` |
| `model` | 文本模型 | `deepseek-chat` |
| `visionModel` | 视觉模型 | `deepseek-chat` |
| `whisperEndpoint` | Whisper STT 地址 | `''` |
| `ttsEndpoint` | TTS 地址 | `''` |
| `ffmpegPath` | ffmpeg 路径 | `ffmpeg` |
| `platformRules` | 平台规则提示词 | 基础规则 |
| `communityVibe` | 社区氛围提示词 | 友善包容理性 |

## 许可证

MIT
