#!/usr/bin/env bash
# Common command-line tools and build dependencies.
# Installs essentials that many other scripts and dev workflows depend on.

sudo apt update -y
sudo apt install -y \
    git \
    curl \
    unzip \
    zip \
    htop \
    net-tools \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg
