import { useEffect, useState } from 'react';

import { noop } from '@/shared/utils/noop';

import { apart, compassHeading } from './locator-motion';

/** A compass reading moves the camera only past this: the sensor shivers by a degree or two. */
const TURN_DEG = 3;

/**
 * The phone's compass heading while `on`, or null — no sensor, a laptop,
 * permission refused. Readings closer than TURN_DEG to the last are left
 * out, so the camera turning with it is not restarted sixty times a second.
 */
export function useCompass(on: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    if (!on || typeof window === 'undefined') return;
    const absolute = 'ondeviceorientationabsolute' in window;
    const type = absolute ? 'deviceorientationabsolute' : 'deviceorientation';
    const read = (e: Event) => {
      const o = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const h = compassHeading(
        {
          alpha: o.alpha,
          absolute: absolute || o.absolute,
          webkitCompassHeading: o.webkitCompassHeading,
        },
        screen.orientation?.angle ?? 0,
      );
      if (h !== null) setHeading((was) => (was === null || apart(was, h) >= TURN_DEG ? h : was));
    };
    window.addEventListener(type, read);
    return () => {
      window.removeEventListener(type, read);
      setHeading(null);
    };
  }, [on]);
  return heading;
}

/** Safari asks before it gives the compass, and only inside a tap. */
export function askForCompass() {
  const ask = (
    globalThis.DeviceOrientationEvent as unknown as
      { requestPermission?: () => Promise<string> } | undefined
  )?.requestPermission;
  if (ask) void ask().catch(noop);
}
