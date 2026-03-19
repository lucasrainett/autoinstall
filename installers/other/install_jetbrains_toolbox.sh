#!/usr/bin/env bash
[ -d /opt/jetbrains-toolbox ] && echo "JetBrains Toolbox already installed, skipping." && exit 0

cd ~/Downloads
DOWNLOAD_URL=$(curl -s "https://data.services.jetbrains.com/products/releases?code=TBA&latest=true&type=release" | grep -oP '"linux":\{"link":"\K[^"]+')
wget -O jetbrains-toolbox.tar.gz "$DOWNLOAD_URL"
tar -xvf jetbrains-toolbox.tar.gz > /dev/null 2>&1
mv jetbrains-toolbox-* jetbrains-toolbox
sudo mv jetbrains-toolbox /opt/jetbrains-toolbox

command="/opt/jetbrains-toolbox/bin/jetbrains-toolbox"
$command &
cmd_pid=$!
sleep 5
kill "$cmd_pid"
wait "$cmd_pid" 2>/dev/null
