# DSH Content Plugins

AI 驱动的内容自适应插件集，基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。

## 项目

| 项目 | 说明 |
|------|------|
| [dsh-content-shaper](./dsh-content-shaper) | 文本内容审核 + 改写 + 读者侧过滤原型 |
| [dsh-content-adaptive](./dsh-content-adaptive) | 多模态内容动态自适应引擎（文本/图片/音频/视频） |

## 核心理念

内容不是静态的，而是"渲染函数"：

```
render(content, user, time, context) → personalized_version
```

- 不同用户 → 不同版本
- 同一用户，不同时间 → 不同版本
- 同一用户，同一内容，不同对话上下文 → 不同版本

## 许可证

MIT
