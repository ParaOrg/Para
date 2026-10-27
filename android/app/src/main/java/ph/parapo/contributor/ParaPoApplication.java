package ph.parapo.contributor;

import android.app.Application;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.Location;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;

/**
 * Writes every fix the background-geolocation plugin's service reports to the fix log, in the
 * service's own process and whether or not the page is awake. The service announces each fix on
 * this app-wide broadcast (the action is its package name plus ".broadcast"); the plugin's own
 * receiver hands the same fix to the page, which may be frozen by then.
 */
public class ParaPoApplication extends Application {
    private static final String LOCATION_ACTION =
        "com.equimaps.capacitor_background_geolocation.broadcast";

    @Override
    public void onCreate() {
        super.onCreate();
        LocalBroadcastManager.getInstance(this).registerReceiver(
            new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    Location location = intent.getParcelableExtra("location");
                    if (location != null) FixLog.append(context, location);
                }
            },
            new IntentFilter(LOCATION_ACTION)
        );
    }
}
