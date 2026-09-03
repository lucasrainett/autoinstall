#!/usr/bin/env bash
# System performance and security tweaks for development workstations.
# Configures inotify watchers, file descriptors, swappiness, SSD TRIM,
# core dumps, SSH hardening, unattended upgrades, workspaces, and scrollback.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── inotify watchers (524288 for JetBrains, VSCodium, Node.js) ──
SYSCTL_FILE="/etc/sysctl.d/99-dev-tweaks.conf"
if ! grep -q 'fs.inotify.max_user_watches' "$SYSCTL_FILE" 2>/dev/null; then
    echo "Increasing inotify watchers to 524288..."
    echo 'fs.inotify.max_user_watches = 524288' | sudo tee -a "$SYSCTL_FILE"
    echo 'fs.inotify.max_user_instances = 1024' | sudo tee -a "$SYSCTL_FILE"
fi

# ── file descriptors ──
if ! grep -q '* soft nofile' /etc/security/limits.d/99-dev-limits.conf 2>/dev/null; then
    echo "Increasing file descriptor limits..."
    echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.d/99-dev-limits.conf
    echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.d/99-dev-limits.conf
fi

# ── swappiness (reduce to 10 for 16GB+ RAM) ──
if ! grep -q 'vm.swappiness' "$SYSCTL_FILE" 2>/dev/null; then
    echo "Setting swappiness to 10..."
    echo 'vm.swappiness = 10' | sudo tee -a "$SYSCTL_FILE"
fi

# ── apply sysctl changes ──
sudo sysctl -p "$SYSCTL_FILE"

# ── SSD TRIM ──
if ! systemctl is-enabled fstrim.timer &>/dev/null; then
    echo "Enabling SSD TRIM timer..."
    sudo systemctl enable --now fstrim.timer
fi

# ── disable core dumps ──
if ! grep -q 'kernel.core_pattern' "$SYSCTL_FILE" 2>/dev/null; then
    echo "Disabling core dumps..."
    echo 'kernel.core_pattern = /dev/null' | sudo tee -a "$SYSCTL_FILE"
    sudo sysctl -p "$SYSCTL_FILE"
fi
if ! grep -q '* hard core 0' /etc/security/limits.d/99-dev-limits.conf 2>/dev/null; then
    echo '* hard core 0' | sudo tee -a /etc/security/limits.d/99-dev-limits.conf
fi

# ── SSH hardening ──
SSHD_CONFIG="/etc/ssh/sshd_config.d/99-hardening.conf"
if [ ! -f "$SSHD_CONFIG" ]; then
    echo "Hardening SSH configuration..."
    sudo tee "$SSHD_CONFIG" > /dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
X11Forwarding no
MaxAuthTries 3
EOF
    sudo systemctl reload sshd 2>/dev/null || sudo systemctl reload ssh 2>/dev/null
fi

# ── automatic security updates ──
if ! dpkg -s unattended-upgrades &>/dev/null; then
    echo "Enabling automatic security updates..."
    sudo apt install -y unattended-upgrades
fi
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

# ── GNOME: fixed 4 workspaces ──
gsettings set org.gnome.mutter dynamic-workspaces false
gsettings set org.gnome.desktop.wm.preferences num-workspaces 4

# ── GNOME Terminal: increase scrollback to 10000 ──
PROFILE=$(gsettings get org.gnome.Terminal.ProfilesList default | tr -d "'")
if [ -n "$PROFILE" ]; then
    gsettings set "org.gnome.Terminal.Legacy.Profile:/org/gnome/terminal/legacy/profiles:/:${PROFILE}/" scrollback-lines 10000
    gsettings set "org.gnome.Terminal.Legacy.Profile:/org/gnome/terminal/legacy/profiles:/:${PROFILE}/" scrollback-unlimited false
fi

echo "System tweaks applied."
