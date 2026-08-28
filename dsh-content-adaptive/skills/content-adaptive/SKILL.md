# Content Adaptive

多模态内容动态自适应引擎。文本/图片/音频/视频内容，根据用户、时间、上下文动态调整。

## 核心理念

内容不是静态的，而是"渲染函数"：
```
render(content, user, time, context) → personalized_version
```

同一条内容：
- 不同用户 → 不同版本
- 同一用户，不同时间 → 不同版本
- 同一用户，同一内容，不同对话上下文 → 不同版本

## 能力

### 发帖侧
- **segment_text**: 长文本按语义分段
- **adapt_segments**: 逐段自适应改写（支持文本/图片/音频/视频）

### 渲染侧
- **render_content**: 动态渲染，生成带版本号的快照
- **compare_renderings**: 对比同一内容在不同上下文下的渲染差异

## 适应级别

| 级别 | 行为 |
|------|------|
| off | 原样返回 |
| light | 微调语气和措辞 |
| moderate | 调整语气、详略、侧重，移除违规 |
| aggressive | 大幅重构，按偏好重新组织 |

## 多模态支持

| 模态 | 处理方式 | 依赖 |
|------|------|------|
| 文本 | LLM 改写 | DeepSeek API |
| 图片 | Vision 分析 → 调整展示/描述 | DeepSeek Vision |
| 音频 | STT → 改写转录 → TTS | Whisper + TTS |
| 视频 | ffmpeg 提取帧+音轨 → 逐模态处理 | ffmpeg + Whisper |

## 注意

实验性原型。生产部署需考虑法律合规、用户知情同意、透明度等要求。
