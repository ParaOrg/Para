#!/usr/bin/env bash
# The spike's emulator test: does the native watch keep delivering fixes, and does the foreground
# service stay up, while the screen is off? Run by .github/workflows/apk-spike.yml inside
# reactivecircus/android-emulator-runner, against a debug APK built with VITE_SPIKE_AUTOSTART=1
# (src/features/contribute/native-spike-autostart.ts, which prints PARAPO_FIXES lines).
#
#   emulator-test.sh <apk> <output folder>
#
# A scripted jeep ride (about 20 km/h through Quezon City) is fed to the emulator's GPS once a
# second. The screen goes off after OFF_AFTER seconds and stays off until TOTAL seconds.
set -u

APK=$1
OUT=$2
PKG=ph.parapo.contributor
OFF_AFTER=60
TOTAL=${TOTAL:-660}
mkdir -p "$OUT"

# Waypoints (lng lat), driven at a constant 5.5 m/s, one point per second.
route() {
  awk -v n="$TOTAL" 'BEGIN {
    split("121.0437 14.6516 121.0437 14.6577 121.0496 14.6640 121.0553 14.6700 121.0610 14.6786 121.0700 14.6830", w, " ")
    k = 6; for (i = 1; i <= k; i++) { x[i] = w[2*i-1]; y[i] = w[2*i] }
    step = 5.5 / 111000; seg = 1; px = x[1]; py = y[1]
    for (t = 0; t < n + 120; t++) {
      printf "%.6f %.6f\n", px, py
      left = step
      while (left > 0 && seg < k) {
        dx = x[seg+1] - px; dy = y[seg+1] - py; d = sqrt(dx*dx + dy*dy)
        if (d <= left) { px = x[seg+1]; py = y[seg+1]; left -= d; seg++ }
        else { px += dx / d * left; py += dy / d * left; left = 0 }
      }
    }
  }'
}

adb install -r "$APK" || { echo "install failed" | tee "$OUT/summary.txt"; exit 1; }
for permission in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION ACCESS_BACKGROUND_LOCATION POST_NOTIFICATIONS; do
  adb shell pm grant "$PKG" "android.permission.$permission" || echo "could not grant $permission"
done
adb shell dumpsys battery unplug || true   # on the battery, as a phone on a ride is

adb logcat -c
adb logcat -v time > "$OUT/logcat.txt" &
LOGCAT_PID=$!

route | while read -r lng lat; do
  adb emu geo fix "$lng" "$lat" > /dev/null
  sleep 1
done &
FEED_PID=$!

adb shell am start -n "$PKG/.MainActivity"
sleep "$OFF_AFTER"
adb exec-out screencap -p > "$OUT/screen-before.png"

OFF_AT=$(adb shell "date '+%m-%d %H:%M:%S'" | tr -d '\r')
adb shell input keyevent KEYCODE_SLEEP
sleep 5
adb shell dumpsys power | grep -m1 mWakefulness | tee "$OUT/wakefulness-off.txt"

sleep $((TOTAL / 2 - OFF_AFTER))
adb shell dumpsys activity services "$PKG" > "$OUT/services.txt"
adb shell dumpsys notification --noredact > "$OUT/notification.txt"
sleep $((TOTAL / 2))

WAKE_AT=$(adb shell "date '+%m-%d %H:%M:%S'" | tr -d '\r')
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
sleep 5
adb exec-out screencap -p > "$OUT/screen-after.png"
sleep 35   # one more report with the screen on
kill "$FEED_PID" "$LOGCAT_PID" 2> /dev/null

python3 - "$OUT" "$OFF_AT" "$WAKE_AT" << 'PY'
import re, sys
out, off_at, wake_at = sys.argv[1:4]
rows = []
for line in open(f"{out}/logcat.txt", errors="replace"):
    m = re.match(r"(\d\d-\d\d \d\d:\d\d:\d\d)\.\d+ .*PARAPO_FIXES (\d+) IDB (\d+) IDBFAIL (\d+)", line)
    if m:
        rows.append((m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4))))
off = [r for r in rows if off_at <= r[0] <= wake_at]
services = open(f"{out}/services.txt", errors="replace").read()
notification = open(f"{out}/notification.txt", errors="replace").read()
started = "PARAPO_STARTED" in open(f"{out}/logcat.txt", errors="replace").read()
is_foreground = "isForeground=true" in services
has_notice = "ParaPo is recording" in notification
grows = len(off) >= 2 and all(b[1] > a[1] for a, b in zip(off, off[1:]))
gained = off[-1][1] - off[0][1] if len(off) >= 2 else 0
idb_grows = len(off) >= 2 and off[-1][2] > off[0][2]
seconds = max(1, (len(off) - 1) * 30)
lines = [
    f"screen off from {off_at} to {wake_at}",
    f"watch started (PARAPO_STARTED in logcat): {started}",
    f"reports while the screen was off: {len(off)}",
    f"native fixes while off: first {off[0][1] if off else '-'}, last {off[-1][1] if off else '-'}, gained {gained} (about {gained / seconds:.2f}/s)",
    f"IndexedDB rows while off: first {off[0][2] if off else '-'}, last {off[-1][2] if off else '-'}; write failures {off[-1][3] if off else '-'}",
    f"count grew at every 30 s report: {grows}",
    f"foreground service running (isForeground=true): {is_foreground}",
    f"notification 'ParaPo is recording' present: {has_notice}",
    f"all reports: {rows}",
]
passed = started and grows and idb_grows and is_foreground and has_notice and gained >= seconds // 3
lines.insert(0, "PASS" if passed else "FAIL")
open(f"{out}/summary.txt", "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
sys.exit(0 if passed else 1)
PY
