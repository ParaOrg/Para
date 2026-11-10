/**
 * Phone makers known to stop an app soon after it leaves the screen, as Android reports them
 * (Build.MANUFACTURER): their own Autostart or battery switch has to let Para keep recording.
 */
const MAKERS = [
  'xiaomi',
  'redmi',
  'poco',
  'oppo',
  'realme',
  'vivo',
  'iqoo',
  'huawei',
  'honor',
  'oneplus',
  'samsung',
] as const;

/** Whether the phone's maker is one that stops background apps, by any casing. */
export function stopsBackgroundApps(manufacturer: string): boolean {
  const name = manufacturer.trim().toLowerCase();
  return MAKERS.some((maker) => maker === name);
}
