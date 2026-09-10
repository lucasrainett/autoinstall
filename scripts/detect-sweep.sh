#!/usr/bin/env bash
# Runs every Linux detect.sh in a throwaway container and reports the ones that misbehave.
#
# detect.sh is read-only by contract, so this changes nothing — which is exactly why it can be run
# against all 125 entries at once, unlike the full lifecycle. What it catches is the two things a
# static read cannot see:
#
#   1. Scripts that BLOCK. `snap list` does not fail when snapd is installed but its daemon is not
#      running — it retries the socket forever. thunderbird's detect hung indefinitely on a machine
#      in exactly that state, and only the harness timeout ended it. A hung detect is the worst
#      failure mode there is: it produces no result and takes the run with it.
#   2. Scripts that exit outside the 0/1/2 contract. Anything else is a bug the engine cannot
#      interpret, and `set -e` plus one unexpected non-zero command is all it takes.
#
# A bare container is also a useful oracle for false positives: almost every entry must report 1
# (absent) there. Anything reporting 0 either detects something the base image genuinely ships, or
# is checking the wrong thing.
#
# Run by hand:  bash scripts/detect-sweep.sh
set -uo pipefail

IMAGE="${DETECT_SWEEP_IMAGE:-docker.io/library/ubuntu:24.04}"
PER_SCRIPT_TIMEOUT="${DETECT_SWEEP_TIMEOUT:-15}"
CT="autoinstall-detect-sweep-$$"

# Named and force-removed in a trap: a leaked container outlives the session and has to be found
# and killed by hand later.
cleanup() { podman rm -f "$CT" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

command -v podman >/dev/null 2>&1 || {
  echo "podman is required. This must not run against your own machine — detect is read-only," >&2
  echo "but the point of the sweep is a clean, known-empty system to compare against." >&2
  exit 1
}

echo "Starting $IMAGE..."
podman run -d --name "$CT" -v "$PWD:/repo:ro" "$IMAGE" sleep 3600 >/dev/null

# snapd is installed deliberately and its daemon deliberately left stopped: that is the exact
# condition that hung thunderbird, and it costs nothing to keep reproducing it.
podman exec "$CT" bash -c '
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >/dev/null 2>&1
  apt-get install -y -qq curl ca-certificates gnupg snapd systemd >/dev/null 2>&1' \
  || { echo "could not prepare the container" >&2; exit 1; }

blocked=(); off_contract=(); present=()
for script in catalog/*/linux/detect.sh; do
  key=${script#catalog/}; key=${key%/linux/detect.sh}
  podman exec "$CT" timeout "$PER_SCRIPT_TIMEOUT" bash "/repo/$script" >/dev/null 2>&1
  rc=$?
  case "$rc" in
    124) blocked+=("$key") ;;
    0)   present+=("$key") ;;
    1|2) ;;
    *)   off_contract+=("$key (exit $rc)") ;;
  esac
done

status=0
if [ ${#blocked[@]} -gt 0 ]; then
  echo
  echo "BLOCKED — no result after ${PER_SCRIPT_TIMEOUT}s:"
  printf '  - %s\n' "${blocked[@]}"
  status=1
fi
if [ ${#off_contract[@]} -gt 0 ]; then
  echo
  echo "OUTSIDE THE 0/1/2 CONTRACT:"
  printf '  - %s\n' "${off_contract[@]}"
  status=1
fi
if [ ${#present[@]} -gt 0 ]; then
  echo
  echo "Reported present (0) on a bare container. Expected for what the sweep itself installs"
  echo "(curl, gnupg, snapd) and for configure entries whose desired state already holds on an"
  echo "image that never shipped the thing they disable. Anything else is checking the wrong thing:"
  printf '  - %s\n' "${present[@]}"
fi

echo
[ "$status" -eq 0 ] && echo "All detect scripts answered within the contract."
exit "$status"
