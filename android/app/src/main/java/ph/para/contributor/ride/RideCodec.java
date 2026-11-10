package ph.para.contributor.ride;

import java.util.ArrayList;
import java.util.List;

/**
 * A ride's history as text, for where the phone keeps the ride (RideState): the mode switches as
 * "time:mode" and the gaps as "from:to:reason", joined by ",". Plain Java (not org.json, which the
 * JVM's unit tests do not have), so its round trip is tested. A part that cannot be read is skipped:
 * a ride with less history is better than none.
 */
public final class RideCodec {
    private RideCodec() {}

    public static String modesText(List<Ride.ModeSwitch> modes) {
        StringBuilder text = new StringBuilder();
        for (Ride.ModeSwitch mode : modes) {
            if (text.length() > 0) text.append(',');
            text.append(mode.time).append(':').append(mode.to);
        }
        return text.toString();
    }

    public static List<Ride.ModeSwitch> modesOf(String text) {
        List<Ride.ModeSwitch> modes = new ArrayList<>();
        for (String part : parts(text)) {
            String[] fields = part.split(":");
            if (fields.length != 2 || !isMode(fields[1])) continue;
            try {
                modes.add(new Ride.ModeSwitch(Long.parseLong(fields[0]), fields[1]));
            } catch (NumberFormatException unreadable) {
                // Skipped: see the class comment.
            }
        }
        return modes;
    }

    public static String gapsText(List<Ride.Gap> gaps) {
        StringBuilder text = new StringBuilder();
        for (Ride.Gap gap : gaps) {
            if (text.length() > 0) text.append(',');
            text.append(gap.from).append(':').append(gap.to).append(':').append(gap.reason);
        }
        return text.toString();
    }

    public static List<Ride.Gap> gapsOf(String text) {
        List<Ride.Gap> gaps = new ArrayList<>();
        for (String part : parts(text)) {
            String[] fields = part.split(":");
            if (fields.length != 3) continue;
            try {
                gaps.add(new Ride.Gap(Long.parseLong(fields[0]), Long.parseLong(fields[1]), fields[2]));
            } catch (NumberFormatException unreadable) {
                // Skipped: see the class comment.
            }
        }
        return gaps;
    }

    /**
     * The history of a ride kept before rides had one (an app updated mid-ride): its mode now from
     * its start, its paused time as one gap ending at its start, and the pause running, if any.
     */
    public static Ride fromSummary(String recordingId, String phase, String mode, long startedAt,
                                   long pausedMs, long pausedSince, long finishedAt, long lastFixAt) {
        List<Ride.ModeSwitch> modes = new ArrayList<>();
        modes.add(new Ride.ModeSwitch(startedAt, isMode(mode) ? mode : Ride.WALK));
        List<Ride.Gap> gaps = new ArrayList<>();
        if (pausedMs > 0) gaps.add(new Ride.Gap(startedAt, startedAt + pausedMs, Ride.GAP_PAUSED));
        if (pausedSince > 0) gaps.add(new Ride.Gap(pausedSince, 0, Ride.GAP_PAUSED));
        return new Ride(recordingId, phase, Ride.TROUBLE_NONE, startedAt, finishedAt,
            Math.max(lastFixAt, startedAt), modes, gaps);
    }

    private static boolean isMode(String mode) {
        return Ride.WALK.equals(mode) || Ride.RIDE.equals(mode);
    }

    private static String[] parts(String text) {
        return text == null || text.isEmpty() ? new String[0] : text.split(",");
    }
}
