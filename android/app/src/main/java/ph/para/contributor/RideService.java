package ph.para.contributor;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

/**
 * The ride's recording, in Para's own foreground service: started by the contributor's Start
 * (RidePlugin.startRecording), it keeps the location coming whether or not the page is there. It
 * is started, not bound, and does not stop with the app's task, so swiping the app away leaves it
 * recording; only Pause, Finish (the page's or the notification's) or a refused permission stops
 * it. Its notification is the ride's own (RideNotification).
 *
 * Each fix goes straight to the fix log (FixLog), in this process, and on to the page while it is
 * there to hear (RidePlugin.tellFix); a page frozen or gone imports the log when it wakes or opens
 * (native/import-fix-log.ts). The fix rate is one a second, the page's own (ADR 0006).
 *
 * Android may kill the process; the service is sticky, so it comes back without its intent and,
 * if RideState still has the ride recording, records on. The fixes in the gap are lost, as they
 * would be to any app.
 */
public class RideService extends Service {
    private static final String TAG = "ParaRide";
    private static final String START = "ph.para.contributor.ride.service.START";
    private static final String RECORDING_ID = "recordingId";
    private static final long INTERVAL_MS = 1_000;

    private static boolean isRunning = false;

    private FusedLocationProviderClient locations;
    private final LocationCallback callback = new LocationCallback() {
        @Override
        public void onLocationResult(@NonNull LocationResult result) {
            for (Location location : result.getLocations()) {
                FixLog.append(RideService.this, location);
                RidePlugin.tellFix(location);
            }
        }
    };

    /** Starts recording `recordingId`, from the contributor's own tap: Start, or Resume. */
    static void start(Context context, String recordingId) {
        Intent intent = new Intent(context, RideService.class)
            .setAction(START)
            .putExtra(RECORDING_ID, recordingId);
        ContextCompat.startForegroundService(context, intent);
    }

    /** Stops recording: no more fixes, and the service and its foreground go. */
    static void stop(Context context) {
        context.stopService(new Intent(context, RideService.class));
    }

    static synchronized boolean isRunning() {
        return isRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        locations = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Sticky and brought back by Android, with no intent: the ride goes on if it still records.
        RideState state = RideState.read(this);
        boolean isRestart = intent == null || !START.equals(intent.getAction());
        if (isRestart && !RideState.RECORDING.equals(state.phase)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!isRestart && !RideState.RECORDING.equals(state.phase)) {
            // Recording from this tap on, before the page says so: an app swiped away at once
            // still has a ride to record. The page tells the rest (RidePlugin.setState).
            String recordingId = intent.getStringExtra(RECORDING_ID);
            if (recordingId != null && !recordingId.isEmpty()) state.recordingId = recordingId;
            state.phase = RideState.RECORDING;
            state.pausedSince = 0;
            if (state.startedAt == 0) state.startedAt = System.currentTimeMillis();
            state.write(this);
        }
        if (!inForeground(RideNotification.forService(this, state))) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!LocationManagerCompat.isLocationEnabled(locationManager())) {
            RidePlugin.tellFixProblem("UNAVAILABLE", "Location services disabled.");
        }
        try {
            // Asked again on each start: a second Start or Resume replaces the request, never adds one.
            locations.removeLocationUpdates(callback);
            LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
                .setMinUpdateIntervalMillis(INTERVAL_MS)
                .setWaitForAccurateLocation(false)
                .build();
            locations.requestLocationUpdates(request, callback, Looper.getMainLooper());
        } catch (SecurityException refused) {
            Log.w(TAG, "The location permission is missing; the ride records no more.", refused);
            RidePlugin.tellFixProblem("DENIED", "Location permission is missing.");
            stopSelf();
            return START_NOT_STICKY;
        }
        synchronized (RideService.class) {
            isRunning = true;
        }
        return START_STICKY;
    }

    /** In the foreground with the ride's notification; false when Android refuses it. */
    private boolean inForeground(Notification notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(RideNotification.ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(RideNotification.ID, notification);
            }
            return true;
        } catch (RuntimeException refused) {
            // No location permission (Android 14), or started from the background where it may not be.
            Log.w(TAG, "The ride could not record in the foreground.", refused);
            RidePlugin.tellFixProblem("DENIED", "The ride could not record in the foreground.");
            return false;
        }
    }

    private LocationManager locationManager() {
        return (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public void onDestroy() {
        locations.removeLocationUpdates(callback);
        synchronized (RideService.class) {
            isRunning = false;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
