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

  bash "$dir/detect.sh" >> "$log" 2>&1; before=$?
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

  if ! bash "$dir/install.sh" >> "$log" 2>&1; then
    fail_ "$key: install failed"
    entry_ok=0
  else
    bash "$dir/detect.sh" >> "$log" 2>&1; after=$?
    # 0 = installed and current, 2 = installed but an update exists. Both mean present.
    if [ "$after" -eq 1 ]; then
      fail_ "$key: detect still reports absent after install"
      entry_ok=0
    fi

    # The second install is the point of this exercise: it catches the re-run failures a single
    # pass cannot see, like an installer that refuses when the package is already there.
    if ! bash "$dir/install.sh" >> "$log" 2>&1; then
      fail_ "$key: not safe to re-run"
      entry_ok=0
    fi

    bash "$dir/remove.sh" >> "$log" 2>&1; rc=$?
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
        bash "$dir/detect.sh" >> "$log" 2>&1; gone=$?
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
