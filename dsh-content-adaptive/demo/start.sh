#!/bin/bash
# Content Adaptive Engine - Web UI 启动脚本
# 用法: ./demo/start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════════════════╗"
echo "║  Content Adaptive Engine - Web UI                ║"
echo "║  多模态内容动态自适应演示                         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "启动中..."
echo ""
echo "  Mock 模式: 直接打开浏览器即可使用（无需 API Key）"
echo "  Live 模式: 在页面右上角切换到 Live API，填入 DeepSeek API Key"
echo ""
echo "  按Ctrl+C停止服务器"
echo ""

# 尝试用 python 启动一个简单服务器
if command -v python3 &> /dev/null; then
  cd "$DIR"
  python3 -m http.server 8848 &
  PID=$!
  echo "服务器已启动: http://localhost:8848/web-ui.html"
  echo ""
  # 尝试打开浏览器
  if command -v open &> /dev/null; then
    open "http://localhost:8848/web-ui.html"
  fi
  wait $PID
elif command -v npx &> /dev/null; then
  cd "$DIR"
  npx serve -l 8848 .
else
  echo "未找到 python3 或 npx，直接打开 HTML 文件..."
  open "$DIR/web-ui.html" 2>/dev/null || echo "请手动打开: $DIR/web-ui.html"
fi
