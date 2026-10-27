package ph.parapo.contributor;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.Locale;

/**
 * What a recording needs from Android that the page asks for in its own words first: the three
 * permissions, one alias at a time (Capacitor's checkPermissions and
 * requestPermissions({ permissions: [alias] }) do the work; this class declares the aliases), and
 * the phone's Settings. Android asks for "all the time" location (backgroundLocation) apart from
 * the other location permissions, and only after those are granted.
 */
@CapacitorPlugin(
    name = "NativePermissions",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "backgroundLocation",
            strings = { android.Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        ),
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class NativePermissionsPlugin extends Plugin {
    /**
     * The phone's maker (lower case) and Android version, which decide which permissions exist and
     * whose battery steps apply, and whether Android already lets ParaPo run unrestricted.
     */
    @PluginMethod
    public void deviceInfo(PluginCall call) {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject state = new JSObject();
        state.put("sdk", Build.VERSION.SDK_INT);
        state.put("manufacturer", Build.MANUFACTURER.toLowerCase(Locale.ROOT));
        state.put("isUnrestricted", power.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        call.resolve(state);
    }

    /** ParaPo's page in the phone's Settings, where Permissions and Battery are one tap away. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.fromParts("package", getContext().getPackageName(), null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
