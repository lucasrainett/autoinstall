#!/usr/bin/env bash
# Zorin OS theme configuration.
# Downloads a custom wallpaper and applies dark mode with the ZorinGrey-Dark theme.
# Wallpaper download is skipped if already present; gsettings are always re-applied.

[ -f /usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png ] || {
    curl -fsSL -o PaulsHardware8BitLogosChristmas.png https://raw.githubusercontent.com/lucasrainett/autoinstall/master/wallpapers/PaulsHardware8BitLogosChristmas.png
    sudo mv PaulsHardware8BitLogosChristmas.png /usr/share/backgrounds/
}

gsettings set org.gnome.desktop.background picture-uri "file:///usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png"
gsettings set org.gnome.desktop.background picture-uri-dark "file:///usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png"
gsettings set org.gnome.desktop.interface color-scheme "prefer-dark"
gsettings set org.gnome.desktop.interface icon-theme "ZorinGrey-Dark"
gsettings set org.gnome.shell.extensions.user-theme name "ZorinGrey-Dark"
gsettings set org.gnome.desktop.interface gtk-theme "ZorinGrey-Dark"
gsettings set org.gnome.shell.extensions.zorin-taskbar panel-margin 0
