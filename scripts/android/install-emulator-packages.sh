#!/usr/bin/env bash
# Installs the Android Emulator and one system image before an emulator job's test runs
# (.github/actions/prepare-emulator).
#
#   install-emulator-packages.sh versions <api level> <target> <arch>
#       Prints the stable channel's versions, as `emulator=<version>` and `system-image=<revision>`,
#       for the cache key.
#   install-emulator-packages.sh install <api level> <target> <arch>
#       Installs the emulator, platform-tools, the platform and the system image, and checks them.
#
# Each tries three times. sdkmanager can leave a broken package behind and still exit 0, printing
# only "Warning: An error occurred while preparing SDK package Android Emulator: Error on ZipFile
# unknown archive"; the emulator then never starts and the job fails much later on "could not
# connect to TCP port 5554". So a try counts only when the emulator and the image are whole.
# Before each new try the half-installed packages and sdkmanager's partial downloads are deleted,
# so the next try downloads them afresh.
#
# When every try fails it stops the job with "Emulator setup failed, no test ran".
set -u

MODE=${1:-}
API=${2:-}
TARGET=${3:-}
ARCH=${4:-}
TRIES=3

if [ -z "$MODE" ] || [ -z "$API" ] || [ -z "$TARGET" ] || [ -z "$ARCH" ]; then
  echo "usage: $0 versions|install <api level> <target> <arch>" >&2
  exit 2
fi

SDK=${ANDROID_HOME:?ANDROID_HOME is not set}
SDKMANAGER=${SDKMANAGER:-$SDK/cmdline-tools/latest/bin/sdkmanager}
IMAGE="system-images;android-$API;$TARGET;$ARCH"
IMAGE_DIR="$SDK/system-images/android-$API/$TARGET/$ARCH"

setup_failed() {
  echo "::error title=Emulator setup failed::Emulator setup failed, no test ran: $1"
  exit 1
}

# The version column of a package in the "Available Packages" part of `sdkmanager --list`.
available_version() {
  awk -F'|' -v package="$2" '
    /^Available Packages:/ { inAvailable = 1; next }
    /^Available Updates:/ { inAvailable = 0 }
    inAvailable {
      name = $1; version = $2
      gsub(/[[:space:]]/, "", name); gsub(/[[:space:]]/, "", version)
      if (name == package) { print version; exit }
    }
  ' <<< "$1"
}

print_versions() {
  local try listing emulator image
  for try in $(seq 1 "$TRIES"); do
    listing=$("$SDKMANAGER" --list --channel=0 2>&1)
    emulator=$(available_version "$listing" emulator)
    image=$(available_version "$listing" "$IMAGE")
    if [ -n "$emulator" ] && [ -n "$image" ]; then
      echo "emulator=$emulator"
      echo "system-image=$image"
      return 0
    fi
    echo "Try $try of $TRIES: the package list did not name the emulator and $IMAGE." >&2
    [ "$try" -lt "$TRIES" ] && sleep $((try * 10))
  done
  setup_failed "the Android SDK's package list could not be read after $TRIES tries."
}

# Why the installed packages are incomplete, or nothing when they are whole. sdkmanager writes a
# package's package.xml only once it is all unpacked. `emulator -version` is no check: on the
# runner it fails even with a whole emulator.
problem_with_install() {
  if [ ! -f "$SDK/emulator/package.xml" ] || [ ! -x "$SDK/emulator/emulator" ]; then
    echo "the emulator is incomplete"
  elif [ ! -f "$IMAGE_DIR/package.xml" ] || [ ! -s "$IMAGE_DIR/system.img" ]; then
    echo "the system image $IMAGE is incomplete"
  fi
}

install_packages() {
  local try output problem
  yes | "$SDKMANAGER" --licenses > /dev/null 2>&1 || true
  for try in $(seq 1 "$TRIES"); do
    echo "Try $try of $TRIES: installing the emulator and $IMAGE."
    if output=$("$SDKMANAGER" --install emulator platform-tools "platforms;android-$API" "$IMAGE" --channel=0 2>&1); then
      if grep -q "An error occurred" <<< "$output"; then
        problem="sdkmanager reported an error"
      else
        problem=$(problem_with_install)
      fi
    else
      problem="sdkmanager exited with an error"
    fi
    if [ -z "$problem" ]; then
      echo "The emulator and $IMAGE are installed."
      "$SDK/emulator/emulator" -version 2>&1 | head -5 || true
      return 0
    fi
    echo "Try $try of $TRIES failed: $problem."
    grep -i "error\|warning" <<< "$output" | tail -20
    rm -rf "$SDK/emulator" "$IMAGE_DIR" "$SDK/.temp" "$SDK/.downloadIntermediates"
    [ "$try" -lt "$TRIES" ] && sleep $((try * 10))
  done
  setup_failed "the emulator or $IMAGE could not be installed after $TRIES tries ($problem)."
}

case "$MODE" in
  versions) print_versions ;;
  install) install_packages ;;
  *)
    echo "usage: $0 versions|install <api level> <target> <arch>" >&2
    exit 2
    ;;
esac
