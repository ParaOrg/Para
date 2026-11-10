package ph.para.contributor;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import ph.para.contributor.ride.Ride;
import ph.para.contributor.ride.RideCodec;

/**
 * Where the phone keeps the ride (ride.Ride) between processes: SharedPreferences, written at once.
 * Rides changes it, through RideMachine's rules; nothing else writes the ride but the page's own
 * setState while it is awake.
 *
 * It also keeps the taps made on the notification that the page has not taken yet. The page applies
 * them, in order, when it wakes (native/ride-notice.ts), and drops them.
 */
final class RideState {
    static final String NONE = "none";
    static final String RECORDING = "recording";
    static final String PAUSED = "paused";
    static final String FINISHED = "finished";

    private static final String PREFERENCES = "para.ride";

    private RideState() {}

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    /** The ride kept, or Ride.NO_RIDE. A ride kept by an older app is read from its summary. */
    static synchronized Ride ride(Context context) {
        SharedPreferences stored = preferences(context);
        String recordingId = stored.getString("recordingId", "");
        String phase = stored.getString("phase", NONE);
        if (recordingId.isEmpty() || NONE.equals(phase)) return Ride.NO_RIDE;
        long startedAt = stored.getLong("startedAt", 0);
        long finishedAt = stored.getLong("finishedAt", 0);
        long lastFixAt = stored.getLong("lastFixAt", 0);
        if (!stored.contains("modes")) {
            return RideCodec.fromSummary(recordingId, phase, stored.getString("mode", Ride.WALK), startedAt,
                stored.getLong("pausedMs", 0), stored.getLong("pausedSince", 0), finishedAt, lastFixAt);
        }
        return new Ride(recordingId, phase, stored.getString("trouble", Ride.TROUBLE_NONE), startedAt,
            finishedAt, lastFixAt, RideCodec.modesOf(stored.getString("modes", "")),
            RideCodec.gapsOf(stored.getString("gaps", "")));
    }

    /** Keeps `ride`; commit(), not apply(): the process may be killed right after a tap. */
    static synchronized void keep(Context context, Ride ride) {
        preferences(context).edit()
            .putString("recordingId", ride.recordingId)
            .putString("phase", ride.phase)
            .putString("trouble", ride.trouble)
            .putLong("startedAt", ride.startedAt)
            .putLong("finishedAt", ride.finishedAt)
            .putLong("lastFixAt", ride.lastFixAt)
            .putString("modes", RideCodec.modesText(ride.modes))
            .putString("gaps", RideCodec.gapsText(ride.gaps))
            // The summary an older app kept: gone, so it is never read over the history.
            .remove("mode").remove("pausedMs").remove("pausedSince")
            .commit();
    }

    /**
     * The page's watch is on (it holds the ride as recording): a Pause tapped on the card is then
     * one it will apply, and its Resume can be done there too (RideNotification.canResumeHere).
     */
    static synchronized boolean isPageWatching(Context context) {
        return preferences(context).getBoolean("isPageWatching", false);
    }

    static synchronized void setPageWatching(Context context, boolean isWatching) {
        preferences(context).edit().putBoolean("isPageWatching", isWatching).commit();
    }

    /** Adds a tap made on the notification, for the page to apply when it wakes. */
    static synchronized void addEvent(Context context, String kind, long time, String to) {
        try {
            JSONArray events = events(context);
            JSONObject event = new JSONObject().put("kind", kind).put("time", time);
            if (to != null) event.put("to", to);
            event.put("recordingId", ride(context).recordingId);
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
