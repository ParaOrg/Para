import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { BASEMAPS } from './basemap';
import { BasemapControl } from './basemap-control';

type HostedProps = Omit<ComponentProps<typeof BasemapControl>, 'map'>;

/**
 * The control needs a map to switch, but opening its menu draws nothing on
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
  // A map-sized box for the button to sit in the top-right corner of.
  decorators: [
    (Story) => (
      <div className="relative h-80 overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { basemaps: BASEMAPS, initial: BASEMAPS[0], under: 'nothing' },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

const openMenu = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: 'Map design' }));
  return canvas.getByRole('menu');
};

/** A mouse on the public map: nothing above it, so it takes the corner. Closed. */
export const Closed: Story = {};

/** Open: the designs, the current one ticked. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    await expect(within(menu).getByRole('menuitemradio', { name: /Gray$/ })).toBeChecked();
    await expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(BASEMAPS.length);
  },
};

/** Remembered on the device as Dark: Dark is ticked, and the button's title says so. */
export const DarkChosen: Story = {
  args: { initial: BASEMAPS[3] },
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByRole('button', { name: 'Map design' });
    await expect(button).toHaveAttribute('title', 'Map design: Dark');
    const menu = await openMenu(canvasElement);
    await expect(within(menu).getByRole('menuitemradio', { name: /Dark/ })).toBeChecked();
  },
};

/** Escape closes the menu, and only the menu. */
export const EscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    await userEvent.keyboard('{Escape}');
    await expect(within(canvasElement).queryByRole('menu')).toBeNull();
    await expect(within(canvasElement).getByRole('button', { name: 'Map design' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
};

/** A tap anywhere else closes it, as a tap on the map closes a card. */
export const TapOutsideCloses: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    await userEvent.click(canvasElement.ownerDocument.body);
    await expect(within(canvasElement).queryByRole('menu')).toBeNull();
  },
};

/** The current design picked again: the menu closes and nothing is fetched. */
export const SameDesignAgain: Story = {
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: /Gray$/ }));
    await expect(within(canvasElement).queryByRole('menu')).toBeNull();
  },
};

/** On a phone the attribution moves to the top; the button rests under it. */
export const UnderAttribution: Story = { args: { under: 'attribution' } };

/** A mouse in the studio: MapLibre's +, − and compass above it. */
export const UnderZoom: Story = { args: { under: 'zoom' } };
