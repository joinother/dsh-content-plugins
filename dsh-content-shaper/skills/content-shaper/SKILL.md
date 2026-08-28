# Content Shaper

AI 驱动的内容审核、改写与读者侧过滤工具集。

## 能力

### 发帖侧
1. **moderate_content** — 审核内容是否违反平台规则，返回违规类型、严重度和片段
2. **rewrite_content** — 将违规内容改写为合规版本，保留用户原始意图
3. **verify_rewrite** — 复验改写结果是否合规且意图未被歪曲

### 读者侧
4. **tag_content** — 标注内容分类、情感、能量级别
5. **filter_feed** — 按读者偏好（提示词）过滤个性化信息流

## 使用方式

### 发帖侧流程
```
用户输入 → moderate_content → (违规?) → rewrite_content → verify_rewrite → 发布
                                      → (合规?) → 直接发布
```

### 读者侧流程
```
信息流 → tag_content (标注) → filter_feed (按偏好过滤) → 个性化展示
```

## 配置

- `apiKey`: DeepSeek API Key
- `platformRules`: 平台内容规则（提示词）
- `communityVibe`: 社区氛围设定（提示词）

## 注意

这是一个实验性原型，用于探索 AI 内容审核与改写的技术可行性。
生产环境部署需考虑法律合规、用户知情同意、透明度等要求。
