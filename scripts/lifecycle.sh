#!/usr/bin/env bash
# Full lifecycle exercise for catalog entries: detect → install → detect → install again →
# remove → detect. Used by .github/workflows/catalog-lifecycle.yml on real macOS and Windows
# runners, which is the only way those entries get executed at all.
#
# Lives here rather than inline in the workflow so it can be read, syntax-checked, and run by hand
# against a VM — the same property every catalog script has, and for the same reason.
#
# Usage: lifecycle.sh <platform-dir> <entry-key|all> [entry-key...]
set -uo pipefail

PLATFORM="${1:?platform directory (linux|macos|windows) required}"
shift
LOG_DIR="${LIFECYCLE_LOG_DIR:-lifecycle-logs}"
mkdir -p "$LOG_DIR"

# Resolve "all" to every entry that has a folder for this platform.
if [ "${1:-}" = "all" ]; then
  # Depth 2, because the catalog is flat: catalog/<id>/<platform>. It used to be
  # catalog/<category>/<kind>/<id>/<platform> — depth 4 — and this was not updated with the
  # restructure, so "all" quietly resolved to no entries at all and the run would have reported
  # success having tested nothing.
  ENTRIES=$(find catalog -mindepth 2 -maxdepth 2 -type d -name "$PLATFORM" |
    sed "s|^catalog/||; s|/$PLATFORM$||" | sort)
else
  ENTRIES="$*"
fi

# A run that tests nothing must not report success. The depth bug above did exactly that: "all"
# resolved to an empty list and every job went green having installed nothing.
if [ -z "${ENTRIES// /}" ]; then
  echo "::error::no entries resolved for $PLATFORM — refusing to report success on an empty run"
  exit 1
fi

# Every catalog script runs under a timeout, because one that never exits takes the whole run with
# it. Brave's Windows installer did exactly that on the first full run: ten entries completed in
# four minutes, then Brave hung for 117 more until the job's two-hour cap, leaving 101 Windows
# entries untested and the run cancelled rather than reported. A bounded failure is information; a
# hung job is none.
#
# Ten minutes is generous for a large installer on a cold runner and still lets a full platform
# finish well inside the job limit.
OP_TIMEOUT="${LIFECYCLE_OP_TIMEOUT:-600}"

run_op() { # run_op <script> <log>  — returns the script's exit code, or 124 on timeout
  # `timeout` alone is not enough: it signals only the direct child, so an installer that has
  # spawned its own workers leaves them running. Verified — a timed-out script left its `sleep`
  # behind, and on a real runner that is an installer still holding a package-manager lock while
  # the next entry tries to use it.
  #
  # Where setsid exists (Linux, macOS) the script gets its own process group and the whole group is
  # killed. Git Bash on Windows has no setsid, so it falls back to plain timeout and accepts the
  # orphan — the runner is ephemeral and terminates them at job end.
  if command -v setsid >/dev/null 2>&1; then
    setsid bash "$1" >> "$2" 2>&1 &
    op_pid=$!
    waited=0
    while kill -0 "$op_pid" 2>/dev/null; do
      if [ "$waited" -ge "$OP_TIMEOUT" ]; then
        kill -KILL -- -"$op_pid" 2>/dev/null || kill -KILL "$op_pid" 2>/dev/null
        wait "$op_pid" 2>/dev/null
        return 124
      fi
      sleep 1
      waited=$((waited + 1))
    done
    wait "$op_pid"
    return $?
  fi
  timeout --kill-after=30s "$OP_TIMEOUT" bash "$1" >> "$2" 2>&1
}

pass=0; fail=0; skipped=0
summary=""

note()  { echo "::notice::$*"; }
fail_() { echo "::error::$*"; }

for key in $ENTRIES; do
  dir="catalog/$key/$PLATFORM"
  log="$LOG_DIR/$(echo "$key" | tr '/' '_').log"

  if [ ! -d "$dir" ]; then
    note "$key has no $PLATFORM folder — not applicable here"
    summary="${summary}| \`$key\` | — | not applicable |"$'\n'
    skipped=$((skipped + 1))
    continue
  fi

  echo "::group::$key"
  { echo "=== $key ($PLATFORM) ==="; date -u; } > "$log"

  run_op "$dir/detect.sh" "$log"; before=$?
  echo "detect(before)=$before" | tee -a "$log"

  # Already present on the runner: exercising it would remove software the image shipped, and the
  # install step would prove nothing because there is nothing to install. Skipped rather than
  # silently "passing".
  if [ "$before" -ne 1 ]; then
    note "$key was already present on this runner (detect=$before) — skipping to avoid removing it"
    summary="${summary}| \`$key\` | — | already present, skipped |"$'\n'
    skipped=$((skipped + 1))
    echo "::endgroup::"
    continue
  fi

  entry_ok=1

  install_rc=0
  run_op "$dir/install.sh" "$log" || install_rc=$?
  if [ "$install_rc" -eq 124 ] || [ "$install_rc" -eq 137 ]; then
    fail_ "$key: install timed out after ${OP_TIMEOUT}s — it never exited"
    summary="${summary}| \`$key\` | ✗ | install timed out |"$'\n'
    fail=$((fail + 1))
    continue
  fi
  if [ "$install_rc" -ne 0 ]; then
    fail_ "$key: install failed"
    entry_ok=0
  else
    run_op "$dir/detect.sh" "$log"; after=$?
    # 0 = installed and current, 2 = installed but an update exists. Both mean present.
    if [ "$after" -eq 1 ]; then
      fail_ "$key: detect still reports absent after install"
      entry_ok=0
    fi

    # The second install is the point of this exercise: it catches the re-run failures a single
    # pass cannot see, like an installer that refuses when the package is already there.
    if ! run_op "$dir/install.sh" "$log"; then
      fail_ "$key: not safe to re-run"
      entry_ok=0
    fi

    run_op "$dir/remove.sh" "$log"; rc=$?
    # Exit 3 means the collateral guard declined: a deliberate, correct non-removal, not a failure.
    if [ "$rc" -eq 3 ]; then
      note "$key: removal declined to avoid taking unrelated packages (exit 3)"
    elif [ "$rc" -ne 0 ]; then
      fail_ "$key: remove failed (exit $rc)"
      entry_ok=0
    else
      # Re-checked rather than checked once: Windows uninstallers are frequently asynchronous, and
      # winget reports success as soon as it has *launched* one. Observed with VLC on a real
      # runner, where the removal succeeded and the immediate re-check still saw it installed. A
      # synchronous uninstaller — most of them — passes on the first attempt and costs nothing.
      gone=0
      for attempt in 1 2 3 4; do
        run_op "$dir/detect.sh" "$log"; gone=$?
        [ "$gone" -eq 1 ] && break
        [ "$attempt" -lt 4 ] && sleep 2
      done
      # Anything other than 1 means it is still there — including 2, which an earlier version of
      # this check treated as success and would have passed a failed removal.
      if [ "$gone" -ne 1 ]; then
        # Capture *why* before giving up. A detect script that uses `grep -q` prints nothing, so
        # its log entry is empty and the failure is unattributable — which is exactly the position
        # VLC left us in twice. This dumps the package manager's own view instead of guessing.
        {
          echo "--- post-removal diagnostic for $key ---"
          case "$PLATFORM" in
            windows)
              winget list --id "$key" --accept-source-agreements 2>&1 | head -20
              echo "--- winget list, unfiltered, grepped for the entry name ---"
              winget list --accept-source-agreements 2>&1 | grep -i "${key%%-*}" | head -10
              # Distinguishes "the files are gone but the registry entry is stale" from "the
              # uninstall never happened" — the two have completely different fixes, and winget's
              # own listing cannot tell them apart because it reads Add/Remove Programs.
              echo "--- do the program files still exist? ---"
              for d in "/c/Program Files/VideoLAN" "/c/Program Files (x86)/VideoLAN" \
                       "/c/Program Files/${key}" "/c/Program Files (x86)/${key}"; do
                [ -e "$d" ] && echo "PRESENT: $d" || echo "absent:  $d"
              done
              echo "--- uninstall registry entries mentioning it ---"
              reg.exe query 'HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall' /s /f "${key%%-*}" 2>&1 | head -12
              ;;
            macos) brew list --cask 2>&1 | grep -i "${key%%-*}" | head -10 ;;
            linux) flatpak list --columns=application 2>&1 | grep -i "${key%%-*}" | head -10 ;;
          esac
          echo "--- detect.sh, with output ---"
          bash -x "$dir/detect.sh" 2>&1 | tail -25
        } >> "$log" 2>&1
        fail_ "$key: still reports present after removal (detect=$gone)"
        entry_ok=0
      fi
    fi
  fi

  if [ "$entry_ok" -eq 1 ]; then
    pass=$((pass + 1))
    summary="${summary}| \`$key\` | ✅ | full lifecycle |"$'\n'
  else
    fail=$((fail + 1))
    summary="${summary}| \`$key\` | ❌ | see \`$log\` |"$'\n'
  fi
  echo "::endgroup::"
done

# A table in the job summary, so the result is readable without opening the log.
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Catalog lifecycle — $PLATFORM"
    echo
    echo "**$pass passed · $fail failed · $skipped skipped**"
    echo
    echo "| Entry | Result | Notes |"
    echo "| --- | --- | --- |"
    printf '%s' "$summary"
  } >> "$GITHUB_STEP_SUMMARY"
fi

echo "passed=$pass failed=$fail skipped=$skipped"
[ "$fail" -eq 0 ]
