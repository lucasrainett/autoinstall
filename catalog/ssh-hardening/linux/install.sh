#!/usr/bin/env bash
set -euo pipefail

DROPIN=/etc/ssh/sshd_config.d/99-autoinstall-hardening.conf

# `id -un` rather than $USER: the environment variable is not guaranteed to be set (containers,
# cron, `su` without a login shell), and under `set -u` an unset $USER aborts the script with an
# obscure "unbound variable" instead of the clear refusal below.
CURRENT_USER="$(id -un)"
# `|| true` is load-bearing: macOS has no getent, and under `set -euo pipefail` a failing
# command substitution aborts the script before the fallback below can run. The macOS
# ssh-hardening entry died here with no output at all — the same class of mistake as
# assuming setsid or timeout exists everywhere.
CURRENT_HOME="$(getent passwd "$CURRENT_USER" 2>/dev/null | cut -d: -f6 || true)"
CURRENT_HOME="${CURRENT_HOME:-${HOME:-}}"

# Refuse rather than lock the user out. Turning off password authentication with no usable key is
# how people permanently lose access to a remote machine, so this is checked first and treated as
# a reason to stop — not a warning to scroll past.
have_key=false
for f in "${CURRENT_HOME:-/nonexistent}/.ssh/authorized_keys" /root/.ssh/authorized_keys; do
  [ -s "$f" ] && have_key=true
done
if [ "$have_key" = false ]; then
  echo "Refusing to harden SSH: no authorized_keys found for $CURRENT_USER or root." >&2
  echo "Disabling password authentication without a working key would lock you out of this" >&2
  echo "machine over SSH. Add your public key first, then re-run this entry." >&2
  exit 3
fi

# Establish whether sshd's config is already valid *before* changing anything. Without this
# baseline a pre-existing, unrelated problem (a broken include, a missing privilege-separation
# directory) looks exactly like "the hardening broke your config" — and the user gets blamed for
# something this entry did not cause.
baseline_ok=true
sudo sshd -t >/dev/null 2>&1 || baseline_ok=false

# A drop-in, never an edit of /etc/ssh/sshd_config: the main file is package-managed, so editing
# it in place invites upgrade conflicts and makes this entry hard to reverse cleanly. sshd reads
# sshd_config.d/*.conf in lexical order, and 99- lands after the distro defaults.
sudo mkdir -p /etc/ssh/sshd_config.d
sudo tee "$DROPIN" > /dev/null <<'CONF'
# Managed by autoinstall (security/configure/ssh-hardening). Remove this file to revert.
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
CONF
sudo chmod 0644 "$DROPIN"

if [ "$baseline_ok" = true ]; then
  # Only meaningful when the config was valid beforehand: a failure now is genuinely ours, and an
  # sshd that refuses to start would leave no remote access at all — so roll back immediately.
  if ! sudo sshd -t 2>/dev/null; then
    sudo rm -f "$DROPIN"
    echo "sshd rejected the hardening config; reverted and made no changes." >&2
    exit 3
  fi
else
  echo "Note: sshd -t already failed before this change, so its result was not used as a gate." >&2
  echo "The hardening drop-in was still written; fix the pre-existing sshd config separately." >&2
fi

# Reload only if sshd is actually running. On a machine with no active SSH server the drop-in
# simply takes effect whenever one starts.
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet ssh 2>/dev/null; then
  sudo systemctl reload ssh
fi
echo "SSH hardening applied."
