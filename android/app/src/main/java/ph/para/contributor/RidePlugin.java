package ph.para.contributor;

import android.location.Location;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import ph.para.contributor.ride.Ride;
import ph.para.contributor.ride.RideCodec;
import ph.para.contributor.ride.RideMachine;

/**
 * The page's way to the ride's notification (native/ride-notice.ts) and to its recording
 * (native/native-location.ts). While awake, the page says where the ride is (setState) and the
 * notification follows it. It takes the taps made on the notification (events), applies them, and
 * drops them (dropEvents); a tap while it is awake reaches it at once ("rideEvent"). Its Start
 * starts the ride's service (startRecording), whose fixes reach it while it is there ("rideFix").
 */
@CapacitorPlugin(name = "Ride")
public class RidePlugin extends Plugin {
    // The page's plugin, while there is one: the notification's Resume is done natively only then.
    private static RidePlugin page = null;

    static synchronized boolean isPageAlive() {
        return page != null;
    }

    /** Tells the page a tap was made, if it is there to hear: it reads the events. */
    static synchronized void tellPage() {
        if (page != null) page.notifyListeners("rideEvent", new JSObject());
    }

    /** Hands RideService's fix to the page, if it is there; the fix log has it either way. */
    static synchronized void tellFix(Location location) {
        if (page == null) return;
        JSObject fix = new JSObject();
        fix.put("time", location.getTime());
        fix.put("lng", location.getLongitude());
        fix.put("lat", location.getLatitude());
        if (location.hasAccuracy()) fix.put("accuracyM", location.getAccuracy());
        page.notifyListeners("rideFix", fix);
    }

    /** Tells the page the ride cannot record: "DENIED" (no permission), or "UNAVAILABLE". */
    static synchronized void tellFixProblem(String code, String message) {
        if (page == null) return;
        JSObject problem = new JSObject();
        problem.put("code", code);
        problem.put("message", message);
        page.notifyListeners("rideFixProblem", problem);
    }

    @Override
    public void load() {
        synchronized (RidePlugin.class) {
            page = this;
        }
        // A ride recording with no service now was cut off while the app was gone (a kill nothing
        // restarted): said so, and its card taken away, before the page asks.
        if (!RideService.isRunning()) {
            long now = System.currentTimeMillis();
            Rides.apply(getContext(), ride -> RideMachine.serviceMissing(ride, now));
        }
        // Resume, which depends on the page being there, changes what it does.
        RideNotification.post(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (RidePlugin.class) {
            if (page == this) page = null;
        }
        RideNotification.pageGone(getContext());
    }

    /**
     * Where the page, awake, holds the ride: kept as it says (the page is the ride's truth while it
     * is there), keeping what only the phone knows (why it has no location) for the same ride still
     * recording.
     */
    @PluginMethod
    public void setState(PluginCall call) {
        String recordingId = call.getString("recordingId", "");
        String phase = call.getString("phase", RideState.NONE);
        Long startedAt = call.getLong("startedAt");
        Double pausedSeconds = call.getDouble("pausedSeconds");
        Long stoppedAt = call.getLong("stoppedAt");
        boolean isPaused = RideState.PAUSED.equals(phase);
        Ride told = RideCodec.fromSummary(
            recordingId == null ? "" : recordingId,
            phase,
            call.getString("mode", Ride.WALK),
            startedAt == null ? 0 : startedAt,
            pausedSeconds == null ? 0 : Math.round(pausedSeconds * 1000),
            isPaused && stoppedAt != null ? stoppedAt : 0,
            0,
            0);
        RideState.setPageWatching(getContext(), Boolean.TRUE.equals(call.getBoolean("isWatching", false)));
        Rides.apply(getContext(), kept -> RideMachine.told(kept, told));
        if (!RideState.RECORDING.equals(phase) && RideService.isRunning()) {
            // Only a ride recording keeps the service: one left running (restarted by Android after
            // the app was killed, say) would keep its foreground notification, which cancel() cannot
            // take away, showing a ride that is over.
            RideService.stop(getContext());
            RideNotification.postAgainSoon(getContext());
        }
        RideNotification.post(getContext());
        call.resolve();
    }

    /**
     * The contributor's Start, or Resume: the ride's service records `recordingId` from now on,
     * the app swiped away or not, until stopRecording.
     */
    @PluginMethod
    public void startRecording(PluginCall call) {
        String recordingId = call.getString("recordingId", "");
        if (recordingId == null || recordingId.isEmpty()) {
            call.reject("recordingId is required.");
            return;
        }
        long now = System.currentTimeMillis();
        Rides.apply(getContext(), ride -> RideMachine.start(ride, recordingId, now));
        call.resolve();
    }

    /** The ride's Pause, Finish or end: its service stops, and no more fixes come. */
    @PluginMethod
    public void stopRecording(PluginCall call) {
        RideService.stop(getContext());
        // The service's leaving the foreground takes its notification, after the page's own
        // setState may have posted it: posted again, as the receiver's Pause does.
        RideNotification.postAgainSoon(getContext());
        call.resolve();
    }

    /**
     * The ride the service is recording now, or null: the page asks as it opens, so a ride that
     * went on recording while the app was gone (swiped from Recents, or its page rebuilt) opens
     * recording, not cut off.
     */
    @PluginMethod
    public void recordingNow(PluginCall call) {
        Ride ride = Rides.now(getContext());
        boolean isRecording = RideService.isRunning() && ride.isRecordingLive() && !ride.recordingId.isEmpty();
        JSObject result = new JSObject();
        result.put("recordingId", isRecording ? ride.recordingId : JSObject.NULL);
        call.resolve(result);
    }

    /** The ride's diagnostics log (RideDiagnostics), for the contributor to read or share. */
    @PluginMethod
    public void diagnostics(PluginCall call) {
        JSObject result = new JSObject();
        result.put("text", RideDiagnostics.read(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void events(PluginCall call) {
        JSObject result = new JSObject();
        try {
            // Parsed from the events' JSON. Not JSArray.from, which takes an array, not a string:
            // given one it answers null, and the page then had no taps to apply.
            result.put("events", new JSArray(RideState.events(getContext()).toString()));
        } catch (Exception unreadable) {
            result.put("events", new JSArray());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void dropEvents(PluginCall call) {
        Long time = call.getLong("time");
        if (time == null) {
            call.reject("time is required.");
            return;
        }
        RideState.dropEvents(getContext(), time);
        call.resolve();
    }
}
