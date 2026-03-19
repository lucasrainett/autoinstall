#!/usr/bin/env bash
# Terraform - Infrastructure as code tool by HashiCorp.
# Define and provision cloud infrastructure using declarative config files.
# https://developer.hashicorp.com/terraform/install
#
# Adds the official HashiCorp apt repo, then installs terraform.

[ "$AUTOINSTALL_UPDATE" != "true" ] && command -v terraform &>/dev/null && echo "Terraform already installed, skipping." && exit 0

wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update
sudo apt install -y terraform
terraform --version
