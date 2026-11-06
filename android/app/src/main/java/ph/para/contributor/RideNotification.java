package ph.para.contributor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The ride's one notification: the recording card (Time, the mode, Distance), on the lock screen
 * too, and opened, the card's own bars under it: Pause and Lakad or Sakay while recording, Resume
 * and Finish while paused. While recording it is the ride's service's foreground notification
 * (RideService), so there is only ever one; paused and finished, the service is gone and the same
 * id carries it as an ordinary notification.
 *
 * Its figures are said as the card says them (common/format.ts timeFigure and distanceFigure),
 * and updated quietly: every ten seconds under a minute, then each minute.
 */
final class RideNotification {
    /**
     * The notification's id and channel: those the location plugin's service used, which carried the
     * ride before RideService did. Kept, so a phone updated keeps its one channel and the choices
     * made for it in Android's settings.
     */
    static final int ID = 28351;
    private static final String CHANNEL = "com.equimaps.capacitor_background_geolocation";

    private static final long TICK_UNDER_A_MINUTE_MS = 10_000;
    private static final long MINUTE_MS = 60_000;
    private static final long REPOST_AFTER_MS = 800;
    /**
     * The accuracy a logged fix with none gets: far past what the card keeps, so it never counts.
     * The page's NO_ACCURACY_M (native-bridge/native-contract.ts) is the same.
     */
    static final double NO_ACCURACY_M = 1_000;

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());
    private static Runnable tick = null;

    private RideNotification() {}

    /** Posts the notification for the ride as RideState has it, or takes it away when none is on. */
    static void post(Context context) {
        Context app = context.getApplicationContext();
        RideState state = RideState.read(app);
        NotificationManager manager = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (RideState.NONE.equals(state.phase)) {
            stopTicking();
            manager.cancel(ID);
            return;
        }
        ensureChannel(app, manager);
        manager.notify(ID, build(app, state));
        if (RideState.RECORDING.equals(state.phase)) tickAfter(app, state);
        else stopTicking();
    }

    /**
     * The ride's notification for RideService to go into the foreground with, its channel made. It
     * starts no ticking: the service does that once it is in the foreground (post), so a service
     * Android refuses leaves no card counting.
     */
    static Notification forService(Context context, RideState state) {
        Context app = context.getApplicationContext();
        NotificationManager manager = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) ensureChannel(app, manager);
        return build(app, state);
    }

    /** The notification for the ride now: also what the service shows when a tap starts it again. */

    static Notification build(Context context, RideState state) {
        long now = System.currentTimeMillis();
        String time = timeText(state.elapsedMs(now) / 1000);
        String distance = distanceText(distanceM(context, state));
        boolean isRecording = RideState.RECORDING.equals(state.phase);
        boolean isFinished = RideState.FINISHED.equals(state.phase);
        String mode = "ride".equals(state.mode) ? "Sakay" : "Lakad";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(openApp(context));

        if (isFinished) {
            // Stopped without the app opened: the ride waits on the phone for its details.
            return builder
                .setContentTitle("Ride finished — tap to save")
                .setContentText(time + " · " + distance)
                .setOngoing(false)
                .setAutoCancel(true)
                .build();
        }

        RemoteViews card = new RemoteViews(context.getPackageName(), R.layout.ride_notification);
        fillCard(context, card, state, time, distance);
        RemoteViews opened = new RemoteViews(context.getPackageName(), R.layout.ride_notification_expanded);
        fillCard(context, opened, state, time, distance);

        // The card's own bars (recording-screen.tsx): Pause and the mode a tap switches to while
        // recording, Resume and Finish while paused.
        Bar left = isRecording
            ? new Bar("Pause", "Pause", R.drawable.ride_icon_pause, R.drawable.ride_bar_brand,
                action(context, RideActionReceiver.PAUSE))
            : new Bar("Resume", "Resume", R.drawable.ride_icon_play, R.drawable.ride_bar_brand,
                resume(context, state));
        Bar right;
        if (!isRecording) {
            right = new Bar("Finish", "Finish", R.drawable.ride_icon_finish, R.drawable.ride_bar_finish,
                action(context, RideActionReceiver.FINISH));
        } else if ("ride".equals(state.mode)) {
            right = new Bar("Lakad", "Switch to Lakad", R.drawable.ride_icon_switch, R.drawable.ride_bar_lakad,
                action(context, RideActionReceiver.SWITCH));
        } else {
            right = new Bar("Sakay", "Switch to Sakay", R.drawable.ride_icon_switch, R.drawable.ride_bar_sakay,
                action(context, RideActionReceiver.SWITCH));
        }
        left.into(opened, R.id.ride_bar_left, R.id.ride_bar_left_icon, R.id.ride_bar_left_text);
        right.into(opened, R.id.ride_bar_right, R.id.ride_bar_right_icon, R.id.ride_bar_right_text);

        builder
            // Said by screen readers and by watches, which do not show the card.
            .setContentTitle(isRecording ? "Recording · " + mode : "Paused")
            .setContentText(time + " · " + distance)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(card)
            .setCustomBigContentView(opened)
            .setOngoing(true)
            // Where the card is not shown (a watch), the same taps as plain actions; on the phone the
            // bars are the controls, so no action row repeats them under the card.
            .extend(new NotificationCompat.WearableExtender()
                .addAction(left.asAction())
                .addAction(right.asAction()));
        return builder.build();
    }

    /** The figures, as the card shows them: the same ids in the closed card and the opened one. */
    private static void fillCard(Context context, RemoteViews card, RideState state, String time, String distance) {
        boolean isRecording = RideState.RECORDING.equals(state.phase);
        String mode = "ride".equals(state.mode) ? "Sakay" : "Lakad";
        card.setTextViewText(R.id.ride_time, figure(context, time));
        card.setTextViewText(R.id.ride_distance, figure(context, distance));
        card.setTextViewText(R.id.ride_mode, isRecording ? mode : "--");
        card.setTextViewText(R.id.ride_status, isRecording ? "Recording" : "Paused");
        card.setTextColor(R.id.ride_status, color(context, isRecording ? R.color.ride_content_disabled : R.color.ride_content_quaternary));
        int ring = !isRecording ? R.color.ride_paused_ring : "ride".equals(state.mode) ? R.color.ride_sakay_ring : R.color.ride_lakad_ring;
        int dot = !isRecording ? R.color.ride_paused_dot : "ride".equals(state.mode) ? R.color.ride_sakay_dot : R.color.ride_lakad_dot;
        card.setInt(R.id.ride_dot_ring, "setColorFilter", color(context, ring));
        card.setInt(R.id.ride_dot, "setColorFilter", color(context, dot));
    }

    /** One of the card's bars: its words, what a screen reader says, its icon, colour and tap. */
    private static final class Bar {
        final String text;
        final String name;
        final int icon;
        final int surface;
        final PendingIntent tap;

        Bar(String text, String name, int icon, int surface, PendingIntent tap) {
            this.text = text;
            this.name = name;
            this.icon = icon;
            this.surface = surface;
            this.tap = tap;
        }

        void into(RemoteViews views, int bar, int iconView, int textView) {
            views.setInt(bar, "setBackgroundResource", surface);
            views.setImageViewResource(iconView, icon);
            views.setTextViewText(textView, text);
            views.setContentDescription(bar, name);
            views.setOnClickPendingIntent(bar, tap);
        }

        NotificationCompat.Action asAction() {
            return new NotificationCompat.Action.Builder(0, text, tap).build();
        }
    }

    /** "12 min" with its unit in the card's lighter colour, as the card's Stat draws it. */
    private static CharSequence figure(Context context, String text) {
        SpannableString spanned = new SpannableString(text);
        int space = text.lastIndexOf(' ');
        if (space > 0) {
            spanned.setSpan(
                new ForegroundColorSpan(color(context, R.color.ride_content_quaternary)),
                space + 1, text.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            );
        }
        return spanned;
    }

    /** common/format.ts timeFigure: seconds under a minute, then whole minutes. */
    static String timeText(long seconds) {
        long whole = Math.max(0, seconds);
        return whole < 60 ? whole + " sec" : (whole / 60) + " min";
    }

    /** common/format.ts distanceFigure: whole metres under a kilometre, then kilometres to one decimal. */
    static String distanceText(double metres) {
        long whole = Math.max(0, Math.round(metres));
        return whole < 1000 ? whole + " m" : String.format(Locale.ROOT, "%.1f km", whole / 1000.0);
    }

    /** The ride's distance from the fixes the service kept (FixLog), as the card works it out. */
    private static double distanceM(Context context, RideState state) {
        try {
            JSONObject log = FixLog.read(context, Long.MIN_VALUE);
            if (!state.recordingId.equals(log.optString("recordingId"))) return 0;
            JSONArray lines = log.getJSONArray("fixes");
            List<RideDistance.Fix> fixes = new ArrayList<>(lines.length());
            for (int index = 0; index < lines.length(); index++) {
                JSONObject fix = lines.getJSONObject(index);
                fixes.add(new RideDistance.Fix(
                    fix.getLong("time"),
                    fix.getDouble("lng"),
                    fix.getDouble("lat"),
                    fix.optDouble("accuracyM", NO_ACCURACY_M)
                ));
            }
            return RideDistance.of(fixes);
        } catch (Exception unreadable) {
            // A log that cannot be read says nothing yet: the next tick tries again.
            return 0;
        }
    }

    private static int color(Context context, int id) {
        return ContextCompat.getColor(context, id);
    }

    private static PendingIntent action(Context context, String action) {
        Intent intent = new Intent(context, RideActionReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(context, action.hashCode(), intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /**
     * Whether Resume can be done here: the page is alive (frozen or not) and its watch was still on
     * when the pause was tapped here, so it takes the resume where the pause was (the page applies
     * them as a pair). A ride the page paused itself has no watch on: its Resume is the page's.
     */
    static boolean canResumeHere(RideState state) {
        return RidePlugin.isPageAlive() && state.isPageWatching;
    }

    /**
     * Resume: done here when it can be (canResumeHere). Otherwise it opens the app, where Resume
     * is one tap: Android lets a notification open an app only from its own tap, not a receiver.
     */
    private static PendingIntent resume(Context context, RideState state) {
        return canResumeHere(state) ? action(context, RideActionReceiver.RESUME) : openApp(context);
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (intent == null) intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        return PendingIntent.getActivity(context, 0, intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void ensureChannel(Context context, NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || manager.getNotificationChannel(CHANNEL) != null) return;
        // As the location plugin made it: silent, no lights, no vibration.
        NotificationChannel channel = new NotificationChannel(CHANNEL,
            context.getString(R.string.capacitor_background_geolocation_notification_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT);
        channel.enableLights(false);
        channel.enableVibration(false);
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    /** The next update: every ten seconds under a minute, then as each new minute begins. */
    private static void tickAfter(Context context, RideState state) {
        stopTicking();
        long elapsed = state.elapsedMs(System.currentTimeMillis());
        long wait = elapsed < MINUTE_MS ? TICK_UNDER_A_MINUTE_MS : MINUTE_MS - (elapsed % MINUTE_MS);
        tick = () -> post(context);
        HANDLER.postDelayed(tick, wait);
    }

    /**
     * Posts again shortly: the service's leaving the foreground (Pause, Finish) removes its
     * notification inside the system after our post may have landed, and nothing else re-posts a
     * notification that does not tick.
     */
    static void postAgainSoon(Context context) {
        Context app = context.getApplicationContext();
        HANDLER.postDelayed(() -> post(app), REPOST_AFTER_MS);
    }

    /**
     * The page is gone (its activity destroyed, or the app swiped away). A ride recording records
     * on in its own service (RideService), and its notification stays; a paused or finished ride
     * keeps its notification too, whose Resume then opens the app. A ride the page said was
     * recording with no service left to record it ends here: nothing records it.
     */
    static void pageGone(Context context) {
        Context app = context.getApplicationContext();
        RideState state = RideState.read(app);
        state.isPageWatching = false;
        if (RideState.RECORDING.equals(state.phase) && !RideService.isRunning()) {
            state.phase = RideState.NONE;
        }
        state.write(app);
        post(app);
    }

    private static void stopTicking() {
        if (tick != null) HANDLER.removeCallbacks(tick);
        tick = null;
    }
}
