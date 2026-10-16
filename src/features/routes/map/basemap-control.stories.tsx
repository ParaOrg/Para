import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { BASEMAPS } from './basemap';
import { BasemapControl } from './basemap-control';
import { BASEMAP_THUMBNAILS } from './basemap-thumbnails';

type HostedProps = Omit<ComponentProps<typeof BasemapControl>, 'map'>;

/**
 * The control needs a map to switch, but opening its card draws nothing on
 * one: a real MapLibre map with an empty inline style stands in, so the story
 * fetches no tiles. Picking another design would fetch that design's style,
 * so the stories only open, close and keep the current one.
 */
function OnAnEmptyMap(props: HostedProps) {
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
      <div ref={containerRef} aria-hidden className="absolute inset-0" />
      {map && <BasemapControl {...props} map={map} />}
    </>
  );
}

const meta = {
  title: 'Features/Routes/BasemapControl',
  component: OnAnEmptyMap,
  // A phone-sized map for the button to sit in the top-right corner of.
  decorators: [
    (Story) => (
      <div className="relative h-[480px] w-[390px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    basemaps: BASEMAPS,
    thumbnails: BASEMAP_THUMBNAILS,
    initial: BASEMAPS[0],
    under: 'nothing',
  },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

const openCard = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: 'Map design' }));
  return canvas.getByRole('dialog', { name: 'Map Style' });
};

/** A mouse on the public map: nothing above it, so it takes the corner. Closed. */
export const Closed: Story = {};

/** Open: the three designs, the current one ringed and holding the keyboard. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const card = await openCard(canvasElement);
    const monochrome = within(card).getByRole('button', { name: 'Monochrome' });
    await expect(monochrome).toHaveAttribute('aria-pressed', 'true');
    await expect(monochrome).toHaveFocus();
    // The other two designs; ✕ is no toggle, so it has no pressed state at all.
    await expect(within(card).getAllByRole('button', { pressed: false })).toHaveLength(
      BASEMAPS.length - 1,
    );
  },
};

/** Remembered on the device as Fiord: Fiord is ringed, and the button's title says so. */
export const FiordChosen: Story = {
  args: { initial: BASEMAPS[2] },
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByRole('button', { name: 'Map design' });
    await expect(button).toHaveAttribute('title', 'Map design: Fiord');
    const card = await openCard(canvasElement);
    await expect(within(card).getByRole('button', { name: 'Fiord' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

/** Tab goes round inside the card: ✕ is its first button and Fiord its last, so each wraps to the other. */
export const TabStaysInside: Story = {
  play: async ({ canvasElement }) => {
    const card = await openCard(canvasElement);
    const close = within(card).getByRole('button', { name: 'Close' });
    const fiord = within(card).getByRole('button', { name: 'Fiord' });
    await userEvent.tab({ shift: true });
    await expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(fiord).toHaveFocus();
    await userEvent.tab();
    await expect(close).toHaveFocus();
  },
};

/** ✕ closes the card, and the keyboard goes back to the button. */
export const CloseButtonCloses: Story = {
  play: async ({ canvasElement }) => {
    const card = await openCard(canvasElement);
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    const canvas = within(canvasElement);
    // Gone once its leaving has played (map-style.css).
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(canvas.getByRole('button', { name: 'Map design' })).toHaveFocus();
  },
};

/** ✕ starts its leaving: still drawn a moment, taking no taps, then gone. */
export const LeavesThenGoes: Story = {
  play: async ({ canvasElement }) => {
    const card = await openCard(canvasElement);
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    const leaving = canvasElement.querySelector('[data-testid="basemap-menu"]');
    await expect(leaving).toHaveAttribute('data-closing');
    await expect(leaving).toHaveAttribute('inert');
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-testid="basemap-menu"]')).toBeNull(),
    );
  },
};

/** The button tapped again while the card leaves: it comes back, open. */
export const ReopenWhileLeaving: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = await openCard(canvasElement);
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Map design' }));
    const again = canvas.getByRole('dialog', { name: 'Map Style' });
    await expect(again).not.toHaveAttribute('data-closing');
    // The keyboard back in the card, on the design shown, as at a first opening.
    await expect(within(again).getByRole('button', { name: 'Monochrome' })).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Map design' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
};

/**
 * Matches `(prefers-reduced-motion: reduce)` for one story, as
 * draw-toolbar.stories.tsx fakes a finger: BasemapControl's own question.
 * The stylesheet's `@media` still follows the real setting.
 */
const asStill = () => {
  const real = window.matchMedia;
  window.matchMedia = (query: string) => {
    // Each call answers a fresh list, so changing this one touches nothing else.
    const list = real.call(window, query);
    return query === '(prefers-reduced-motion: reduce)'
      ? Object.defineProperty(list, 'matches', { value: true })
      : list;
  };
  return () => {
    window.matchMedia = real;
  };
};

/** A device asking for no motion: ✕ and the card is gone at once, with no leaving to wait for. */
export const StillUnderReducedMotion: Story = {
  beforeEach: asStill,
  play: async ({ canvasElement }) => {
    const card = await openCard(canvasElement);
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    await expect(within(canvasElement).queryByRole('dialog')).toBeNull();
  },
};

/** Escape closes the card, and only the card; the keyboard goes back to the button. */
export const EscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    await openCard(canvasElement);
    await userEvent.keyboard('{Escape}');
    const canvas = within(canvasElement);
    // Gone once its leaving has played (map-style.css).
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    const button = canvas.getByRole('button', { name: 'Map design' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveFocus();
  },
};

/** A tap anywhere else closes it, as a tap on the map closes a card. */
export const TapOutsideCloses: Story = {
  play: async ({ canvasElement }) => {
    await openCard(canvasElement);
    await userEvent.click(canvasElement.ownerDocument.body);
    await waitFor(() => expect(within(canvasElement).queryByRole('dialog')).toBeNull());
  },
};

/** The current design picked again: nothing is fetched, and the card stays, still ringed. */
export const SameDesignAgain: Story = {
  play: async ({ canvasElement }) => {
    const card = await openCard(canvasElement);
    const monochrome = within(card).getByRole('button', { name: 'Monochrome' });
    await userEvent.click(monochrome);
    await expect(within(canvasElement).getByRole('dialog')).toBeInTheDocument();
    await expect(monochrome).toHaveAttribute('aria-pressed', 'true');
  },
};

/** On a phone the attribution moves to the top; the button rests under it. */
export const UnderAttribution: Story = { args: { under: 'attribution' } };

/** A mouse in the studio: MapLibre's +, − and compass above it. */
export const UnderZoom: Story = { args: { under: 'zoom' } };
