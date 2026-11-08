package ph.para.contributor;

import android.location.Location;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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

    @PluginMethod
    public void setState(PluginCall call) {
        RideState state = RideState.read(getContext());
        state.recordingId = call.getString("recordingId", "");
        state.isPageWatching = Boolean.TRUE.equals(call.getBoolean("isWatching", false));
        state.phase = call.getString("phase", RideState.NONE);
        state.mode = call.getString("mode", "walk");
        Long startedAt = call.getLong("startedAt");
        state.startedAt = startedAt == null ? 0 : startedAt;
        Double pausedSeconds = call.getDouble("pausedSeconds");
        state.pausedMs = pausedSeconds == null ? 0 : Math.round(pausedSeconds * 1000);
        Long stoppedAt = call.getLong("stoppedAt");
        state.pausedSince = RideState.PAUSED.equals(state.phase) && stoppedAt != null ? stoppedAt : 0;
        state.finishedAt = 0;
        state.write(getContext());
        if (!RideState.RECORDING.equals(state.phase) && RideService.isRunning()) {
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
        RideService.start(getContext(), recordingId);
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
     * recording, not cut off. Recording is the service running with the ride's state at RECORDING.
     */
    @PluginMethod
    public void recordingNow(PluginCall call) {
        RideState state = RideState.read(getContext());
        boolean isRecording = RideService.isRunning()
            && RideState.RECORDING.equals(state.phase)
            && state.recordingId != null
            && !state.recordingId.isEmpty();
        JSObject result = new JSObject();
        result.put("recordingId", isRecording ? state.recordingId : JSObject.NULL);
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
