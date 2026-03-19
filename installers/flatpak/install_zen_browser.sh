#!/usr/bin/env bash

if ! flatpak info app.zen_browser.zen &>/dev/null; then
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
