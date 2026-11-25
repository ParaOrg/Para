import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef } from 'react';
import { expect } from 'storybook/test';

import { EXTRA_MIN_ZOOM } from './establishment-extra';
import { markerImage } from './establishment-images';
import {
  ESTABLISHMENT_KINDS,
  EXTRA_FAMILY,
  EXTRA_KIND_GLYPH,
  TERMINAL_FAMILY,
  TERMINAL_GLYPH,
  TIER_ZOOM,
  type EstablishmentGlyph,
} from './establishment-kinds';

/** Every glyph once, in the kinds' order: what the map can draw. */
const GLYPHS = [...new Set(ESTABLISHMENT_KINDS.map((kind) => kind.glyph))];
/** The places the basemap's tiles lack, from Para's own files (establishment-extra.ts). */
const EXTRAS = Object.entries(EXTRA_KIND_GLYPH);

interface MarkerProps {
  glyph: EstablishmentGlyph;
}

/** One marker as the map gets it: the same image, drawn on a canvas at twice its size. */
function Marker({ glyph }: MarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const image = markerImage(glyph);
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext('2d')?.putImageData(image, 0, 0);
  }, [glyph]);
  return <canvas ref={canvasRef} className="size-5" aria-hidden="true" />;
}

/**
 * The establishments' legend: each kind's marker, its family and from which zoom it shows. A
 * placeholder after Apple Maps' pattern until the owner's Figma; the colours are the
 * Map/Establishment/… tokens, the glyphs Maki's and Temaki's (CC0).
 */
function EstablishmentLegend() {
  return (
    <ul className="grid gap-2 p-4 text-sm text-content-primary">
      {GLYPHS.map((glyph) => {
        const kind = ESTABLISHMENT_KINDS.find((k) => k.glyph === glyph);
        if (!kind) return null;
        const { marker, name } = TIER_ZOOM[kind.tier];
        return (
          <li key={glyph} className="flex items-center gap-3">
            <Marker glyph={glyph} />
            <span>
              {glyph}: {kind.family}, the marker from zoom {marker}, its name from {name}
            </span>
          </li>
        );
      })}
      {EXTRAS.map(([kind, glyph]) => (
        <li key={glyph} className="flex items-center gap-3">
          <Marker glyph={glyph} />
          <span>
            {glyph}: {kind}, {EXTRA_FAMILY}, from Para&apos;s own files, the marker from zoom{' '}
            {EXTRA_MIN_ZOOM}, its name from {EXTRA_MIN_ZOOM + 1}
          </span>
        </li>
      ))}
      <li className="flex items-center gap-3">
        <Marker glyph={TERMINAL_GLYPH} />
        <span>
          {TERMINAL_GLYPH}: OpenStreetMap&apos;s jeepney, UV and bus terminals, {TERMINAL_FAMILY}, a
          shade smaller, the marker from zoom {TIER_ZOOM[2].marker}, its name from{' '}
          {TIER_ZOOM[2].name}
        </span>
      </li>
    </ul>
  );
}

const meta = {
  title: 'Features/Routes/EstablishmentMarkers',
  component: EstablishmentLegend,
} satisfies Meta<typeof EstablishmentLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Legend: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('li')).toHaveLength(
      GLYPHS.length + EXTRAS.length + 1,
    );
    await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(
      GLYPHS.length + EXTRAS.length + 1,
    );
  },
};
