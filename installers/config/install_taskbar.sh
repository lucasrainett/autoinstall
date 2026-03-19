#!/usr/bin/env bash
# Configure GNOME taskbar/dock pinned apps.
# Always re-applies (idempotent) to keep the dock consistent.

gsettings set org.gnome.shell favorite-apps "['org.gnome.Nautilus.desktop', 'app.zen_browser.zen.desktop', 'app.grayjay.Grayjay.desktop', 'org.gnome.Terminal.desktop', 'io.missioncenter.MissionCenter.desktop', 'proton-pass.desktop', 'proton-mail.desktop', 'beepertexts.desktop', 'io.github.kolunmi.Bazaar.desktop']"
