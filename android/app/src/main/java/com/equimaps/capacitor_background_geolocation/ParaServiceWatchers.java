package com.equimaps.capacitor_background_geolocation;

import android.app.Notification;
import android.os.IBinder;

/**
 * Para's way into @capacitor-community/background-geolocation's location service, for the
 * notification's Pause, Resume and Finish while the page sleeps (ph.para.contributor
 * RideActionReceiver). The service's binder is public, but the methods that start and stop a
 * watcher are package-private, so this sits in the plugin's own package inside the app.
 *
 * It depends on the plugin's internals: that is why package.json pins the plugin to exactly
 * 1.3.1. A change to those methods fails this file's build; a change in what they do fails the
 * notification check of the emulator ride (scripts/apk/emulator-notification.sh), which looks for
 * the service in the foreground, or not, after each tap. Check both before moving the pin.
 */
public final class ParaServiceWatchers {
    private ParaServiceWatchers() {}

    /** Stops the watcher: no more fixes, and the service leaves the foreground once none is left. */
    public static void remove(IBinder binder, String watcherId) {
        ((BackgroundGeolocationService.LocalBinder) binder).removeWatcher(watcherId);
    }

    /**
     * Starts the watcher again under the page's own id, so its fixes still reach the page's
     * callback; `notification` is the one the service shows in the foreground.
     */
    public static void add(IBinder binder, String watcherId, Notification notification) {
        ((BackgroundGeolocationService.LocalBinder) binder).addWatcher(watcherId, notification, 0f);
    }

    /** The service the page binds to, for binding to it from a notification's tap. */
    public static Class<?> serviceClass() {
        return BackgroundGeolocationService.class;
    }
}
