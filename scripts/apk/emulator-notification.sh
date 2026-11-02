#!/usr/bin/env bash
# The ride notification's check on an emulator (contributor-app.yml, job `emulator-notification`):
# do its taps do what they say, natively, with the page leaving them to the native side as a page
# asleep does?
#
#   emulator-notification.sh <debug apk> <output folder>
#
# The APK is the emulator ride's (VITE_EMULATOR_RIDE=1, src/features/contribute/native/emulator-ride.ts):
# it starts a ride with no taps and hands the notification its state. A jeep ride is fed to the
# emulator's GPS once a second. The taps are the notification's own (RideActionReceiver), sent as
# root, as its actions send them; the notification is checked to carry those actions.
#
#   0:00  the ride starts; the notification is the location service's, in the foreground
#   1:00  Sakay
#   1:10  Pause: no fix is kept from then on, and the service leaves the foreground
#   1:40  Resume: the service is in the foreground again and fixes are kept
#   2:10  Finish: no fix after it, and the notification says the ride waits to be saved
#
# The service's state after Pause and after Resume is what the plugin's internals do
# (ParaServiceWatchers.java): if that changes, this fails.
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
tap() {
  adb shell am broadcast -n "$PKG/$RECEIVER" -a "ph.para.contributor.ride.$1" > /dev/null
  sleep 3
}

adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
sleep 90   # Play Services settling, as emulator-ride.sh waits for it
adb root > /dev/null 2>&1 && adb wait-for-device
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
for action in Sakay Pause Finish; do
  grep -q "\"$action\"\|title=$action\|$action" "$OUT/notification-recording.txt" \
    && pass "the notification carries $action" || fail "the notification has no $action"
done
is_foreground && pass "the location service is in the foreground" || fail "the service is not in the foreground"

tap SWITCH
sleep 7
tap PAUSE
PAUSED_AT=$(native_fixes)
sleep 27
STILL=$(native_fixes)
[ "$STILL" -eq "$PAUSED_AT" ] && pass "paused: no fix kept in 27 s ($STILL kept)" \
  || fail "paused, yet fixes were kept: $PAUSED_AT then $STILL"
is_foreground && fail "paused, the service is still in the foreground (the plugin's internals changed?)" \
  || pass "paused: the service has left the foreground"
adb shell dumpsys notification --noredact > "$OUT/notification-paused.txt"
grep -q 'Paused' "$OUT/notification-paused.txt" && pass "the notification says Paused, with Resume" \
  || fail "no Paused notification"

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

kill "$FEED_PID" "$LOGCAT_PID" 2> /dev/null
{
  if [ ${#FAILURES[@]} -eq 0 ]; then echo "PASS: every tap did what it says"; else printf 'FAIL: %s\n' "${FAILURES[@]}"; fi
} | tee "$OUT/summary.txt"
[ ${#FAILURES[@]} -eq 0 ]
