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
 * The public map's controls for the card on show (Figma 4831:54489), over a phone's map, 393 wide,
 * the sheet's top at 60% (`--dock-y`, as BottomSheet sets it), the map's ⓘ drawn as its 32 box.
 */
const meta = {
  title: 'App/PublicMap/MapSheetControls',
  component: MapSheetControls,
  args: {
    map: null,
    overview: { isShown: false, go: fn() },
    isBesideCredits: true,
    list: listOf(talaRoutes),
    onFlip: fn(),
    onFilter: fn(),
  },
  decorators: [
    (Story) => (
      <div
        data-dock-host
        className="@container relative h-160 w-98.25 overflow-hidden bg-bg-surface-secondary [--dock-y:60%]"
      >
        <div className="absolute inset-x-0 top-[60%] bottom-0 rounded-t-3xl bg-bg-surface" />
        <div className="absolute bottom-[calc(40%+0.75rem)] left-3 size-8 rounded-full bg-bg-surface" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapSheetControls>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The route list on show (4796:34329): the sliders over Vice Versa, which turns the list round. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Vice Versa' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Filter' })).toBeVisible();
  },
};

/** A card picked on the list and the camera moved off it: Overview beside Vice Versa. */
export const ListOffTheOverview: Story = { args: { overview: { isShown: true, go: fn() } } };

/** A filter on: the dot on the sliders, and their name says which. */
export const ListFiltered: Story = {
  args: { list: { ...listOf(talaRoutes), modeFilter: 'jeep' } },
};

/** Nothing drawn the other way round: Vice Versa rests disabled. */
export const NothingTheOtherWay: Story = {
  args: { list: listOf([talaRoutes[0]]) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Vice Versa' })).toBeDisabled();
  },
};

/**
 * Only loops listed: no way back, so no Vice Versa; the sliders keep their 12 over the sheet, the
 * empty row not drawn.
 */
export const OnlyLoops: Story = {
  args: { list: listOf([ikotLoop]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Vice Versa' })).toBeNull();
    const filter = canvas.getByRole('button', { name: 'Filter' }).getBoundingClientRect();
    const sheetTop = canvasElement.querySelector('[data-dock-host]')?.getBoundingClientRect();
    await expect(sheetTop).toBeDefined();
    if (sheetTop) {
      const gap = sheetTop.top + sheetTop.height * 0.6 - filter.bottom;
      await expect(Math.abs(gap - 12)).toBeLessThan(1.5);
    }
  },
};

/** A trip on show (4831:51289), the camera off its route: Overview alone. */
export const Trip: Story = { args: { list: null, overview: { isShown: true, go: fn() } } };

/** A trip at its overview: nothing shows, and nothing is in the keyboard's way. */
export const TripAtTheOverview: Story = {
  args: { list: null },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryAllByRole('button')).toHaveLength(0);
  },
};
