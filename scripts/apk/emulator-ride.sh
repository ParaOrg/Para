#!/usr/bin/env bash
# The app's emulator ride (contributor-app.yml, job `emulator-ride`): does a recording survive the
# screen being off for twenty minutes, and the app being killed in the middle of it?
#
#   emulator-ride.sh <debug apk> <output folder>
#
# The APK is built with VITE_EMULATOR_RIDE=1 (src/features/contribute/native/emulator-ride.ts), which
# starts a recording and the native watch with no taps, and prints PARA_RIDE lines to logcat. A
# scripted jeep ride (about 20 km/h, out and back through Quezon City) is fed to the emulator's GPS
# once a second.
#
#   0:00  the app starts on the screen
#   0:20  the font size changes, and at 0:35 changes back: Android rebuilds the activity each time, in
#         the same process (font scale is not among the manifest's configChanges), as a phone does
#         on a settings change; the page reloads and imports the fixes the service kept
#   1:00  the screen goes off
#   15:00 the app's process is killed (kill -9: what Android's low-memory killer does), and the
#         app is opened again; the page imports the fixes the foreground service kept
#   ~16:00 the screen goes off again; at 20:00 it comes on
#
# It passes when the ride started once; each rebuilt activity found every fix the service had kept;
# the service and its notice stayed up with the screen off; fixes arrived at about a second apart;
# every fix the service had kept at the kill is in the ride after reopening; the ride goes on
# afterwards; and no fix is twice in it or out of order.
#
# The test marks its own steps in logcat (tag PARA_RIDE_TEST), so the checker knows which of the
# page's imports followed the rebuilds and which followed the kill.
set -u

APK=$1
OUT=$2
PKG=ph.para.contributor
OFF_AFTER=60
KILL_AT=900
TOTAL=1200
mkdir -p "$OUT"

# Waypoints (lng lat) there and back, driven at a constant 5.5 m/s, one point per second.
route() {
  awk -v n="$TOTAL" 'BEGIN {
    split("121.0437 14.6516 121.0437 14.6577 121.0496 14.6640 121.0553 14.6700 121.0610 14.6786 121.0700 14.6830", w, " ")
    k = 6; for (i = 1; i <= k; i++) { x[i] = w[2*i-1]; y[i] = w[2*i] }
    for (i = 1; i <= k; i++) { x[k+i] = x[k+1-i]; y[k+i] = y[k+1-i] }
    for (i = 1; i <= k; i++) { x[2*k+i] = x[i]; y[2*k+i] = y[i] }
    k = 3 * k
    step = 5.5 / 111000; seg = 1; px = x[1]; py = y[1]
    for (t = 0; t < n + 300; t++) {
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

# The fixes in the native log, read as the app's own user (the APK is a debug build).
native_fixes() {
  local lines
  lines=$(adb shell "run-as $PKG cat files/fixlog.ndjson" 2> /dev/null | tr -d '\r' | wc -l)
  echo $((lines > 0 ? lines - 1 : 0))   # the first line names the recording
}

# The emulator reports booted while Play Services is still updating and restarting, which killed
# the app in the first spike runs ("depends on provider ... in dying proc com.google.android.gms"),
# so wait for the boot and for things to settle.
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
sleep 90

# Root (the google_apis image allows it) lets the test kill the app's process the way Android does;
# it restarts adb, so it comes before anything that depends on the connection.
adb root > /dev/null 2>&1 && adb wait-for-device
adb install -r "$APK" || { echo "FAIL: install failed" | tee "$OUT/summary.txt"; exit 1; }
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

# A step of the test's own, marked in logcat for the checker.
mark() { adb shell log -t PARA_RIDE_TEST "$1"; }

adb shell am start -n "$PKG/.MainActivity"
sleep 20
mark rebuild
adb shell settings put system font_scale 1.15
sleep 15
adb shell settings put system font_scale 1.0
sleep $((OFF_AFTER - 35))
adb exec-out screencap -p > "$OUT/screen-before.png"
adb shell input keyevent KEYCODE_SLEEP
sleep 5
adb shell dumpsys power | grep -m1 mWakefulness | tee "$OUT/wakefulness-off.txt"

# Halfway to the kill: the service and its notice are up, with the page long since frozen.
sleep $((KILL_AT / 2 - OFF_AFTER))
adb shell dumpsys activity services "$PKG" > "$OUT/services.txt"
adb shell dumpsys notification --noredact > "$OUT/notification.txt"
sleep $((KILL_AT / 2 - 5))

# The kill. The count is read just before, so the fixes the service had kept are known.
PID_BEFORE=$(adb shell pidof "$PKG" | tr -d '\r')
KEPT_AT_KILL=$(native_fixes)
mark kill
if [ -n "$PID_BEFORE" ]; then adb shell "kill -9 $PID_BEFORE" || adb shell am force-stop "$PKG"; fi
sleep 3
PID_AFTER_KILL=$(adb shell pidof "$PKG" | tr -d '\r')
echo "pid before the kill: ${PID_BEFORE:-none}; right after: ${PID_AFTER_KILL:-none}; fixes kept by the service: $KEPT_AT_KILL" | tee "$OUT/kill.txt"

# Opened again, on the screen, as a rider unlocking the phone would.
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell am start -n "$PKG/.MainActivity"
sleep 40
adb exec-out screencap -p > "$OUT/screen-reopened.png"
adb shell input keyevent KEYCODE_SLEEP
sleep $((TOTAL - KILL_AT - 45))
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
sleep 40   # one more report with the screen on
adb exec-out screencap -p > "$OUT/screen-after.png"
kill "$FEED_PID" "$LOGCAT_PID" 2> /dev/null

python3 - "$OUT" "$KEPT_AT_KILL" "${PID_BEFORE:-}" "${PID_AFTER_KILL:-}" << 'PY'
import re, sys
out, kept_at_kill, pid_before, pid_after = sys.argv[1:5]
kept_at_kill = int(kept_at_kill)
log = open(f"{out}/logcat.txt", errors="replace").read().splitlines()
# The page's lines, each with where it is in the log, and the test's own marks.
ride = [(i, l.split("PARA_RIDE ", 1)[1]) for i, l in enumerate(log) if "PARA_RIDE " in l]
marks = {}
for i, l in enumerate(log):
    if "PARA_RIDE_TEST" in l:
        marks.setdefault(l.rsplit(": ", 1)[-1].strip(), i)
rebuild_at = marks.get("rebuild", len(log))
kill_at = marks.get("kill", len(log))
fields = lambda s: dict(re.findall(r"(\w+)=(\S+)", s))
started = [i for i, r in ride if r.startswith("started")]
imports = [(i, fields(r)) for i, r in ride if r.startswith("imported")]
# Every import before the kill followed a rebuilt activity: the test's two, and any of Android's own.
rebuilt = [f for i, f in imports if i < kill_at]
imported = [f for i, f in imports if i > kill_at]
reports = [fields(r) for i, r in ride if r.startswith("report ")]
ride = [r for _, r in ride]
services = open(f"{out}/services.txt", errors="replace").read()
notification = open(f"{out}/notification.txt", errors="replace").read()
errors = [r for r in ride if r.startswith(("error", "write-failed", "report-failed"))]

rows_after_import = int(imported[0]["rows"]) if imported else 0
last_rows = int(reports[-1]["rows"]) if reports else 0
# The page's own answer (caught): the ride held the log's last fix, read in the same look.
keeps_every_fix = lambda f: f.get("caught") == "true" and int(f["native"]) > 0 and f.get("sorted") == "true"
checks = {
    "the ride started, once, before the activity was rebuilt": len(started) == 1
    and started[0] < rebuild_at
    and all(started[0] < i for i, _ in imports),
    f"each rebuilt activity found every fix the service had kept ({len(rebuilt)} rebuilt)": len(rebuilt) >= 2
    and all(keeps_every_fix(f) for f in rebuilt),
    "the service ran in the foreground with the screen off": "isForeground=true" in services,
    "the notice 'Para is recording' was up": "Para is recording" in notification,
    "the app's process was killed": bool(pid_before) and pid_before != pid_after,
    f"the service had kept at least 0.5 fixes a second until the kill ({kept_at_kill})": kept_at_kill >= 0.5 * (900 - 65),
    f"every fix the service kept is in the ride after reopening ({rows_after_import} >= {kept_at_kill})": bool(imported) and rows_after_import >= kept_at_kill,
    "the fixes in the ride are in time order after reopening": bool(imported) and imported[0].get("sorted") == "true",
    f"the ride went on after the reopening ({last_rows} > {rows_after_import})": last_rows > rows_after_import + 60,
    "no fix is out of order at the end": bool(reports) and reports[-1].get("sorted") == "true",
    "no error was reported": not errors,
}
lines = [f"{'PASS' if ok else 'FAIL'}: {name}" for name, ok in checks.items()]
lines.append("")
lines.append(f"imported after a rebuild: {rebuilt}")
lines.append(f"imported after the kill: {imported}")
lines.append(f"errors: {errors}")
lines.append(f"reports: {reports}")
passed = all(checks.values())
open(f"{out}/summary.txt", "w").write(("PASS" if passed else "FAIL") + "\n" + "\n".join(lines) + "\n")
print(("PASS" if passed else "FAIL") + "\n" + "\n".join(lines))
sys.exit(0 if passed else 1)
PY
