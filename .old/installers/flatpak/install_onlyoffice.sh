#!/usr/bin/env bash
# OnlyOffice - Office suite compatible with Microsoft Office formats.
# Editors for documents, spreadsheets, and presentations.
# https://www.onlyoffice.com

[ "$AUTOINSTALL_UPDATE" != "true" ] && flatpak info org.onlyoffice.desktopeditors &>/dev/null && echo "Onlyoffice already installed, skipping." && exit 0
flatpak install org.onlyoffice.desktopeditors -y --noninteractive
