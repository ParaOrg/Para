import { useQuery } from '@tanstack/react-query';

import { appUpdateKeys } from './app-update-keys';
import { updateOf, type AppUpdate } from './app-version';
import { fetchLatestRelease } from './fetch-latest-release';
import { appUpdateConfig } from '../api/app-update-env';
import { isNativeApp } from '../native-bridge/native-app';

interface AppUpdateState {
  update: AppUpdate;
  /** Where the newer APK is; empty while `update` is 'current'. */
  downloadUrl: string;
}

const NO_UPDATE: AppUpdateState = { update: 'current', downloadUrl: '' };

/**
 * Whether the installed app has a newer release, read once as the app starts. Only inside the
 * Android app, and only where the build knows its own version; offline, or on any error, it says
 * 'current' and the page shows nothing.
 */
export function useAppUpdate(): AppUpdateState {
  const config = appUpdateConfig;
  const { data } = useQuery({
    queryKey: appUpdateKeys.latest(config?.latestUrl ?? ''),
    queryFn: () => fetchLatestRelease(config?.latestUrl ?? ''),
    enabled: config !== null && isNativeApp(),
    retry: false,
    staleTime: Infinity,
  });
  if (!config || !data) return NO_UPDATE;
  return { update: updateOf(config.versionCode, data), downloadUrl: data.url };
}
