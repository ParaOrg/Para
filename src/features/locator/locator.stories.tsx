import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { BASEMAPS } from '@/features/routes/map/basemap';
import { BasemapControl } from '@/features/routes/map/basemap-control';
import { BASEMAP_THUMBNAILS } from '@/features/routes/map/basemap-thumbnails';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import type { Snap } from '@/shared/ui/sheet-gesture';

import { Locator } from './locator';
import type { Locator as State } from './use-locator';

import 'maplibre-gl/dist/maplibre-gl.css';

/** A hand-made hook state: the Locator is pure display over it. */
const locator = (over: Partial<State> = {}): State => ({
  status: 'on',
  fix: { at: [121.0467, 14.7478], accuracy: 12, speed: 0, heading: null, time: 0 },
  heading: null,
  compass: true,
  camera: 'free',
  mode: 'TrackOwnLocation',
  noFix: false,
  tap: fn(),
  taps: 0,
  ...over,
});

interface Args {
  snap: Snap | null;
  state: State;
  wide?: boolean;
  /** The public map's design button above it, on an empty map, as PublicMapApp puts it there. */
  withDesignButton?: boolean;
}

interface DesignButtonOnAnEmptyMapProps {
  /** The place the Locator gives it. */
  slot: HTMLElement | null;
}

/**
 * The design button needs a map to switch, but drawing it fetches nothing:
 * a real MapLibre map with an empty inline style fills the frame, as in
 * BasemapControl's stories, and the button goes in the Locator's place for it.
 */
function DesignButtonOnAnEmptyMap({ slot }: DesignButtonOnAnEmptyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const created = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      attributionControl: false,
    });
    setMap(created);
    return () => {
      setMap(null);
      created.remove();
    };
  }, []);

  return (
    <>
      {/* Sized as MapView sizes it: MapLibre makes the container `position: relative`. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {map && slot && (
        <BasemapControl
          map={map}
          basemaps={BASEMAPS}
          thumbnails={BASEMAP_THUMBNAILS}
          initial={BASEMAPS[0]}
          container={slot}
        />
      )}
    </>
  );
}

/**
 * The owner's 393 × 852 frame, a page as the app's root is: the sheet says
 * where its top is here. `wide`: 1280 × 800, past `@float:`, the card
 * floating in the corner.
 */
function Specimen({ snap, state, wide = false, withDesignButton = false }: Args) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <div
      data-dock-host
      className={
        '@container relative overflow-clip bg-neutral-200 ' +
        (wide ? 'h-[800px] w-[1280px]' : 'h-[852px] w-[393px]')
      }
    >
      {withDesignButton && <DesignButtonOnAnEmptyMap slot={slot} />}
      <Locator locator={state} docked={snap !== null}>
        {withDesignButton && <div ref={setSlot} />}
      </Locator>
      {snap !== null && (
        <BottomSheet
          label="A trip"
          testId="card"
          header={<p className="px-4 pb-3 font-bold">Novaliches</p>}
          onClose={fn()}
          height={{ snap, onSnap: fn() }}
        >
          <p className="px-4 text-sm">The trip's card.</p>
        </BottomSheet>
      )}
    </div>
  );
}

const meta = {
  title: 'Features/Locator/Locator',
  component: Specimen,
  parameters: { layout: 'fullscreen' },
  args: { snap: 'middle', state: locator() },
} satisfies Meta<typeof Specimen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ScreenLocationBehavior (3870:5941): 12 above the sheet at Middle. */
export const AtMiddle: Story = {};

/** Following the sheet down to Low. */
export const AtLow: Story = { args: { snap: 'low' } };

/** The sheet let go past Middle: the button stays where Middle left it, under the sheet. */
export const AboveMiddle: Story = { args: { snap: 0.8 } };

/** At Max: the sheet covers it. */
export const AtMax: Story = { args: { snap: 'max' } };

/** Wide, the card in the corner: bottom right, clear of the credit line, wherever the card is. */
export const Wide: Story = {
  args: {
    wide: true,
    state: locator({ camera: 'tracked', mode: 'TrackedLocation', compass: false }),
  },
};

/** No card: at the map's foot. */
export const NoCard: Story = {
  args: { snap: null, state: locator({ camera: 'tracked', mode: 'TrackedLocation', heading: 30 }) },
};

/** The browser said no: a short note above the button. */
export const Denied: Story = {
  args: { state: locator({ status: 'denied', fix: null, mode: 'LocationOff' }) },
};

/**
 * The design button 16 above the LocatorButton, or above the note on it,
 * their right edges in line (the owner, 2026-10-16: "Maybe 16px gap").
 */
const expectDesignButtonAbove = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const design = await canvas.findByRole('button', { name: 'Map design' });
  const where = canvas.getByTestId('where');
  const below = canvas.queryByTestId('where-note') ?? where;
  await waitFor(() => {
    const above = design.getBoundingClientRect();
    expect(below.getBoundingClientRect().top - above.bottom).toBeCloseTo(16, 0);
    expect(above.right).toBeCloseTo(where.getBoundingClientRect().right, 0);
  });
  return { design, where };
};

/** The public map since 2026-10-16: its design button 16 above, at Middle. */
export const WithDesignButton: Story = {
  args: { withDesignButton: true },
  play: async ({ canvasElement }) => {
    await expectDesignButtonAbove(canvasElement);
  },
};

/** Following the sheet down to Low, the design button with it, 16 above. */
export const WithDesignButtonAtLow: Story = {
  args: { withDesignButton: true, snap: 'low' },
  play: WithDesignButton.play,
};

/** No card: both at the map's foot, 16 apart. */
export const WithDesignButtonNoCard: Story = {
  args: { withDesignButton: true, snap: null },
  play: WithDesignButton.play,
};

/** Wide, the card in the corner: both at the bottom right, 16 apart. */
export const WithDesignButtonWide: Story = {
  args: { withDesignButton: true, wide: true },
  play: WithDesignButton.play,
};

/** The browser said no: the note stays on the LocatorButton, the design button 16 above it. */
export const WithDesignButtonDenied: Story = {
  args: {
    withDesignButton: true,
    state: locator({ status: 'denied', fix: null, mode: 'LocationOff' }),
  },
  play: async ({ canvasElement }) => {
    const { where } = await expectDesignButtonAbove(canvasElement);
    const note = within(canvasElement).getByTestId('where-note');
    await expect(
      where.getBoundingClientRect().top - note.getBoundingClientRect().bottom,
    ).toBeCloseTo(4, 0);
  },
};

/**
 * The Map Style card open from it at Middle: up, 8 over the design button,
 * clear of the frame's top; the LocatorButton stays where it was.
 */
export const WithDesignButtonCardOpen: Story = {
  args: { withDesignButton: true },
  play: async ({ canvasElement }) => {
    const { design, where } = await expectDesignButtonAbove(canvasElement);
    const whereTop = where.getBoundingClientRect().top;
    await userEvent.click(design);
    const card = within(canvasElement).getByRole('dialog', { name: 'Map Style' });
    // Its pop over (map-style.css): scaled, the card measures smaller.
    await Promise.all(card.getAnimations().map((a) => a.finished));
    const box = card.getBoundingClientRect();
    await expect(design.getBoundingClientRect().top - box.bottom).toBeCloseTo(8, 0);
    const frameTop = canvasElement.querySelector('[data-dock-host]')?.getBoundingClientRect().top;
    await expect(box.top - (frameTop ?? Infinity)).toBeGreaterThanOrEqual(10);
    await expect(where.getBoundingClientRect().top).toBeCloseTo(whereTop, 0);
  },
};
