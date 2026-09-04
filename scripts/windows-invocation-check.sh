#!/usr/bin/env bash
# Verifies that Git Bash can drive the native Windows tools the catalog actually uses.
#
# TASKS.md carried this as its last open item, phrased as "toggle Windows Defender Firewall via
# netsh.exe from inside a Git Bash script". That example turned out to be hypothetical: no entry
# uses netsh. What 312 Windows scripts *do* use is `winget` (279), `powershell.exe` (185) and
# `reg.exe` (2), so those are what this checks. Verifying the mechanism the catalog depends on
# beats verifying the one the task list happened to name first.
#
# Every check is read-only. This runs on CI runners and on contributors' real machines, so it must
# not change firewall state, install anything, or write to the registry.
#
# Run by hand:  bash scripts/windows-invocation-check.sh
set -uo pipefail

failed=0
pass() { echo "  ok   - $1"; }
fail() { echo "  FAIL - $1"; failed=1; }

echo "Git Bash -> native Windows tool invocation"

# 1. powershell.exe. The most-used bridge: 185 scripts call it, mostly for Get-Package-style
#    queries whose stdout is then parsed, so both the call and the captured output must work.
if out=$(powershell.exe -NoProfile -Command 'Write-Output "bridge-ok"' 2>/dev/null); then
  # Windows tools emit CRLF; bash comparisons must tolerate the \r or every one of these fails.
  [ "$(printf '%s' "$out" | tr -d '\r\n')" = "bridge-ok" ] \
    && pass "powershell.exe runs and its stdout is capturable" \
    || fail "powershell.exe ran but returned unexpected output: $(printf '%q' "$out")"
else
  fail "powershell.exe could not be invoked from bash"
fi

# 2. reg.exe with a backslash registry path. This is the one with a real trap: the path is a
#    bash string full of backslashes, and if quoting is wrong bash eats them and reg.exe receives
#    an unresolvable key. That exact class of bug has already been shipped once in this project
#    (doubled backslashes in a generated PowerShell fragment), so it is checked rather than
#    assumed. CurrentVersion exists on every Windows install.
if reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion" >/dev/null 2>&1; then
  pass "reg.exe accepts a backslash key path passed through bash quoting"
else
  fail "reg.exe could not read a key that exists on every Windows install — quoting is wrong"
fi

# 3. A key that certainly does not exist must fail rather than succeed, or check 2 proves nothing:
#    a reg.exe that returned 0 unconditionally would pass it.
if reg.exe query "HKCU\Software\AutoinstallDefinitelyNotPresent" >/dev/null 2>&1; then
  fail "reg.exe reported success for a key that does not exist — its exit code is not meaningful"
else
  pass "reg.exe distinguishes a missing key from a present one"
fi

# 4. winget, which 279 entries use as their package manager.
if winget --version >/dev/null 2>&1; then
  pass "winget is present and responds"
else
  # Not fatal on every image, but the catalog is largely unusable without it, so it is loud.
  fail "winget is not available — 279 Windows entries depend on it"
fi

# 5. A real catalog detect script, end to end. Helium is not installed on a CI runner or on a
#    typical machine, so the contract says exit 1 (absent). Anything else — a crash, a syntax
#    error, a mangled registry path — shows up here as a wrong exit code. This is the first time
#    any Windows catalog script runs on real Windows.
probe="catalog/browsers/install/helium/windows/detect.sh"
if [ -f "$probe" ]; then
  bash "$probe"; rc=$?
  case "$rc" in
    0) pass "a real detect script ran and reported Helium installed (exit 0)" ;;
    1) pass "a real detect script ran and reported Helium absent (exit 1)" ;;
    *) fail "a real detect script exited $rc, which is outside the 0/1/2 contract" ;;
  esac
else
  fail "expected probe script $probe is missing"
fi

echo
[ "$failed" -eq 0 ] && echo "All Git Bash -> Windows tool checks passed." \
                    || echo "Some checks failed."
exit "$failed"
