#!/usr/bin/env bash
# Disable telemetry, crash reporting, and data collection.
# Covers Ubuntu/Zorin services and GNOME privacy settings.
#
# NOTE: GNOME Tracker is NOT disabled — Nautilus and GNOME Shell
# depend on it for file search. Connectivity checking is kept
# enabled for captive portal detection (hotel/airport WiFi).

echo "Disabling telemetry and data collection..."

# ── remove telemetry packages ─────────────────────────────────
echo "  Removing telemetry packages..."
sudo apt purge -y whoopsie apport apport-gtk ubuntu-report popularity-contest 2>/dev/null
sudo apt autoremove -y

# ── disable crash reporting service ───────────────────────────
if systemctl list-unit-files | grep -q whoopsie; then
    sudo systemctl stop whoopsie 2>/dev/null
    sudo systemctl disable whoopsie 2>/dev/null
    sudo systemctl mask whoopsie 2>/dev/null
fi

# ── block telemetry domains via /etc/hosts ────────────────────
HOSTS_MARKER="# autoinstall: telemetry block"
if ! grep -q "$HOSTS_MARKER" /etc/hosts 2>/dev/null; then
    echo "  Blocking telemetry domains..."
    sudo tee -a /etc/hosts > /dev/null <<EOF

$HOSTS_MARKER
0.0.0.0 metrics.ubuntu.com
0.0.0.0 popcon.ubuntu.com
0.0.0.0 daisy.ubuntu.com
0.0.0.0 errors.ubuntu.com
EOF
fi

# ── GNOME privacy settings ───────────────────────────────────
echo "  Configuring GNOME privacy settings..."
gsettings set org.gnome.desktop.privacy report-technical-problems false
gsettings set org.gnome.desktop.privacy send-software-usage-stats false
gsettings set org.gnome.desktop.privacy remember-app-usage false
gsettings set org.gnome.desktop.privacy remove-old-temp-files true
gsettings set org.gnome.desktop.privacy remove-old-trash-files true
gsettings set org.gnome.desktop.privacy old-files-age 7

# ── limit tracker indexing (without breaking Nautilus search) ──
echo "  Limiting tracker indexing scope..."
mkdir -p ~/.config/tracker3
cat > ~/.config/tracker3/tracker-miner-fs-3.cfg 2>/dev/null <<'EOF'
[General]
index-recursive-directories=&DESKTOP;&DOCUMENTS;&DOWNLOAD;
index-single-directories=
EOF

echo "Telemetry disabled."
