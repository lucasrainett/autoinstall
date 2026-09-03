#!/usr/bin/env bash
# Install GNOME Shell extensions from extensions.gnome.org.
# https://extensions.gnome.org
#
# For each extension in the EXTENSIONS array:
# 1. Checks if already installed via gnome-extensions list
# 2. Queries the extensions.gnome.org API for the download URL matching the current GNOME version
# 3. Downloads the .zip, installs it with gnome-extensions, and enables it

EXTENSIONS=(
    "caffeine@patapon.info"
)

for EXT in "${EXTENSIONS[@]}"; do
    if gnome-extensions list | grep -q "$EXT"; then
        echo "$EXT already installed, skipping."
        continue
    fi

    # download from extensions.gnome.org
    GNOME_VERSION=$(gnome-shell --version | grep -oP '\d+' | head -1)
    EXT_UUID="$EXT"
    EXT_INFO=$(curl -s "https://extensions.gnome.org/extension-info/?uuid=${EXT_UUID}&shell_version=${GNOME_VERSION}")
    DOWNLOAD_URL=$(echo "$EXT_INFO" | grep -oP '"download_url":\s*"\K[^"]+')

    if [ -z "$DOWNLOAD_URL" ]; then
        echo "Could not find $EXT for GNOME $GNOME_VERSION, skipping."
        continue
    fi

    TEMP_FILE=$(mktemp --suffix=.zip)
    curl -sL "https://extensions.gnome.org${DOWNLOAD_URL}" -o "$TEMP_FILE"

    # extract directly to extensions dir (works without active GNOME session)
    EXT_DIR="$HOME/.local/share/gnome-shell/extensions/${EXT_UUID}"
    mkdir -p "$EXT_DIR"
    unzip -o "$TEMP_FILE" -d "$EXT_DIR" > /dev/null
    rm -f "$TEMP_FILE"

    # enable (may require GNOME Shell restart to take effect)
    gnome-extensions enable "$EXT_UUID" 2>/dev/null || true
    echo "Installed and enabled $EXT"
done
