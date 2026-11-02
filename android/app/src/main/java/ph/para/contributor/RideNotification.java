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
 * The ride's one notification: the recording card (Time, the mode, Distance) with its controls,
 * Lakad or Sakay, Pause or Resume, and Finish, on the lock screen too. It is the location
 * service's own foreground notification, taken over: posted under the service's id
 * (BackgroundGeolocationService's 28351) on its channel, so there is only ever one. Paused and
 * finished, the service is gone and the same id carries it as an ordinary notification.
 *
 * Its figures are said as the card says them (common/format.ts timeFigure and distanceFigure),
 * and updated quietly: every ten seconds under a minute, then each minute.
 */
final class RideNotification {
    /** BackgroundGeolocationService's NOTIFICATION_ID: the service's notification is this one. */
    static final int ID = 28351;
    /** The plugin's channel (its package name), made the same way here if the plugin has not yet. */
    private static final String CHANNEL = "com.equimaps.capacitor_background_geolocation";

    private static final long TICK_UNDER_A_MINUTE_MS = 10_000;
    private static final long MINUTE_MS = 60_000;

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
        card.setTextViewText(R.id.ride_time, figure(context, time));
        card.setTextViewText(R.id.ride_distance, figure(context, distance));
        card.setTextViewText(R.id.ride_mode, isRecording ? mode : "--");
        card.setTextViewText(R.id.ride_status, isRecording ? "Recording" : "Paused");
        card.setTextColor(R.id.ride_status, color(context, isRecording ? R.color.ride_content_disabled : R.color.ride_content_quaternary));
        int ring = !isRecording ? R.color.ride_paused_ring : "ride".equals(state.mode) ? R.color.ride_sakay_ring : R.color.ride_lakad_ring;
        int dot = !isRecording ? R.color.ride_paused_dot : "ride".equals(state.mode) ? R.color.ride_sakay_dot : R.color.ride_lakad_dot;
        card.setInt(R.id.ride_dot_ring, "setColorFilter", color(context, ring));
        card.setInt(R.id.ride_dot, "setColorFilter", color(context, dot));

        builder
            // Said by screen readers and by watches, which do not show the card.
            .setContentTitle(isRecording ? "Recording · " + mode : "Paused")
            .setContentText(time + " · " + distance)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(card)
            .setCustomBigContentView(card)
            .setOngoing(true);
        if (isRecording) {
            builder.addAction(0, "ride".equals(state.mode) ? "Lakad" : "Sakay", action(context, RideActionReceiver.SWITCH));
            builder.addAction(0, "Pause", action(context, RideActionReceiver.PAUSE));
        } else {
            builder.addAction(0, "Resume", resume(context));
        }
        builder.addAction(0, "Finish", action(context, RideActionReceiver.FINISH));
        return builder.build();
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
                    fix.optDouble("accuracyM", 1_000)
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
     * Resume: done here while the page is alive (frozen or not), as the service it starts again
     * hands its fixes to the page. With the page gone it opens the app, where Resume is one tap:
     * Android lets a notification open an app only from its own tap, not from a receiver.
     */
    private static PendingIntent resume(Context context) {
        return RidePlugin.isPageAlive() ? action(context, RideActionReceiver.RESUME) : openApp(context);
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
        // As the plugin makes it (BackgroundGeolocation.load): silent, no lights, no vibration.
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

    private static void stopTicking() {
        if (tick != null) HANDLER.removeCallbacks(tick);
        tick = null;
    }
}
