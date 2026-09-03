#!/usr/bin/env bash
# Exit 0 = dark appearance active, 1 = light.
# The key is absent entirely in light mode, which is why this checks for the value rather than
# comparing to "Light".
[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null)" = "Dark" ]
