package ph.para.contributor;

import android.app.Notification;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationAvailability;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import ph.para.contributor.ride.FixClock;
import ph.para.contributor.ride.Ride;
import ph.para.contributor.ride.RideMachine;
import ph.para.contributor.ride.RideStep;

/**
 * The ride's recording, in Para's own foreground service: started by the contributor's Start
 * (RidePlugin.startRecording), it keeps the location coming whether or not the page is there. It
 * is started, not bound, and does not stop with the app's task, so swiping the app away leaves it
 * recording; only Pause, Finish (the page's or the notification's), a refused permission, or the
 * page telling of a ride that is not recording (RidePlugin.setState) stops it. Its notification
 * is the ride's own (RideNotification).
 *
 * Each fix goes straight to the fix log (FixLog), in this process, and on to the page while it is
 * there to hear (RidePlugin.tellFix); a page frozen or gone imports the log when it wakes or opens
 * (native/import-fix-log.ts). The fix rate is one a second, the page's own (ADR 0006).
 *
 * What the ride is, and every change to it, is RideMachine's (through Rides): the service records
 * while the ride is recording and says when Android refuses it. Android may kill the process; the
 * service is sticky, so it comes back without its intent and, if the ride is still recording,
 * records on. The fixes in the gap are lost, as they would be to any app.
 */
public class RideService extends Service {
    private static final String TAG = "ParaRide";
    private static final String START = "ph.para.contributor.ride.service.START";
    private static final long INTERVAL_MS = 1_000;

    /** How often the ride's fix check runs (RideMachine.check) while recording. */
    private static final long CHECK_EVERY_MS = 30_000;

    private static boolean isRunning = false;
    /** The fixes' clock for this process: anchored by its first fix. */
    private static final FixClock CLOCK = new FixClock();

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable check = new Runnable() {
        @Override
        public void run() {
            long now = System.currentTimeMillis();
            long moved = CLOCK.changeSince(now, SystemClock.elapsedRealtime());
            if (moved != 0) {
                RideDiagnostics.note(RideService.this, Rides.now(RideService.this).recordingId,
                    "the phone's clock moved " + (moved / 1000) + " s from the fixes' time; fixes keep their own");
            }
            if (Rides.apply(RideService.this, ride -> RideMachine.check(ride, now)).has(RideStep.Effect.DIAGNOSE)) {
                RidePlugin.tellFixProblem("UNAVAILABLE", "No location for two minutes.");
            }
            handler.postDelayed(this, CHECK_EVERY_MS);
        }
    };
    // The phone's location switch, heard while the service runs: off and on are said at once.
    private final BroadcastReceiver locationSwitch = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            noteLocationSwitch();
        }
    };
    private boolean isHearingSwitch = false;

    private FusedLocationProviderClient locations;
    private final LocationCallback callback = new LocationCallback() {
        @Override
        public void onLocationAvailability(@NonNull LocationAvailability availability) {
            // No location to give: said now if the switch is off; a silence otherwise is the check's.
            if (!availability.isLocationAvailable()) noteLocationSwitch();
        }

        @Override
        public void onLocationResult(@NonNull LocationResult result) {
            for (Location location : result.getLocations()) {
                // Kept at a time the phone's clock being changed cannot move back (FixClock).
                location.setTime(CLOCK.timeOf(location.getTime(), location.getElapsedRealtimeNanos() / 1_000_000));
                FixLog.append(RideService.this, location);
                RidePlugin.tellFix(location);
                // The fix check counts on the clock the ride does, not the fixes' own.
                Rides.fix(RideService.this, System.currentTimeMillis());
            }
        }
    };

    /**
     * Records the ride kept (Rides), from the contributor's own tap: Start, or Resume. Only Rides
     * calls it, as a step of the ride's rules asks.
     */
    static void start(Context context) {
        ContextCompat.startForegroundService(context, new Intent(context, RideService.class).setAction(START));
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
        long now = System.currentTimeMillis();
        boolean isRestart = intent == null || !START.equals(intent.getAction());
        // Sticky and brought back by Android, with no intent: the ride goes on if it still records.
        Ride ride = isRestart
            ? Rides.apply(this, current -> RideMachine.serviceRestarted(current, now)).ride
            : Rides.now(this);
        if (!ride.isRecordingLive()) {
            // Started for a ride that is not recording (stopped meanwhile): nothing to record.
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!inForeground(RideNotification.forService(this, ride))) {
            failed("Android refused the foreground");
            return START_NOT_STICKY;
        }
        hearLocationSwitch();
        noteLocationSwitch();
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
            failed("the location permission is missing");
            return START_NOT_STICKY;
        }
        synchronized (RideService.class) {
            isRunning = true;
        }
        handler.removeCallbacks(check);
        handler.postDelayed(check, CHECK_EVERY_MS);
        // In the foreground now: the card counts on (RideNotification's quiet updates).
        RideNotification.post(this);
        return START_STICKY;
    }

    /**
     * The ride cannot record (`why`): it is paused where it stands (RideMachine.refused), so no card
     * says "Recording" while nothing records. The page reads the pause when it wakes, and Resume
     * (in the app, once the permission is back) records again.
     */
    private void failed(String why) {
        long now = System.currentTimeMillis();
        if (!Rides.apply(this, current -> RideMachine.refused(current, now, why)).effects.isEmpty()) {
            RidePlugin.tellPage();
        }
        RideNotification.post(this);
        stopSelf();
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

    /** The location switch as it is now, told to the ride: off is said, on counts afresh. */
    private void noteLocationSwitch() {
        long now = System.currentTimeMillis();
        if (LocationManagerCompat.isLocationEnabled(locationManager())) {
            Rides.apply(this, ride -> RideMachine.locationOn(ride, now));
            return;
        }
        if (Rides.apply(this, ride -> RideMachine.locationOff(ride, now)).has(RideStep.Effect.POST_CARD)) {
            RidePlugin.tellFixProblem("UNAVAILABLE", "Location services disabled.");
        }
    }

    private void hearLocationSwitch() {
        if (isHearingSwitch) return;
        ContextCompat.registerReceiver(this, locationSwitch,
            new IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION), ContextCompat.RECEIVER_NOT_EXPORTED);
        isHearingSwitch = true;
    }

    private LocationManager locationManager() {
        return (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public void onDestroy() {
        locations.removeLocationUpdates(callback);
        handler.removeCallbacks(check);
        if (isHearingSwitch) {
            unregisterReceiver(locationSwitch);
            isHearingSwitch = false;
        }
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
