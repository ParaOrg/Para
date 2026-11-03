import { useId, type CSSProperties } from 'react';

import './locator.css';
import { eyesDeg, gazeOffset } from './dot-gaze';
import type { Face, Mood } from './locator-mood';

/** Where the beam points as drawn: due south, so it is turned by the heading less this. */
export const BEAM_DRAWN_DEG = 180;

/** The dot's own size, 24 px in 4 px of white: an accuracy circle smaller is hidden under it, so not drawn. */
const DOT_PX = 32;
/** A circle past this is the whole screen anyway, and a DOM element that big costs. */
const HALO_MAX_PX = 1600;

/**
 * The circle as drawn: the fix's metres on the ground, so it shrinks as the
 * map zooms out and is gone once the dot covers it, as Google Maps' is;
 * never past HALO_MAX_PX. 0: none.
 */
export const haloFor = (px: number, scale = 1) =>
  px < DOT_PX * scale ? 0 : Math.round(Math.min(HALO_MAX_PX, px));

interface Props {
  /** The accuracy circle's width: the fix's 68 % radius, twice, in pixels. */
  haloPx: number;
  /** Which way the beam points, degrees clockwise from the overlay's up — north, on the map. Null: no beam. */
  beamDeg: number | null;
  /** The dot and beam's size against Figma's, 1 at street level (indicatorScale). */
  scale?: number;
  /** How the dot feels, and the face it wears for it (locatorMood); neutral's glance by default. */
  mood?: Mood;
  face?: Face;
  /** Changed by each tap on the button: the dot is drawn afresh, so its reaction plays again. */
  beat?: number;
  /** The dot is a button, to be poked: LocatorOnMap hears the tap (marker-tap.ts). */
  pokeable?: boolean;
  /** Which way its eyes gaze, degrees clockwise from the overlay's up, at what was just picked (dot-gaze.ts). Null: they look the beam's way, or wander with no beam. */
  gazeDeg?: number | null;
}

/**
 * LocatorIndicatorOverlay (Figma 3870:5247): the commuter on the map
 * — a 24 px Brand/surface dot in white, lifted by LocatorDotShadow,
 * breathing, its eyes looking the way the phone faces, or glancing about
 * with no heading (locator.css); a beam the way they face fading out from it; and the circle the fix is good to, in
 * Map/LocatorIndicatorOverlay/surface with its border's hairline. The circle
 * matters: GPS in Metro Manila is often 20–50 m out, and a dot alone would
 * claim a certainty the phone does not have. Figma's is 240 across; here the
 * circle is the fix's metres, the beam as drawn.
 */
export function LocatorIndicatorOverlay({
  haloPx,
  beamDeg,
  scale = 1,
  mood = 'neutral',
  face = 'glance',
  beat = 0,
  pokeable = false,
  gazeDeg = null,
}: Props) {
  const lookDeg = eyesDeg(gazeDeg, beamDeg);
  const look = lookDeg === null ? null : gazeOffset(lookDeg);
  const Dot = pokeable ? 'button' : 'div';
  const halo = haloFor(haloPx, scale);
  const gradient = useId();
  return (
    <div className="pointer-events-none relative size-0">
      {halo > 0 && (
        <div
          data-part="circle"
          className="absolute top-1/2 left-1/2 -translate-1/2 rounded-full border-[0.6px] border-map-locator-indicator-overlay-border/75 bg-map-locator-indicator-overlay-surface/15"
          style={{ width: halo, height: halo }}
        />
      )}
      {/* The dot and its beam, smaller zoomed out; the circle is metres, and keeps its own size. */}
      <div className="absolute inset-0" style={{ scale }}>
        {beamDeg !== null && (
          // From the dot's centre, drawn pointing south and turned to the
          // heading, in the border's blue as Figma's is. Figma's (3876:6051)
          // leans 2.7 px to one side; here it is made even, then cut to 7/10
          // of its length at the same spread: 59 long, 70 across at its end.
          <div
            className="absolute top-1/2 left-1/2 size-0 text-map-locator-indicator-overlay-border"
            style={{ rotate: `${beamDeg - BEAM_DRAWN_DEG}deg` }}
          >
            <svg
              viewBox="0 0 86 59"
              className="absolute top-0 -left-[43px] h-[59px] w-[86px]"
              aria-hidden
            >
              <defs>
                <linearGradient
                  id={gradient}
                  x1="43"
                  y1="0"
                  x2="43"
                  y2="59"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="currentColor" stopOpacity="0.8" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M27 0H59L78 59H8Z" fill={`url(#${gradient})`} />
            </svg>
          </div>
        )}
        {/* A button when it can be poked: the only part of the overlay that takes a tap. */}
        <Dot
          key={beat}
          {...(pokeable ? { type: 'button' as const, 'aria-label': 'You are here' } : {})}
          data-mood={mood}
          data-face={face}
          data-gaze={gazeDeg ?? undefined}
          data-look={lookDeg ?? undefined}
          style={
            look
              ? ({ '--gaze-x': `${look.x}px`, '--gaze-y': `${look.y}px` } as CSSProperties)
              : undefined
          }
          className={
            'locator-dot absolute top-1/2 left-1/2 -translate-1/2 rounded-full bg-surface p-1 shadow-locator-dot-shadow' +
            (pokeable
              ? ' pointer-events-auto cursor-pointer [-webkit-tap-highlight-color:transparent]'
              : '')
          }
        >
          <div className="relative size-6 overflow-clip rounded-full bg-brand-surface">
            {/* Its eyes (3878:6071, 3878:6072): where they look moves the outer group (data-look),
                and every face places them within it (locator.css). */}
            <div aria-hidden className="locator-look absolute inset-0">
              <div className="locator-eyes absolute inset-0">
                <span className="locator-eye absolute top-[6.33px] left-[10.48px] h-1.5 w-1 rounded-full bg-surface" />
                <span className="locator-eye absolute top-[6.33px] left-[17.43px] h-1.5 w-1 rounded-full bg-surface" />
              </div>
            </div>
          </div>
        </Dot>
      </div>
    </div>
  );
}
