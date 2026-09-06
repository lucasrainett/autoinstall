#!/usr/bin/env bash
set -euo pipefail

if [ -f /etc/default/motd-news ]; then
  sudo sed -i 's/^ENABLED=0/ENABLED=1/' /etc/default/motd-news
fi

if command -v pro >/dev/null 2>&1; then
  sudo pro config set apt_news=true 2>/dev/null || true
fi

echo "Terminal advertising restored to the distribution's default."
