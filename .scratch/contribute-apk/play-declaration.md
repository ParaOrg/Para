# Google Play: the location foreground service declaration

The contributor app records a ride in its own foreground service of type `location`
(`RideService`, ADR 0006, amendment of 2026-11-06). Google Play asks every app that declares
`FOREGROUND_SERVICE_LOCATION` to explain why in the Play Console, with a short video. The app is
installed from a download link today, not from Play, so this is only needed on the day it goes to
the Play Store. It also asks for "Allow all the time" location (`ACCESS_BACKGROUND_LOCATION`), which
has its own declaration on the same page.

## Before you start

- A phone with the release build installed, signed in to a contributor account.
- Screen recording on: pull down Quick Settings and tap **Screen record**, with **Show touches**
  on, so the taps show in the video.
- Somewhere you can walk for a minute, outdoors, so the phone has a fix.

## Record the video (about 60 seconds)

1. Open Para. Show the map with your blue dot.
2. Tap **Start Tracking**. If Android asks for location, choose **While using the app**, then
   **Allow all the time** when Para asks for it. This shows the person chooses it.
3. Walk for a few seconds. The trail draws on the map.
4. Pull down the notification shade. The ride's card shows: time, Lakad or Sakay, distance, with
   **Pause** and **Sakay**. This is the visible notification Play wants to see.
5. Press the power button to turn the screen off. Wait about 10 seconds, then turn it on again.
6. Open the recent apps and swipe Para away. Pull down the shade: the card is still there, and the
   time still counts.
7. Open Para again. The trail includes the part walked while it was away.
8. Tap **Finish** on the card, or in the app, and save the ride.
9. Stop the screen recording.

Upload the video to YouTube as **Unlisted**, and copy its link.

## Fill in the Play Console

In the Play Console, open the app, then **Policy and programs → App content**.

### Foreground service permissions

1. Find **Foreground service permissions** and tap **Start** (or **Manage**).
2. Tick **Location**.
3. For the task, choose the option closest to **"Recording a route the user starts"** (or
   "Navigation" if that is the nearest offered), and describe it:

   > Para records the route of a jeepney or bus ride that the contributor starts with "Start
   > Tracking". The location must keep coming while the screen is off and the app is in the
   > background, for the whole ride, so the route can be mapped. A notification shows the whole
   > time with Pause and Finish. Recording stops at Pause or Finish.

4. Say the task is **started by the user** and **noticeable to the user** (the notification).
5. Paste the video link.
6. **Save**.

### Location permissions (background location)

1. Find **Location permissions** and tap **Start**.
2. Say the app accesses location in the background, for the same feature: recording a ride the
   contributor starts, with the screen off.
3. Paste the same video link; it shows the "Allow all the time" choice and the notification.
4. **Save**, then send the release for review.

## If Play says no

The reviewer's email names what was missing, most often that the video did not show the
notification, or did not show the person starting the task. Record again with both, and resubmit.
