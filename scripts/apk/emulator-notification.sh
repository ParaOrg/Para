#!/usr/bin/env bash
# The ride notification's check on an emulator (contributor-app.yml, job `emulator-notification`):
# do its taps do what they say, natively, with the page leaving them to the native side as a page
# asleep does?
#
#   emulator-notification.sh <debug apk> <output folder>
#
# The APK is the emulator ride's (VITE_EMULATOR_RIDE=1, src/features/contribute/native/emulator-ride.ts):
# it starts a ride with no taps and hands the notification its state. A jeep ride is fed to the
# emulator's GPS once a second. The opened notification is the card with its bars, read from the
# shade (uiautomator) and pictured for the owner (notification-recording.png, -paused.png). Sakay is
# the bar on the screen, tapped; the other taps are the notification's own (RideActionReceiver),
# sent as root, as its bars send them.
#
#   0:00  the ride starts; the notification is the ride's service's (RideService), in the foreground
#   1:00  the shade: the card's bars, Pause and Sakay; Sakay tapped there
#   ~1:10 the phone's dark theme on: the card is still white (light always), then off again
#   ~1:30 swiped from Recents: the service records on, its notification stays; the app opened again
#   ~2:40 Pause: no fix is kept from then on, and the service leaves the foreground; the shade:
#         Resume and Finish
#   ~3:10 Resume: the service is in the foreground again and fixes are kept
#   ~3:40 Finish: no fix after it, and the notification says the ride waits to be saved
#
# The service's state after Pause and after Resume is what RideActionReceiver does with
# RideService: it stops at Pause and Finish and starts again at Resume.
set -u
APK=$1
OUT=$2
PKG=ph.para.contributor.debug
ACTIVITY=ph.para.contributor.MainActivity
RECEIVER=ph.para.contributor.RideActionReceiver
mkdir -p "$OUT"
FAILURES=()
fail() { FAILURES+=("$1"); echo "FAIL: $1"; }
pass() { echo "PASS: $1"; }

# The fixes the service has kept (the log's first line names the ride), read as the app's user.
native_fixes() {
  local lines
  lines=$(adb shell "run-as $PKG cat files/fixlog.ndjson" 2> /dev/null | tr -d '\r' | wc -l)
  echo $((lines > 0 ? lines - 1 : 0))
}
# The taps kept for the page, from the app's own preferences.
ride_events() {
  adb shell "run-as $PKG cat shared_prefs/para.ride.xml" 2> /dev/null | tr -d '\r' | grep -o '&quot;kind&quot;:&quot;[a-z]*' | sed 's/.*;//' | tr '\n' ' '
}
# Whether the location service is in the foreground now.
is_foreground() {
  adb shell dumpsys activity services "$PKG" | tr -d '\r' | grep -q 'isForeground=true'
}
# The shade opened, read and pictured as $OUT/<name>.xml and .png.
shade() {
  adb shell cmd statusbar expand-notifications
  sleep 3
  adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1
  adb pull /sdcard/ui.xml "$OUT/$1.xml" > /dev/null 2>&1
  adb exec-out screencap -p > "$OUT/$1.png"
}
# The words on one of the card's bars (left or right) in a shade read by shade().
bar_text() {
  grep -o "text=\"[^\"]*\" resource-id=\"$PKG:id/ride_bar_$2_text\"" "$OUT/$1.xml" | head -1 | sed 's/^text="\([^"]*\)".*/\1/'
}
# The middle of one of the card's bars, as "x y".
bar_middle() {
  grep -o "resource-id=\"$PKG:id/ride_bar_$2\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" "$OUT/$1.xml" | head -1 \
    | sed 's/.*bounds="\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]"/\1 \2 \3 \4/' \
    | awk '{ printf "%d %d", ($1 + $3) / 2, ($2 + $4) / 2 }'
}
# The height of one of the card's bars: both are one line high, so a wrapped word shows as a taller bar.
bar_height() {
  grep -o "resource-id=\"$PKG:id/ride_bar_$2\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" "$OUT/$1.xml" | head -1 \
    | sed 's/.*bounds="\[[0-9]*,\([0-9]*\)\]\[[0-9]*,\([0-9]*\)\]"/\1 \2/' | awk '{ print $2 - $1 }'
}
# Both bars in a shade read by shade() the same height, each word on one line.
bars_level() {
  local left right
  left=$(bar_height "$1" left)
  right=$(bar_height "$1" right)
  [ -n "$left" ] && [ "$left" = "$right" ] && pass "$2: both bars one line, $left px high" \
    || fail "$2: the bars are '$left' and '$right' px high (a word wrapped?)"
}
tap() {
  adb shell am broadcast -n "$PKG/$RECEIVER" -a "ph.para.contributor.ride.$1" > /dev/null
  sleep 3
}

adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
sleep 90   # Play Services settling, as emulator-ride.sh waits for it
adb root > /dev/null 2>&1; adb wait-for-device
# The taps reach the receiver, which is not exported, only as root: without it every tap is lost.
[ "$(adb shell id -u | tr -d '\r')" = 0 ] || { echo "FAIL: adb is not root" | tee "$OUT/summary.txt"; exit 1; }
adb install -r "$APK" || { echo "FAIL: install failed" | tee "$OUT/summary.txt"; exit 1; }
for permission in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION ACCESS_BACKGROUND_LOCATION POST_NOTIFICATIONS; do
  adb shell pm grant "$PKG" "android.permission.$permission" || echo "could not grant $permission"
done
adb logcat -c
adb logcat -v time > "$OUT/logcat.txt" &
LOGCAT_PID=$!
# A jeep north up a street, 5.5 m a second.
(lat=14.6516; while true; do
  adb emu geo fix 121.0437 "$lat" > /dev/null
  lat=$(awk -v l="$lat" 'BEGIN { printf "%.6f", l + 5.5 / 111000 }')
  sleep 1
done) &
FEED_PID=$!

adb shell am start -n "$PKG/$ACTIVITY"
sleep 60
adb shell dumpsys notification --noredact > "$OUT/notification-recording.txt"
grep -q 'Recording' "$OUT/notification-recording.txt" && pass "the notification shows the ride recording" \
  || fail "no recording notification"
is_foreground && pass "the location service is in the foreground" || fail "the service is not in the foreground"

# Opened, the card has its bars as the app's card does: Pause and Sakay while recording on Lakad.
shade notification-recording
LEFT=$(bar_text notification-recording left)
RIGHT=$(bar_text notification-recording right)
[ "$LEFT" = Pause ] && [ "$RIGHT" = Sakay ] && pass "opened, the card's bars: $LEFT and $RIGHT" \
  || fail "opened, the card's bars are '$LEFT' and '$RIGHT', not Pause and Sakay"
bars_level notification-recording "opened"
# Sakay, tapped on the screen: the bar's own tap.
SAKAY_AT=$(bar_middle notification-recording right)
if [ -n "$SAKAY_AT" ]; then
  adb shell input tap $SAKAY_AT
  sleep 3
  pass "Sakay tapped on the bar, at $SAKAY_AT"
else
  fail "no Sakay bar on the screen to tap"
fi
adb shell cmd statusbar collapse

# Light always (the owner, 2026-11-02): with the phone's dark theme on, the card is still white.
adb shell cmd uimode night yes > /dev/null
sleep 15   # the next quiet update (every 10 s under a minute, and the theme change) redraws it
adb shell cmd statusbar expand-notifications
sleep 3
adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1
adb pull /sdcard/ui.xml "$OUT/ui-night.xml" > /dev/null 2>&1
adb exec-out screencap -p > "$OUT/night.png"
CARD=$(python3 - "$OUT/ui-night.xml" "$OUT/night.png" "$PKG" << 'PY'
import re, struct, sys, zlib
xml, png, pkg = sys.argv[1:4]
nodes = open(xml, errors="replace").read()
found = re.search(r'resource-id="' + re.escape(pkg) + r':id/ride_time"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', nodes)
if not found:
    print("no card in the shade"); sys.exit()
left, top, right, bottom = map(int, found.groups())
# A plain PNG reader: screencap writes 8-bit RGBA, not interlaced.
data = open(png, "rb").read()
pos, idat, width, height = 8, b"", 0, 0
while pos < len(data):
    length, kind = struct.unpack(">I4s", data[pos:pos + 8])
    chunk = data[pos + 8:pos + 8 + length]
    if kind == b"IHDR":
        width, height = struct.unpack(">II", chunk[:8])
    elif kind == b"IDAT":
        idat += chunk
    pos += 12 + length
raw, stride, rows, prev = zlib.decompress(idat), width * 4, [], bytearray(width * 4)
for y in range(height):
    kind, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
    for x in range(stride):
        a = line[x - 4] if x >= 4 else 0
        b = prev[x]
        c = prev[x - 4] if x >= 4 else 0
        if kind == 1: line[x] = (line[x] + a) & 255
        elif kind == 2: line[x] = (line[x] + b) & 255
        elif kind == 3: line[x] = (line[x] + (a + b) // 2) & 255
        elif kind == 4:
            p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
    rows.append(line); prev = line
# The card's own background: just left of the Time figure, at its middle.
x, y = max(0, left - 6), (top + bottom) // 2
r, g, b = rows[y][x * 4:x * 4 + 3]
print(f"{r},{g},{b} at {x},{y}")
PY
)
echo "card background in the dark theme: $CARD" | tee "$OUT/night.txt"
echo "$CARD" | grep -Eq '^2(4[5-9]|5[0-5]),2(4[5-9]|5[0-5]),2(4[5-9]|5[0-5]) ' \
  && pass "dark theme on, the card is still white ($CARD)" || fail "dark theme on, the card is not white: $CARD"
adb shell cmd statusbar collapse
adb shell cmd uimode night no > /dev/null

# Swiped away from Recents, as a person ends an app: on stock Android the ride's service records
# on and its notification stays (RideService, stopWithTask false), with the activity gone. Makers
# such as Xiaomi kill the whole app on this swipe unless it may run in the background (Autostart,
# No restrictions); an emulator is stock Android, so this checks only what the app itself does.
# The task removed as Recents removes it: first Android's own "clear recent apps", which removes
# every task as a swipe does (only Para runs here); where that is missing, a swipe up on the
# card's own bounds, read from the Recents screen. Which one landed is kept with the run.
is_task_there() { adb shell dumpsys activity activities | tr -d '\r' | grep -q "$PKG/$ACTIVITY"; }
adb shell input keyevent KEYCODE_HOME
sleep 2
adb shell am clear-recent-apps > "$OUT/swipe-clear-recents.txt" 2>&1
sleep 3
SWIPED_BY="clear-recent-apps"
if is_task_there; then
  SWIPED_BY="a swipe on its card"
  adb shell input keyevent KEYCODE_APP_SWITCH
  sleep 3
  adb shell uiautomator dump /sdcard/recents.xml > /dev/null 2>&1
  adb pull /sdcard/recents.xml "$OUT/recents.xml" > /dev/null 2>&1
  CARD=$(grep -o 'resource-id="[^"]*\(snapshot\|task_view\|task\)[^"]*"[^>]*bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' "$OUT/recents.xml" | head -1 \
    | sed 's/.*bounds="\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]"/\1 \2 \3 \4/')
  if [ -n "$CARD" ]; then
    read -r L T R B <<< "$CARD"
    adb shell input swipe $(((L + R) / 2)) $(((T + B) / 2)) $(((L + R) / 2)) 10 200
  fi
  sleep 3
  adb shell input keyevent KEYCODE_HOME
  sleep 2
fi
adb shell dumpsys activity activities > "$OUT/activities-after-swipe.txt"
if is_task_there; then
  fail "removed from Recents (by $SWIPED_BY), yet the app's activity is still there: the removal did not land"
else
  pass "removed from Recents by $SWIPED_BY: the app's activity is gone"
fi
SWIPED_AT=$(native_fixes)
sleep 30
SINCE_SWIPE=$(native_fixes)
[ "$SINCE_SWIPE" -gt "$SWIPED_AT" ] && pass "swiped away: fixes still kept ($SWIPED_AT then $SINCE_SWIPE)" \
  || fail "swiped away, the ride stopped recording: $SWIPED_AT then $SINCE_SWIPE"
is_foreground && pass "swiped away: the service is still in the foreground" \
  || fail "swiped away, the service left the foreground"
adb shell dumpsys notification --noredact > "$OUT/notification-swiped.txt"
grep -q 'Recording' "$OUT/notification-swiped.txt" && pass "swiped away: the notification still says Recording" \
  || fail "swiped away, the Recording notification is gone"
# Some makers' Android (MIUI: the owner's POCO) kills the app's process when it is swiped from
# Recents, the service with it. With no task left, no page comes back: Android restarts the service
# alone (START_STICKY), and it has to record on by itself.
PID_SWIPED=$(adb shell pidof "$PKG" | tr -d '\r')
mark() { adb shell log -t PARA_RIDE_TEST "$1"; }
mark "killed-away"
[ -n "$PID_SWIPED" ] && adb shell "kill -9 $PID_SWIPED"
sleep 5
KILLED_AT=$(native_fixes)
sleep 60
SINCE_KILL=$(native_fixes)
adb shell dumpsys activity services "$PKG" > "$OUT/services-killed-away.txt"
adb shell dumpsys notification --noredact > "$OUT/notification-killed-away.txt"
is_task_there && echo "note: the app's activity came back after the kill" | tee "$OUT/killed-away-task.txt"
[ $((SINCE_KILL - KILLED_AT)) -ge 30 ] \
  && pass "killed away from Recents: the service records on by itself ($KILLED_AT then $SINCE_KILL in 60 s)" \
  || fail "killed away from Recents, the ride stopped recording: $KILLED_AT then $SINCE_KILL in 60 s"
is_foreground && pass "killed away: the service is back in the foreground" \
  || fail "killed away, the service did not come back in the foreground"
# Opened again: the page takes the ride up where the service has it, and the taps below go on.
adb shell am start -n "$PKG/$ACTIVITY"
sleep 30

tap PAUSE
PAUSED_AT=$(native_fixes)
sleep 27
STILL=$(native_fixes)
[ "$STILL" -eq "$PAUSED_AT" ] && pass "paused: no fix kept in 27 s ($STILL kept)" \
  || fail "paused, yet fixes were kept: $PAUSED_AT then $STILL"
is_foreground && fail "paused, the service is still in the foreground (the plugin's internals changed?)" \
  || pass "paused: the service has left the foreground"
adb shell dumpsys notification --noredact > "$OUT/notification-paused.txt"
grep -q 'Paused' "$OUT/notification-paused.txt" && pass "the notification says Paused" \
  || fail "no Paused notification"
sleep 2   # the notification posted again after the pause (RideNotification.postAgainSoon)
shade notification-paused
LEFT=$(bar_text notification-paused left)
RIGHT=$(bar_text notification-paused right)
[ "$LEFT" = Resume ] && [ "$RIGHT" = Finish ] && pass "paused, the card's bars: $LEFT and $RIGHT" \
  || fail "paused, the card's bars are '$LEFT' and '$RIGHT', not Resume and Finish"
bars_level notification-paused "paused"
adb shell cmd statusbar collapse

tap RESUME
RESUMED_AT=$(native_fixes)
sleep 27
AFTER=$(native_fixes)
[ "$AFTER" -gt "$RESUMED_AT" ] && pass "resumed: fixes kept again ($RESUMED_AT then $AFTER)" \
  || fail "resumed, yet no fix kept: $RESUMED_AT then $AFTER"
is_foreground && pass "resumed: the service is in the foreground again" \
  || fail "resumed, the service is not in the foreground (the plugin's internals changed?)"

tap FINISH
FINISHED_AT=$(native_fixes)
sleep 15
LAST=$(native_fixes)
[ "$LAST" -eq "$FINISHED_AT" ] && pass "finished: no fix kept after it" \
  || fail "finished, yet fixes were kept: $FINISHED_AT then $LAST"
adb shell dumpsys notification --noredact > "$OUT/notification-finished.txt"
grep -q 'Ride finished' "$OUT/notification-finished.txt" && pass "the notification says the ride waits to be saved" \
  || fail "no 'Ride finished' notification"

EVENTS=$(ride_events)
[ "$EVENTS" = "mode pause resume finish " ] && pass "the page has every tap waiting, in order: $EVENTS" \
  || fail "the taps kept for the page: '$EVENTS'"
# The page reads them too (RidePlugin.events), as it does to apply them: the driver's next report
# (every 30 s, emulator-ride.ts) counts what it read.
PAGE_TAPS=""
for _ in $(seq 1 45); do
  PAGE_TAPS=$(grep -o 'PARA_RIDE report .*taps=[a-z0-9]*' "$OUT/logcat.txt" | tail -1 | grep -o 'taps=[a-z0-9]*$')
  [ "$PAGE_TAPS" = "taps=4" ] && break
  sleep 1
done
[ "$PAGE_TAPS" = "taps=4" ] && pass "the page reads the four taps it is to apply" \
  || fail "the page reads the taps as '$PAGE_TAPS', not taps=4: it would apply none"

kill "$FEED_PID" "$LOGCAT_PID" 2> /dev/null
{
  if [ ${#FAILURES[@]} -eq 0 ]; then echo "PASS: every tap did what it says"; else printf 'FAIL: %s\n' "${FAILURES[@]}"; fi
} | tee "$OUT/summary.txt"
[ ${#FAILURES[@]} -eq 0 ]
