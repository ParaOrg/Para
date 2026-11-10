/**
 * The makers whose phones stop an app soon after it leaves the screen, grouped by the settings they
 * share: each group's own Autostart or battery switch has to let Para keep recording.
 */
export type KeepRecordingBrand = 'xiaomi' | 'oppo' | 'vivo' | 'transsion' | 'samsung' | 'huawei';

/** Each maker as Android names it (Build.MANUFACTURER, its first word, lower case), by group. */
const BRAND_OF_MAKER: Record<string, KeepRecordingBrand> = {
  xiaomi: 'xiaomi',
  redmi: 'xiaomi',
  poco: 'xiaomi',
  oppo: 'oppo',
  realme: 'oppo',
  oneplus: 'oppo',
  vivo: 'vivo',
  iqoo: 'vivo',
  infinix: 'transsion',
  tecno: 'transsion',
  samsung: 'samsung',
  huawei: 'huawei',
  honor: 'huawei',
};

/**
 * The group of the phone's maker, by any casing; null for a maker not known to stop background
 * apps. Some makers give their company's whole name ("INFINIX MOBILITY LIMITED"): its first word
 * names it.
 */
export function brandOf(manufacturer: string): KeepRecordingBrand | null {
  const name = manufacturer.trim().toLowerCase().split(/\s+/)[0] ?? '';
  return Object.hasOwn(BRAND_OF_MAKER, name) ? BRAND_OF_MAKER[name] : null;
}

/** Whether the phone's maker is one that stops background apps, by any casing. */
export function stopsBackgroundApps(manufacturer: string): boolean {
  return brandOf(manufacturer) !== null;
}
