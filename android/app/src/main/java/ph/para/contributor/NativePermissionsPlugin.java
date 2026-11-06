package ph.para.contributor;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;

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
    private static final String TAG = "ParaLocation";

    /** Google's "Turn on location?" dialog, and the call waiting for its answer. */
    private ActivityResultLauncher<IntentSenderRequest> locationDialog;
    private PluginCall waitingForDialog = null;

    @Override
    public void load() {
        // Registered as the activity is made, as Android requires: before it is started.
        locationDialog = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> answerDialog(result.getResultCode() == Activity.RESULT_OK)
        );
    }

    /**
     * Whether the phone's location is on, for the page's locate button: "on", or "off" once the
     * person has said no to Google's "Turn on location?" dialog, or when it cannot be shown. A tap
     * with location on answers at once; with it off the dialog shows, and its answer is the
     * answer. "unknown" without Google Play services, for the page to go on as it would on the web.
     */
    @PluginMethod
    public void checkLocationOn(PluginCall call) {
        LocationSettingsRequest request = new LocationSettingsRequest.Builder()
            .addLocationRequest(new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000).build())
            .setAlwaysShow(true)
            .build();
        try {
            LocationServices.getSettingsClient(getActivity())
                .checkLocationSettings(request)
                .addOnSuccessListener(ignored -> answer(call, "on"))
                .addOnFailureListener(error -> {
                    if (!(error instanceof ResolvableApiException)) {
                        answer(call, "off");
                        return;
                    }
                    if (waitingForDialog != null) {
                        // A second tap while the dialog is up: the first one's answer is for both.
                        answer(call, "off");
                        return;
                    }
                    try {
                        waitingForDialog = call;
                        locationDialog.launch(new IntentSenderRequest.Builder(
                            ((ResolvableApiException) error).getResolution().getIntentSender()).build());
                    } catch (RuntimeException couldNotShow) {
                        Log.w(TAG, "The Turn on location dialog could not be shown.", couldNotShow);
                        waitingForDialog = null;
                        answer(call, "off");
                    }
                });
        } catch (RuntimeException noPlayServices) {
            Log.w(TAG, "Location settings could not be read.", noPlayServices);
            answer(call, "unknown");
        }
    }

    private void answerDialog(boolean isTurnedOn) {
        PluginCall call = waitingForDialog;
        waitingForDialog = null;
        if (call != null) answer(call, isTurnedOn ? "on" : "off");
    }

    private static void answer(PluginCall call, String location) {
        JSObject result = new JSObject();
        result.put("location", location);
        call.resolve(result);
    }
    /**
     * The phone's maker (lower case) and Android version, which decide which permissions exist and
     * whose battery steps apply, and whether Android already lets Para run unrestricted.
     */
    @PluginMethod
    public void deviceInfo(PluginCall call) {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject state = new JSObject();
        state.put("sdk", Build.VERSION.SDK_INT);
        state.put("manufacturer", Build.MANUFACTURER.toLowerCase(Locale.ROOT));
        state.put("isUnrestricted", power.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        LocationManager location = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        state.put("isLocationOn", location != null && LocationManagerCompat.isLocationEnabled(location));
        call.resolve(state);
    }

    /** The phone's Location settings, where its switch is; Para's own page if a phone has none. */
    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (android.content.ActivityNotFoundException none) {
            openAppSettings(call);
            return;
        }
        call.resolve();
    }

    /** Para's page in the phone's Settings, where Permissions and Battery are one tap away. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.fromParts("package", getContext().getPackageName(), null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
