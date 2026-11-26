import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import type { Direction } from '@/features/routes/model/routes';

import { MapSheetControls } from './map-sheet-controls';

/** Sample data only, shaped like the published map: a jeep's two ways, 8 km straight north. */
function direction(key: string, name: string, reversed: boolean): Direction {
  return {
    id: key + (reversed ? '-back' : '-out'),
    routeId: key + '-route',
    name,
    originTerminal: null,
    destinationTerminal: null,
    shape: {
      type: 'LineString',
      coordinates: [
        [121.04, 14.7],
        [121.04, 14.77],
      ],
    },
    reversed,
    confidence: 'drawn',
    route: {
      id: key + '-route',
      signboard: null,
      longName: null,
      mode: 'jeepney',
      fareNote: null,
      headHotspotId: key + '-head',
      tailHotspotId: key + '-tail',
      via: null,
      name,
    },
  };
}

const talaRoutes = [
  direction('a', 'Novaliches → Tala', false),
  direction('a', 'Tala → Novaliches', true),
];

/** A loop: no ends, no way back. */
const ikotLoop: Direction = {
  ...direction('ikot', 'UP – Ikot', false),
  route: {
    ...direction('ikot', 'UP – Ikot', false).route,
    headHotspotId: null,
    tailHotspotId: null,
    isLoop: true,
  },
};

const listOf = (candidates: readonly Direction[]) => ({
  candidates,
  back: false,
  listing: 'every-line' as const,
  modeFilter: 'all' as const,
});

/**
 * The public map's controls for the card on show (4885:41761), over a phone's map, 393 wide, the
 * sheet's top at 60% (`--dock-y`, as BottomSheet sets it), the map's ⓘ drawn as its 28 box at 16,
 * 24. On a phone the list's filter stands over locate-me (ListFilter in Locator), not here.
 */
const meta = {
  title: 'App/PublicMap/MapSheetControls',
  component: MapSheetControls,
  args: {
    map: null,
    overview: { isShown: false, go: fn() },
    list: listOf(talaRoutes),
    floats: false,
    onFlip: fn(),
    onFilter: fn(),
  },
  decorators: [
    (Story) => (
      <div
        data-dock-host
        className="@container relative h-160 w-98.25 overflow-hidden bg-bg-surface-secondary [--dock-gap:1rem] [--dock-y:60%]"
      >
        <div className="absolute inset-x-0 top-[60%] bottom-0 rounded-t-3xl bg-bg-surface" />
        <div className="absolute top-6 left-4 size-7 rounded-full bg-bg-surface" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapSheetControls>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The route list on show: Vice Versa, which turns the list round; no filter here on a phone. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Vice Versa' })).toBeEnabled();
    await expect(canvas.queryByRole('button', { name: 'Filter' })).toBeNull();
  },
};

/**
 * A card picked on the list and the camera moved off it (4885:41761): Vice Versa 16 in and 16 over
 * the sheet, the Overview's drawing alone, 48 across, 12 over it.
 */
export const ListOffTheOverview: Story = {
  args: { overview: { isShown: true, go: fn() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = canvasElement.querySelector('[data-dock-host]')?.getBoundingClientRect();
    const viceVersa = canvas.getByRole('button', { name: 'Vice Versa' }).getBoundingClientRect();
    const overview = canvas.getByRole('button', { name: 'Overview' }).getBoundingClientRect();
    await expect(host).toBeDefined();
    if (host) {
      await expect(Math.round(viceVersa.left - host.left)).toBe(16);
      await expect(Math.round(host.top + host.height * 0.6 - viceVersa.bottom)).toBe(16);
    }
    await expect([overview.width, overview.height]).toEqual([48, 48]);
    await expect(Math.round(viceVersa.top - overview.bottom)).toBe(12);
    await expect(Math.abs(overview.left - viceVersa.left)).toBeLessThan(1);
  },
};

/** Nothing drawn the other way round: Vice Versa rests disabled. */
export const NothingTheOtherWay: Story = {
  args: { list: listOf([talaRoutes[0]]) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Vice Versa' })).toBeDisabled();
  },
};

/** Only loops listed: no way back, so no Vice Versa. */
export const OnlyLoops: Story = {
  args: { list: listOf([ikotLoop]), overview: { isShown: true, go: fn() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Vice Versa' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Overview' })).toBeVisible();
  },
};

/**
 * Where the card floats (4886:47571): a row at the map's top, Vice Versa over the Overview and the
 * filter 12 right of them, counting the modes picked.
 */
export const Floating: Story = {
  args: {
    floats: true,
    overview: { isShown: true, go: fn() },
    list: { ...listOf(talaRoutes), modeFilter: 'jeep' },
  },
  decorators: [
    (Story) => (
      <div data-dock-host className="@container relative h-160 w-[72rem] bg-bg-surface-secondary">
        <div className="absolute inset-y-0 left-0 w-96 bg-bg-surface" />
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viceVersa = canvas.getByRole('button', { name: 'Vice Versa' }).getBoundingClientRect();
    const overview = canvas.getByRole('button', { name: 'Overview' }).getBoundingClientRect();
    const filter = canvas.getByTestId('chooser-filter').getBoundingClientRect();
    await expect(Math.round(overview.top - viceVersa.bottom)).toBe(12);
    await expect(Math.round(filter.left - viceVersa.right)).toBe(12);
    await expect(Math.abs(filter.top - viceVersa.top)).toBeLessThan(1);
  },
};

/** A trip on show, the camera off its route: Overview alone, its word and drawing. */
export const Trip: Story = { args: { list: null, overview: { isShown: true, go: fn() } } };

/** A trip at its overview: nothing shows, and nothing is in the keyboard's way. */
export const TripAtTheOverview: Story = {
  args: { list: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryAllByRole('button')).toHaveLength(0);
  },
};
