package ph.para.contributor;

import android.content.Context;
import android.content.SharedPreferences;

import ph.para.contributor.ride.Ride;
import ph.para.contributor.ride.RideCodec;

/**
 * Where the phone keeps the ride (ride.Ride) between processes: SharedPreferences, written at once.
 * Rides changes it, through RideMachine's rules; nothing else writes the ride but the page's own
 * setState while it is awake.

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
            // The summary and the taps an older app kept: gone, so they are never read over the history.
            .remove("mode").remove("pausedMs").remove("pausedSince").remove("events")
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
}
