package ph.para.contributor.ride;

/**
 * Which card the ride's notification shows, from the ride and whether its service runs. The card
 * never says more than the phone knows: "Recording" only while the service records (invariant 1 in
 * docs/architecture/state-machines.md), and while recording with no location, why.
 */
public final class RideCard {
    public static final String NONE = "none";
    public static final String RECORDING = "recording";
    /** Recording, but no fix is coming: location off, or no fix for RideMachine.FIX_LIMIT_MS. */
    public static final String NO_LOCATION = "no-location";
    public static final String PAUSED = "paused";
    public static final String FINISHED = "finished";
    /** Cut off by a phone restart or an app update: open Para to carry on or save it. */
    public static final String STOPPED_BY_RESTART = "stopped-by-restart";

    /**
     * How long a posted card lives unless posted again (Notification.setTimeoutAfter). The service
     * posts at least each minute while it runs, so a card whose process died goes by itself.
     */
    public static final long TIMEOUT_MS = 2 * 60_000 + 30_000;

    private RideCard() {}

    public static String of(Ride ride, boolean isServiceRunning) {
        switch (ride.phase) {
            case Ride.PAUSED:
                return PAUSED;
            case Ride.FINISHED:
                return FINISHED;
            case Ride.RECORDING:
                if (Ride.TROUBLE_PHONE_RESTARTED.equals(ride.trouble)) return STOPPED_BY_RESTART;
                // Cut off by a kill, or the service not (yet) running: the page says it, not the card.
                if (ride.isCutOff() || !isServiceRunning) return NONE;
                boolean isLost = Ride.TROUBLE_LOCATION_OFF.equals(ride.trouble)
                    || Ride.TROUBLE_NO_FIX.equals(ride.trouble);
                return isLost ? NO_LOCATION : RECORDING;
            default:
                return NONE;
        }
    }

    /** Whether the card goes by itself when not posted again: only while recording, which ticks. */
    public static boolean expires(String card) {
        return RECORDING.equals(card) || NO_LOCATION.equals(card);
    }
}
