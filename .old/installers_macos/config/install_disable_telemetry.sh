#!/usr/bin/env bash
# Disable telemetry, crash reporting, and data collection on macOS.
# Covers Apple diagnostics, Siri suggestions, and ad tracking.

echo "Disabling telemetry and data collection..."

# ── disable Apple diagnostics & usage data ────────────────────
echo "  Disabling Apple diagnostics..."
defaults write com.apple.CrashReporter DialogType none
defaults write com.apple.appleseed.FeedbackAssistant "Autogather" -bool false

# ── disable Siri data collection ──────────────────────────────
echo "  Disabling Siri analytics..."
defaults write com.apple.Siri StatusMenuVisible -bool false
defaults write com.apple.Siri UserHasDeclinedEnable -bool true

# ── limit ad tracking ─────────────────────────────────────────
echo "  Limiting ad tracking..."
defaults write com.apple.AdLib allowApplePersonalizedAdvertising -bool false
defaults write com.apple.AdLib allowIdentifierForAdvertising -bool false

# ── disable smart quotes and dashes (dev-friendly) ────────────
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false

echo "Telemetry disabled."
