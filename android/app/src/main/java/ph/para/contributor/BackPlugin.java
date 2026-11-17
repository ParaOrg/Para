package ph.para.contributor;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The phone's Back, handed to the page. The page closes what shows on top (a question, a card, a
 * sheet, a screen) and calls leave() when nothing is left over Record or the start gate. Leaving is
 * Home's: the task goes to the back and the activity stays, so a ride under way keeps recording
 * (RideService is not touched) and the page is as it was on return. Without this, Back ended the
 * activity from any screen.
 */
@CapacitorPlugin(name = "Back")
public class BackPlugin extends Plugin {
    private final OnBackPressedCallback callback =
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    // Before the page listens (still loading), Back leaves as Home does.
                    if (hasListeners("back")) notifyListeners("back", new JSObject());
                    else leaveNow();
                }
            };

    @Override
    public void load() {
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), callback);
    }

    @PluginMethod
    public void leave(PluginCall call) {
        getActivity().runOnUiThread(this::leaveNow);
        call.resolve();
    }

    private void leaveNow() {
        getActivity().moveTaskToBack(true);
    }
}
