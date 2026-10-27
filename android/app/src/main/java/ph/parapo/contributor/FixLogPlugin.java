package ph.parapo.contributor;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.IOException;

/** The page's way to the native fix log (FixLog): start it for a recording, read it, end it at a Stop, clear it. */
@CapacitorPlugin(name = "FixLog")
public class FixLogPlugin extends Plugin {
    @PluginMethod
    public void begin(PluginCall call) {
        String recordingId = call.getString("recordingId");
        if (recordingId == null || recordingId.isEmpty()) {
            call.reject("recordingId is required.");
            return;
        }
        try {
            FixLog.begin(getContext(), recordingId);
            call.resolve();
        } catch (IOException | JSONException error) {
            call.reject("The fix log could not be started.", error);
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        try {
            call.resolve(JSObject.fromJSONObject(FixLog.read(getContext())));
        } catch (IOException | JSONException error) {
            call.reject("The fix log could not be read.", error);
        }
    }

    @PluginMethod
    public void end(PluginCall call) {
        Long time = call.getLong("time");
        if (time == null) {
            call.reject("time is required.");
            return;
        }
        try {
            FixLog.end(getContext(), time);
            call.resolve();
        } catch (IOException | JSONException error) {
            call.reject("The fix log could not be ended.", error);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        FixLog.clear(getContext());
        call.resolve();
    }
}
