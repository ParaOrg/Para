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
#   0:20  the font size changes, and once the rebuilt page has imported, changes back: Android
#         rebuilds the activity each time, in the same process (font scale is not among the
#         manifest's configChanges), as a phone does on a settings change; the page reloads and
#         imports the fixes the service kept
#   ~1:00 the screen goes off, 25 s after the second import
#   15:00 the app's process is killed (kill -9: what Android's low-memory killer does), and the
#         app is opened again; the page imports the fixes the foreground service kept
#   ~16:00 the screen goes off again; at 20:00 it comes on
#   20:40 the phone's Back on Record, nothing over it: the app goes to the back as Home sends it,
#         and the ride goes on (BackPlugin.java)
#
# It passes when the ride started once; each rebuilt activity found every fix the service had kept;
# the service and its notice stayed up with the screen off; fixes arrived at about a second apart;
# every fix the service had kept at the kill is in the ride after reopening; the ride goes on
# afterwards; and no fix is twice in it or out of order. Back then leaves the app for the back,
# its process and the service alive, and the ride records on.
#
# The test marks its own steps in logcat (tag PARA_RIDE_TEST), so the checker knows which of the
# page's imports followed the rebuilds and which followed the kill.
set -u

APK=$1
OUT=$2
# The debug build has its own id, so it installs beside the real app (android/app/build.gradle).
PKG=ph.para.contributor.debug
ACTIVITY=ph.para.contributor.MainActivity
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

# For the host list (contributor-app.yml, scripts/apk/hosts-in-capture.mjs): plain DNS, so the
# names the phone looks up can be read in the capture, then one lookup the list must show or call
# the capture incomplete. Under example.com (reserved for examples), not .invalid: a resolver
# answers .invalid itself and sends nothing (RFC 6761). Both are printed, so the log shows them.
adb shell settings put global private_dns_mode off || echo "could not turn Private DNS off"
# Wi-Fi off too: with it up the phone sends its traffic that way, around the NIC the capture
# records, so the capture holds only what went before Wi-Fi came up. The next line names the
# network the phone is left with.
adb shell svc wifi disable || echo "could not turn Wi-Fi off"
sleep 5
echo "active network: $(adb shell dumpsys connectivity | tr -d '\r' | grep -m1 -E 'Active default network|NetworkAgentInfo' | cut -c1-160)"
echo "Private DNS: $(adb shell settings get global private_dns_mode | tr -d '\r')"
echo "control lookup: $(adb shell ping -c 1 -W 2 capture-check.example.com 2>&1 | head -1 | tr -d '\r')"

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

# The page's imports so far: each rebuilt page logs one once it has read the service's fixes.
imports() { grep -c "PARA_RIDE imported" "$OUT/logcat.txt"; }
# Changes the font size, which rebuilds the activity, then waits for the rebuilt page's import
# before going on: a slow emulator has taken over 17 s to import, so a fixed wait could rebuild
# the page again before it had. A page that never imports is named here, and the checker fails.
rebuild_with_font() {
  local before
  before=$(imports)
  adb shell settings put system font_scale "$1"
  for _ in $(seq 60); do
    sleep 1
    [ "$(imports)" -gt "$before" ] && return
  done
  echo "FAIL: the page rebuilt at font size $1 imported nothing within 60 s"
}

adb shell am start -n "$PKG/$ACTIVITY"
sleep 20
mark rebuild
rebuild_with_font 1.15
rebuild_with_font 1.0
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
# The log itself, for a count that does not match the ride's.
adb shell "run-as $PKG cat files/fixlog.ndjson" > "$OUT/fixlog-at-kill.ndjson" 2> /dev/null
mark kill
if [ -n "$PID_BEFORE" ]; then adb shell "kill -9 $PID_BEFORE" || adb shell am force-stop "$PKG"; fi
sleep 3
PID_AFTER_KILL=$(adb shell pidof "$PKG" | tr -d '\r')
echo "pid before the kill: ${PID_BEFORE:-none}; right after: ${PID_AFTER_KILL:-none}; fixes kept by the service: $KEPT_AT_KILL" | tee "$OUT/kill.txt"

# Opened again, on the screen, as a rider unlocking the phone would.
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
adb shell am start -n "$PKG/$ACTIVITY"
sleep 40
adb exec-out screencap -p > "$OUT/screen-reopened.png"
adb shell input keyevent KEYCODE_SLEEP
sleep $((TOTAL - KILL_AT - 45))
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
sleep 40   # one more report with the screen on
adb exec-out screencap -p > "$OUT/screen-after.png"

# Back on Record mid-ride: nothing is over it, so the page asks to leave (use-android-back.ts).
mark back
adb shell input keyevent KEYCODE_BACK
sleep 3
adb shell dumpsys activity activities | grep -m1 -E "mResumedActivity|topResumedActivity" | tee "$OUT/resumed-after-back.txt"
PID_AFTER_BACK=$(adb shell pidof "$PKG" | tr -d '\r')
adb shell dumpsys activity services "$PKG" > "$OUT/services-after-back.txt"
# The service's own count: with the app in the back the page may be frozen, as with the screen off.
FIXES_AT_BACK=$(native_fixes)
sleep 30
FIXES_AFTER_BACK=$(native_fixes)
kill "$FEED_PID" "$LOGCAT_PID" 2> /dev/null

python3 - "$OUT" "$KEPT_AT_KILL" "${PID_BEFORE:-}" "${PID_AFTER_KILL:-}" "${PID_AFTER_BACK:-}" "$PKG" "$FIXES_AT_BACK" "$FIXES_AFTER_BACK" << 'PY'
import re, sys
out, kept_at_kill, pid_before, pid_after, pid_after_back, pkg = sys.argv[1:7]
fixes_at_back, fixes_after_back = int(sys.argv[7] or 0), int(sys.argv[8] or 0)
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
# The test's own rebuilds follow its mark. Android may rebuild the activity on its own as the app
# first opens (a system change landing on it, seen with the launcher rebuilt at the same moment),
# when the ride is seconds old and the service may have kept no fix yet: that one must catch up
# and keep the order too, but may find none.
ours = [f for i, f in imports if rebuild_at < i < kill_at]
androids = [f for i, f in imports if i < rebuild_at]
imported = [f for i, f in imports if i > kill_at]
reports = [fields(r) for i, r in ride if r.startswith("report ")]
back_at = marks.get("back", len(log))
resumed_after_back = open(f"{out}/resumed-after-back.txt", errors="replace").read()
services_after_back = open(f"{out}/services-after-back.txt", errors="replace").read()
ride = [r for _, r in ride]
services = open(f"{out}/services.txt", errors="replace").read()
notification = open(f"{out}/notification.txt", errors="replace").read()
errors = [r for r in ride if r.startswith(("error", "write-failed", "report-failed"))]
unread_published = [l for l in log if "could not be shown on the map" in l]

rows_after_import = int(imported[0]["rows"]) if imported else 0
last_kept = f"tiles={reports[-1].get('tiles', '?')} meta={reports[-1].get('meta', '?')}" if reports else "no report"
as_count = lambda value: int(value) if value and value.isdigit() else 0
last_kept_tiles = as_count(reports[-1].get("tiles")) if reports else 0
last_kept_meta = as_count(reports[-1].get("meta")) if reports else 0
last_rows = int(reports[-1]["rows"]) if reports else 0
# The page's own answer (caught): the ride held the log's last fix, read in the same look.
keeps_every_fix = lambda f: f.get("caught") == "true" and int(f["native"]) > 0 and f.get("sorted") == "true"
checks = {
    "the ride started, once, before the activity was rebuilt": len(started) == 1
    and started[0] < rebuild_at
    and all(started[0] < i for i, _ in imports),
    f"each rebuilt activity found every fix the service had kept ({len(ours)} rebuilt by the test)": len(ours) >= 2
    and all(keeps_every_fix(f) for f in ours)
    and all(f.get("caught") == "true" and f.get("sorted") == "true" for f in androids),
    "the service ran in the foreground with the screen off": "isForeground=true" in services,
    # The ride's notification (RideNotification.java) holds the service's own id: its title.
    "the ride's notification, Recording, was up": bool(re.search(r"android\.title=.*Recording", notification)),
    "the app's process was killed": bool(pid_before) and pid_before != pid_after,
    f"the service had kept at least 0.5 fixes a second until the kill ({kept_at_kill})": kept_at_kill >= 0.5 * (900 - 65),
    f"every fix the service kept is in the ride after reopening ({rows_after_import} >= {kept_at_kill})": bool(imported) and rows_after_import >= kept_at_kill,
    "the fixes in the ride are in time order after reopening": bool(imported) and imported[0].get("sorted") == "true",
    f"the ride went on after the reopening ({last_rows} > {rows_after_import})": last_rows > rows_after_import + 60,
    "no fix is out of order at the end": bool(reports) and reports[-1].get("sorted") == "true",
    "no error was reported": not errors,
    # The app's build carries no published map: its page reads the public site's (published-source.ts).
    "the map read the published routes and hotspots": not unread_published,
    # The map under the driver's screens kept the basemap it drew, in the WebView's Cache Storage
    # (basemap-cache.ts), as a phone's must to draw it with no signal.
    f"the map kept its basemap tiles and files on the phone ({last_kept})": last_kept_tiles > 0
    and last_kept_meta > 0,
    # Back on Record, nothing over it: the task to the back as Home sends it, never the activity ended.
    f"Back on Record mid-ride left the app for the back ({resumed_after_back.strip()[:80]})": back_at < len(log)
    and bool(resumed_after_back.strip())
    and pkg not in resumed_after_back,
    "the app's process lived on after Back": bool(pid_after_back),
    "the service stayed in the foreground after Back": "isForeground=true" in services_after_back,
    f"the service recorded on after Back ({fixes_at_back} then {fixes_after_back} fixes kept)": fixes_after_back
    >= fixes_at_back + 15,
}
lines = [f"{'PASS' if ok else 'FAIL'}: {name}" for name, ok in checks.items()]
lines.append("")
lines.append(f"imported after a rebuild: {rebuilt}")
lines.append(f"imported after the kill: {imported}")
lines.append(f"errors: {errors}")
lines.append(f"published map unread: {unread_published[:3]}")
lines.append(f"reports: {reports}")
passed = all(checks.values())
open(f"{out}/summary.txt", "w").write(("PASS" if passed else "FAIL") + "\n" + "\n".join(lines) + "\n")
print(("PASS" if passed else "FAIL") + "\n" + "\n".join(lines))
sys.exit(0 if passed else 1)
PY
