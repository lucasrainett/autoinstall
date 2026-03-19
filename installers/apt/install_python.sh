#!/usr/bin/env bash
# Python - General-purpose programming language.
# Installs pip, venv, and dev headers for the system Python.
# https://www.python.org
#
# Ubuntu 24.04 ships with Python 3.12. This ensures pip, venv,
# and dev headers are available.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v pip3 &>/dev/null && echo "Python extras already installed, skipping." && exit 0

sudo apt install -y python3-pip python3-venv python3-dev
python3 --version
pip3 --version
