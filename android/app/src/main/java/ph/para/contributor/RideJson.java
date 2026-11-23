package ph.para.contributor;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import ph.para.contributor.ride.Ride;

/**
 * The ride as the page reads it (RidePlugin.now) and its history as the page tells it
 * (RidePlugin.setState): the keys native-bridge/native-contract.ts names. A part the page sent that
 * cannot be read is skipped.
 */
final class RideJson {
    private RideJson() {}

    static JSObject of(Ride ride) {
        JSObject json = new JSObject();
        json.put("recordingId", ride.recordingId);
        json.put("phase", ride.phase);
        json.put("trouble", ride.trouble);
        json.put("startedAt", ride.startedAt);
        json.put("finishedAt", ride.finishedAt);
        json.put("lastFixAt", ride.lastFixAt);
        JSArray modes = new JSArray();
        for (Ride.ModeSwitch mode : ride.modes) {
            JSObject switched = new JSObject();
            switched.put("time", mode.time);
            switched.put("to", mode.to);
            modes.put(switched);
        }
        json.put("modes", modes);
        JSArray gaps = new JSArray();
        for (Ride.Gap gap : ride.gaps) {
            JSObject lost = new JSObject();
            lost.put("from", gap.from);
            lost.put("to", gap.to);
            lost.put("reason", gap.reason);
            gaps.put(lost);
        }
        json.put("gaps", gaps);
        return json;
    }

    static List<Ride.ModeSwitch> modesOf(JSArray array) {
        List<Ride.ModeSwitch> modes = new ArrayList<>();
        if (array == null) return modes;
        for (int index = 0; index < array.length(); index++) {
            JSONObject mode = array.optJSONObject(index);
            if (mode == null) continue;
            String to = mode.optString("to");
            if (!Ride.WALK.equals(to) && !Ride.RIDE.equals(to)) continue;
            modes.add(new Ride.ModeSwitch(mode.optLong("time"), to));
        }
        return modes;
    }

    static List<Ride.Gap> gapsOf(JSArray array) {
        List<Ride.Gap> gaps = new ArrayList<>();
        if (array == null) return gaps;
        for (int index = 0; index < array.length(); index++) {
            JSONObject gap = array.optJSONObject(index);
            if (gap == null) continue;
            String reason = gap.optString("reason");
            if (!Ride.GAP_PAUSED.equals(reason) && !Ride.GAP_RESUMED.equals(reason)) continue;
            gaps.add(new Ride.Gap(gap.optLong("from"), gap.optLong("to"), reason));
        }
        return gaps;
    }
}
