#!/usr/bin/env bash

echo "Requesting sudo privileges..."
sudo -v
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
keepalive_pid=$!


#theme
wget https://raw.githubusercontent.com/lucasrainett/autoinstall/master/wallpapers/PaulsHardware8BitLogosChristmas.png
sudo mv PaulsHardware8BitLogosChristmas.png /usr/share/backgrounds/
gsettings set org.gnome.desktop.background picture-uri "file:///usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png"
gsettings set org.gnome.desktop.background picture-uri-dark "file:///usr/share/backgrounds/PaulsHardware8BitLogosChristmas.png"
gsettings set org.gnome.desktop.interface color-scheme "prefer-dark"
gsettings set org.gnome.desktop.interface icon-theme "ZorinGrey-Dark"
gsettings set org.gnome.shell.extensions.user-theme name "ZorinGrey-Dark"
gsettings set org.gnome.desktop.interface gtk-theme "ZorinGrey-Dark"
gsettings set org.gnome.shell.extensions.zorin-taskbar panel-margin 0


#create ssh key
ssh-keygen -t ed25519 -N '' -C "lucas@rainett.dev" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
echo "https://github.com/settings/ssh/new"


cd ~/Downloads
#appimages
wget -O beeper.AppImage https://api.beeper.com/desktop/download/linux/x64/stable/com.automattic.beeper.desktop
wget -O lmstudio.AppImage https://lmstudio.ai/download/latest/linux/x64
wget -O cryptomator.AppImage https://github.com/cryptomator/cryptomator/releases/download/1.18.0/cryptomator-1.18.0-x86_64.AppImage
wget -O helium.AppImage https://github.com/imputnet/helium-linux/releases/download/0.7.7.1/helium-0.7.7.1-x86_64.AppImage

#deb
wget -O proton-pass_amd64.deb https://proton.me/download/pass/linux/proton-pass_1.33.3_amd64.deb
sudo dpkg -i proton-pass_amd64.deb
wget -O ProtonMail-desktop-beta.deb https://proton.me/download/mail/linux/1.11.0/ProtonMail-desktop-beta.deb
sudo dpkg -i ProtonMail-desktop-beta.deb

#jetbrains toolbox
wget -O jetbrains-toolbox.tar.gz https://download-cdn.jetbrains.com/toolbox/jetbrains-toolbox-3.2.0.65851.tar.gz
tar -xvf jetbrains-toolbox.tar.gz > /dev/null 2>&1
mv jetbrains-toolbox-* jetbrains-toolbox
sudo mv jetbrains-toolbox /opt/jetbrains-toolbox

command="/opt/jetbrains-toolbox/bin/jetbrains-toolbox"
$command &
cmd_pid=$!
sleep 5
kill "$cmd_pid"
wait "$cmd_pid" 2>/dev/null

curl https://get.volta.sh | bash
source ~/.bashrc
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

volta install node
volta install pnpm
node -v
npm -v
pnpm -v

#install flatpaks 
flatpak install \
    org.videolan.VLC \
    org.signal.Signal \
    org.onlyoffice.desktopeditors \
    org.gnome.Boxes \
    it.mijorus.gearlever \
    org.angryip.ipscan \
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
    -y --noninteractive


flatpak run it.mijorus.gearlever --integrate beeper.AppImage -y
flatpak run it.mijorus.gearlever --integrate lmstudio.AppImage -y
flatpak run it.mijorus.gearlever --integrate cryptomator.AppImage -y
flatpak run it.mijorus.gearlever --integrate helium.AppImage -y


xdg-settings set default-web-browser app.zen_browser.zen.desktop

#deb
#wget -O steam.deb https://cdn.akamai.steamstatic.com/client/installer/steam.deb
#dpkg -i ./steam.deb


wget -O OrcaSlicer-Linux-flatpak_x86_64.flatpak https://github.com/OrcaSlicer/OrcaSlicer/releases/download/v2.3.1/OrcaSlicer-Linux-flatpak_V2.3.1_x86_64.flatpak
flatpak install --user ./OrcaSlicer-Linux-flatpak_x86_64.flatpak -y --noninteractive

#remove default apps
sudo apt purge brave-browser brave-keyring -y
sudo apt autoremove -y
sudo rm /etc/apt/sources.list.d/brave-browser-*.list
rm -rf ~/.config/BraveSoftware
rm -rf ~/.cache/BraveSoftware
rm -rf ~/.local/share/keyrings/brave-browser*
sudo apt remove --purge libreoffice* -y



sudo apt install gnome-shell-extension-manager -ycd 
sudo apt update -y


gsettings set org.gnome.shell favorite-apps "['org.gnome.Nautilus.desktop', 'app.zen_browser.zen.desktop', 'app.grayjay.Grayjay.desktop', 'org.gnome.Terminal.desktop', 'io.missioncenter.MissionCenter.desktop', 'proton-pass.desktop', 'proton-mail.desktop', 'beepertexts.desktop', 'io.github.kolunmi.Bazaar.desktop']"

flatpak run app.zen_browser.zen \
    https://addons.mozilla.org/en-US/firefox/addon/proton-pass/ \
    https://addons.mozilla.org/en-US/firefox/addon/proton-vpn-firefox-extension/ \
    https://addons.mozilla.org/en-US/firefox/addon/privacy-badger17/ \
    https://addons.mozilla.org/en-US/firefox/addon/read-aloud/ \
    https://addons.mozilla.org/en-US/firefox/addon/clearurls/ \
    https://addons.mozilla.org/en-US/firefox/addon/video-downloadhelper/ \
    https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/ \
    https://github.com/settings/ssh/new &


sudo -k
kill "$keepalive_pid" 2>/dev/null
