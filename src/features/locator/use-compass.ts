import { useEffect, useState } from 'react';

import { noop } from '@/shared/utils/noop';

import { apart, compassHeading } from './locator-motion';

/** A compass reading moves the camera only past this: the sensor shivers by a degree or two. */
const TURN_DEG = 3;

// TODO: treat ~5 s with no reading as no heading, so a sensor that stops hides the beam and lets
// the eyes wander; held back until it is known that every browser keeps sending while the phone
// is still, or a phone held still would lose its heading.
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
      if (!(e instanceof DeviceOrientationEvent)) return;
      // Safari's own field, not in the DOM's types.
      const webkitCompassHeading =
        'webkitCompassHeading' in e && typeof e.webkitCompassHeading === 'number'
          ? e.webkitCompassHeading
          : undefined;
      const h = compassHeading(
        { alpha: e.alpha, absolute: absolute || e.absolute, webkitCompassHeading },
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
  // Safari's static requestPermission, not in the DOM's types; absent elsewhere.
  const event: unknown = globalThis.DeviceOrientationEvent;
  if (typeof event !== 'function' || !('requestPermission' in event)) return;
  const ask = event.requestPermission;
  if (typeof ask === 'function') void Promise.resolve(ask()).catch(noop);
}
