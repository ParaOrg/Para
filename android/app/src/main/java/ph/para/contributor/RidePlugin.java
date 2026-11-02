package ph.para.contributor;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The page's way to the ride's notification (native/ride-notice.ts). While awake, the page says
 * where the ride is (setState) and the notification follows it. It takes the taps made on the
 * notification (events), applies them, and drops them (dropEvents); a tap while it is awake
 * reaches it at once ("rideEvent").
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
        state.watcherId = call.getString("watcherId", state.watcherId);
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
        RideNotification.post(getContext());
        call.resolve();
    }

    @PluginMethod
    public void events(PluginCall call) {
        JSObject result = new JSObject();
        try {
            result.put("events", JSArray.from(RideState.events(getContext()).toString()));
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
