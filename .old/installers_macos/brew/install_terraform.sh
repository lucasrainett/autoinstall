#!/usr/bin/env bash
# Install Terraform via Homebrew.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v terraform &>/dev/null && echo "Terraform already installed, skipping." && exit 0

brew install terraform

echo "Terraform installed: $(terraform --version | head -1)"
