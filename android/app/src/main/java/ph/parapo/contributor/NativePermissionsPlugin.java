package ph.parapo.contributor;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * Asks for the three permissions a recording needs, one alias at a time, so the app can show its
 * own plain-language reason before each system prompt. Capacitor's built-in checkPermissions and
 * requestPermissions({ permissions: [alias] }) do the work; this class only declares the aliases.
 * Android asks for "all the time" location (backgroundLocation) apart from the other location
 * permissions, and only after those are granted.
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
public class NativePermissionsPlugin extends Plugin {}
