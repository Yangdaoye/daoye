#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node scripts/serve.js
fi
if command -v python3 >/dev/null 2>&1; then
  echo "校园坦克大战 · 用 Python 打开局域网 http://0.0.0.0:8765/"
  exec python3 -m http.server 8765 --bind 0.0.0.0
fi
echo "请先安装 Node.js 或 Python。"
exit 1
