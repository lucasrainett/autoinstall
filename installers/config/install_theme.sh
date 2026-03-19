#!/usr/bin/env bash
[ -f /usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png ] || {
    wget https://raw.githubusercontent.com/lucasrainett/autoinstall/master/wallpapers/PaulsHardware8BitLogosChristmas.png
    sudo mv PaulsHardware8BitLogosChristmas.png /usr/share/backgrounds/
}

gsettings set org.gnome.desktop.background picture-uri "file:///usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png"
gsettings set org.gnome.desktop.background picture-uri-dark "file:///usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png"
gsettings set org.gnome.desktop.interface color-scheme "prefer-dark"
gsettings set org.gnome.desktop.interface icon-theme "ZorinGrey-Dark"
gsettings set org.gnome.shell.extensions.user-theme name "ZorinGrey-Dark"
gsettings set org.gnome.desktop.interface gtk-theme "ZorinGrey-Dark"
gsettings set org.gnome.shell.extensions.zorin-taskbar panel-margin 0
