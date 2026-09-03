#!/usr/bin/env bash
# Zen Browser - Privacy-focused browser based on Firefox.
# Fast, customizable browser with built-in sidebar and split views.
# https://zen-browser.app
#
# After installing, this script:
# 1. Sets Zen as the system default browser via xdg-settings
# 2. Opens Zen with extension install URLs and GitHub SSH key page
#    so the user can click through to install them (runs in background)

if [ "$AUTOINSTALL_UPDATE" = "true" ] || ! flatpak info app.zen_browser.zen &>/dev/null; then
    flatpak install app.zen_browser.zen -y --noninteractive
fi

xdg-settings set default-web-browser app.zen_browser.zen.desktop

flatpak run app.zen_browser.zen \
    https://addons.mozilla.org/en-US/firefox/addon/proton-pass/ \
    https://addons.mozilla.org/en-US/firefox/addon/proton-vpn-firefox-extension/ \
    https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/ \
    https://addons.mozilla.org/en-US/firefox/addon/read-aloud/ \
    https://addons.mozilla.org/en-US/firefox/addon/clearurls/ \
    https://addons.mozilla.org/en-US/firefox/addon/video-downloadhelper/ \
    https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/ \
    https://github.com/settings/ssh/new &
