#!/usr/bin/env bash
set -euo pipefail

changed=0

if [ -f /etc/default/motd-news ]; then
  sudo sed -i 's/^ENABLED=1/ENABLED=0/' /etc/default/motd-news
  changed=1
fi

if command -v pro >/dev/null 2>&1; then
  sudo pro config set apt_news=false 2>/dev/null || true
  changed=1
fi

if [ "$changed" -eq 0 ]; then
  echo "Nothing to do: this distribution ships neither the MOTD adverts nor the Pro upsell."
else
  echo "Terminal advertising disabled."
fi
