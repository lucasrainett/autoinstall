#!/usr/bin/env bash


#theme
#gsettings set org.gnome.desktop.interface color-scheme "prefer-dark"
#gsettings set org.gnome.desktop.interface icon-theme "ZorinGrey-Dark"
#gsettings set org.gnome.shell.extensions.user-theme name "ZorinGrey-Dark"
#gsettings set org.gnome.desktop.interface gtk-theme "ZorinGrey-Dark"

apt update

#create ssh key
ssh-keygen -t ed25519 -N '' -C "lucas@rainett.dev" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
echo "https://github.com/settings/ssh/new"
#xdg-open https://www.google.com

#remove default apps
apt purge brave-browser brave-keyring -y
apt autoremove 
rm /etc/apt/sources.list.d/brave-browser-*.list
rm -rf ~/.config/BraveSoftware
rm -rf ~/.cache/BraveSoftware
rm -rf ~/.local/share/keyrings/brave-browser*

apt remove --purge libreoffice* -y

#install flatpaks 
flatpak install \
    org.videolan.VLC \
    org.signal.Signal \
    org.onlyoffice.desktopeditors \
    org.gnome.Boxes \
    it.mijorus.gearlever \
    io.missioncenter.MissionCenter \
    io.github.ungoogled_software.ungoogled_chromium \
    io.github.kolunmi.Bazaar \
    io.exodus.Exodus \
    com.vscodium.codium \
    com.moonlight_stream.Moonlight \
    com.mattjakeman.ExtensionManager \
    com.core447.StreamController \
    app.zen_browser.zen \
    app.grayjay.Grayjay \
    com.boxy_svg.BoxySVG \
    com.jeffser.Alpaca \
    com.mojang.Minecraft \
    com.valvesoftware.Steam \
    com.obsproject.Studio \
    com.protonvpn.www \
    -y


#set default browser
xdg-settings set default-web-browser app.zen_browser.zen.desktop

apt install gnome-shell-extension-manager -y
#set wallpaper


cd ~/Downloads

#appimages
wget -O beeper.AppImage https://api.beeper.com/desktop/download/linux/x64/stable/com.automattic.beeper.desktop
wget -O lmstudio.AppImage https://lmstudio.ai/download/latest/linux/x64
wget -O cryptomator.AppImage https://github.com/cryptomator/cryptomator/releases/download/1.18.0/cryptomator-1.18.0-x86_64.AppImage
wget -O helium.AppImage https://github.com/imputnet/helium-linux/releases/download/0.7.7.1/helium-0.7.7.1-x86_64.AppImage


#deb
#wget -O steam.deb https://cdn.akamai.steamstatic.com/client/installer/steam.deb
#dpkg -i ./steam.deb

wget -O proton-pass_amd64.deb https://proton.me/download/pass/linux/proton-pass_1.33.3_amd64.deb
dpkg -i proton-pass_amd64.deb

wget -O ProtonMail-desktop-beta.deb https://proton.me/download/mail/linux/1.11.0/ProtonMail-desktop-beta.deb
dpkg -i ProtonMail-desktop-beta.deb


#tar

wget -O jetbrains-toolbox.tar.gz https://download-cdn.jetbrains.com/toolbox/jetbrains-toolbox-3.2.0.65851.tar.gz
tar -xvf jetbrains-toolbox.tar.gz
mv jetbrains-toolbox-* jetbrains-toolbox
mv jetbrains-toolbox /opt/jetbrains-toolbox
/opt/jetbrains-toolbox/bin/jetbrains-toolbox &


flatpak run app.zen_browser.zen \
    https://addons.mozilla.org/en-US/firefox/addon/proton-pass/ \
    https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/ \
    https://github.com/settings/ssh/new &




