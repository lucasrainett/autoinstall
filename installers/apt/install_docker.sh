#!/usr/bin/env bash
# Docker - Container runtime for building and running applications.
# https://docs.docker.com/engine/install/ubuntu/
#
# Installs Docker CE from Docker's official apt repository (not the Ubuntu snap).
# Steps: add GPG key -> add repo -> apt install -> add user to docker group.
# The docker group addition requires a logout/login to take effect.

[ "$AUTOINSTALL_UPDATE" != "true" ] && dpkg -s docker-ce &>/dev/null && echo "Docker already installed, skipping." && exit 0

# install prerequisites
sudo apt install -y ca-certificates curl

# add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update -y

# install Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# enable and start docker daemon
sudo systemctl enable --now docker

# add current user to docker group
sudo usermod -aG docker "$USER"
