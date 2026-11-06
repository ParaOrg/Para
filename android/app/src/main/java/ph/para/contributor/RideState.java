package ph.para.contributor;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The ride as the notification shows it, and the taps made on the notification that the page has
 * not taken yet. Kept on disk (SharedPreferences, written at once), so a tap made while the page is
 * frozen, or the app's process is gone, is there for the page when it wakes.
 *
 * While the page is awake it is the truth, and tells this (RidePlugin.setState). While it sleeps,
 * a tap on the notification changes this and adds an event; the page applies the events, in order,
 * when it wakes (native/ride-notice.ts), and drops them.
 */
final class RideState {
    static final String NONE = "none";
    static final String RECORDING = "recording";
    static final String PAUSED = "paused";
    static final String FINISHED = "finished";

    private static final String PREFERENCES = "para.ride";

    String recordingId = "";
    /**
     * The page's watch is on (it holds the ride as recording): a Pause tapped here is then one it
     * will apply, and its Resume can be done here too (RideNotification.canResumeHere).
     */
    boolean isPageWatching = false;
    String phase = NONE;
    /** "walk" (Lakad) or "ride" (Sakay). */
    String mode = "walk";
    long startedAt = 0;
    /** Time paused before the pause now running, if any. */
    long pausedMs = 0;
    /** When the pause now running began; 0 while not paused. */
    long pausedSince = 0;
    long finishedAt = 0;

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    static synchronized RideState read(Context context) {
        SharedPreferences stored = preferences(context);
        RideState state = new RideState();
        state.recordingId = stored.getString("recordingId", "");
        state.isPageWatching = stored.getBoolean("isPageWatching", false);
        state.phase = stored.getString("phase", NONE);
        state.mode = stored.getString("mode", "walk");
        state.startedAt = stored.getLong("startedAt", 0);
        state.pausedMs = stored.getLong("pausedMs", 0);
        state.pausedSince = stored.getLong("pausedSince", 0);
        state.finishedAt = stored.getLong("finishedAt", 0);
        return state;
    }

    /** Written under the same lock as read, so a read and its write are not split by another's. */
    void write(Context context) {
        synchronized (RideState.class) {
            writeLocked(context);
        }
    }

    private void writeLocked(Context context) {
        // commit(), not apply(): the process may be killed right after a tap.
        preferences(context).edit()
            .putString("recordingId", recordingId)
            .putBoolean("isPageWatching", isPageWatching)
            .putString("phase", phase)
            .putString("mode", mode)
            .putLong("startedAt", startedAt)
            .putLong("pausedMs", pausedMs)
            .putLong("pausedSince", pausedSince)
            .putLong("finishedAt", finishedAt)
            .commit();
    }

    /** Time recorded, pauses left out, as the clock reads `now`: the card's Time. */
    long elapsedMs(long now) {
        long end = now;
        // Stopped: the clock stands where the ride stopped, at the pause or at Finish.
        if (pausedSince > 0) end = pausedSince;
        else if (FINISHED.equals(phase) && finishedAt > 0) end = finishedAt;
        return Math.max(0, end - startedAt - pausedMs);
    }

    /** Adds a tap made on the notification, for the page to apply when it wakes. */
    static synchronized void addEvent(Context context, String kind, long time, String to) {
        try {
            JSONArray events = events(context);
            JSONObject event = new JSONObject().put("kind", kind).put("time", time);
            if (to != null) event.put("to", to);
            event.put("recordingId", read(context).recordingId);
            events.put(event);
            preferences(context).edit().putString("events", events.toString()).commit();
        } catch (JSONException ignored) {
            // Built from plain values: it cannot fail.
        }
    }

    /** The taps the page has not taken yet, oldest first. */
    static synchronized JSONArray events(Context context) {
        try {
            return new JSONArray(preferences(context).getString("events", "[]"));
        } catch (JSONException unreadable) {
            return new JSONArray();
        }
    }

    /** Drops the taps up to `time`: the page has applied them. */
    static synchronized void dropEvents(Context context, long time) {
        JSONArray kept = new JSONArray();
        JSONArray events = events(context);
        for (int index = 0; index < events.length(); index++) {
            JSONObject event = events.optJSONObject(index);
            if (event != null && event.optLong("time") > time) kept.put(event);
        }
        preferences(context).edit().putString("events", kept.toString()).commit();
    }
}
