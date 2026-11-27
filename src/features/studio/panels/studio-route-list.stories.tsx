import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { Hotspot } from '@/features/routes/model/hotspots';
import type { Direction } from '@/features/routes/model/routes';

import { StudioRouteList } from './studio-route-list';

/** Sample data only, shaped like the studio's tables. Not the real map. */
function direction(
  key: string,
  name: string,
  way: string,
  mode: Direction['route']['mode'],
  reversed = false,
): Direction {
  return {
    id: key + (reversed ? '-back' : '-out'),
    routeId: key + '-route',
    name: way,
    originTerminal: null,
    destinationTerminal: null,
    shape: {
      type: 'LineString',
      coordinates: [
        [121.04, 14.7],
        [121.04, 14.78],
      ],
    },
    reversed,
    confidence: 'drawn',
    route: {
      id: key + '-route',
      signboard: null,
      longName: null,
      mode,
      fareNote: null,
      headHotspotId: key + '-head',
      tailHotspotId: key + '-tail',
      via: null,
      name,
    },
  };
}

/** Both ways of a route from `from` to `to`. */
const both = (key: string, from: string, to: string, mode: Direction['route']['mode']) => [
  direction(key, `${from} – ${to}`, `${from} → ${to}`, mode),
  direction(key, `${from} – ${to}`, `${to} → ${from}`, mode, true),
];

/** The frame's list (4905:21658): Tala, Amparo and Bagong Silang by jeep, SM Fairview by bus. */
const frameRoutes: Direction[] = [
  ...both('a', 'Tala', 'SM Fairview', 'jeepney'),
  ...both('b', 'Tala', 'Novaliches', 'jeepney'),
  ...both('c', 'Amparo Sanana', 'SM Fairview', 'jeepney'),
  ...both('d', 'Amparo Sanana', 'Novaliches (Bayan)', 'jeepney'),
  ...both('e', 'Bagong Silang Phase 5', 'Philcoa', 'jeepney'),
  ...both('f', 'SM Fairview', 'SM North', 'bus'),
  ...both('g', 'SM Fairview', 'Quiapo, Buendia', 'bus'),
];

/** Twelve places, for a list taller than the screen: it scrolls on its own. */
const many: Direction[] = Array.from({ length: 12 }, (_, i) =>
  both('m' + i, `Place ${i + 1}`, 'Tala', i % 3 === 0 ? 'bus' : 'jeepney'),
).flat();

const talaTerminal: Hotspot = {
  id: 's1',
  name: 'Tala Jeepney Terminal',
  informal: 'Tala',
  aliases: [],
  kind: 'terminal',
  point: { type: 'Point', coordinates: [121.04, 14.7] },
  area: null,
  note: null,
  createdAt: '2026-09-12T00:00:00Z',
};

/** Keeps the Selected card and the filter's picks, so a story can be tapped through. */
function Picking(props: ComponentProps<typeof StudioRouteList>) {
  const [selected, setSelected] = useState(props.selection.selected);
  const [picks, setPicks] = useState(props.modeFilter.picks);
  return (
    <StudioRouteList
      {...props}
      modeFilter={{
        picks,
        onPicks: (next) => {
          props.modeFilter.onPicks(next);
          setPicks(next);
        },
      }}
      selection={{
        selected,
        onSelect: (p) => {
          props.selection.onSelect(p);
          setSelected(p?.card ?? null);
        },
      }}
    />
  );
}

/**
 * The studio's route list on a computer, in the left panel beside the map (Figma 4905:21658): the
 * cards edge to edge, the panel's full height, no bar over them. Phones keep the sheet with its
 * Controller (Features/Routes/RouteCardList, WithTheController), so there is no phone story here.
 */
const meta = {
  title: 'Features/Studio/StudioRouteList',
  component: StudioRouteList,
  render: (args) => <Picking {...args} />,
  decorators: [
    (Story) => (
      <div className="flex h-dvh max-h-240 w-378">
        <Story />
        <div className="flex-1 bg-surface-quaternary" />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    routes: frameRoutes,
    hotspots: [],
    back: false,
    listing: 'every-line',
    modeFilter: { picks: [], onPicks: fn() },
    selection: { selected: null, onSelect: fn() },
    onRoute: fn(),
    onHotspot: fn(),
    onClose: fn(),
    isHidden: false,
  },
} satisfies Meta<typeof StudioRouteList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the frame draws it: a card per place and mode, named for a screen reader by its count. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('region', { name: '4 Routes' });
    await expect(list).toBeVisible();
    // It takes the focus as it opens, so the keyboard starts in the list.
    await waitFor(() => expect(list).toHaveFocus());
    await expect(canvas.queryByRole('button', { name: 'Close' })).toBeNull();
    await expect(canvas.queryByTestId('chooser-flip')).toBeNull();
  },
};

/** The way back, as Vice Versa on the map turns it. */
export const Switched: Story = { args: { back: true } };

/** A card picked: the studio's Selected card, its routes lit on the map. */
export const ACardSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getAllByTestId('chooser-select').at(0);
    if (first) await userEvent.click(first);
    await expect(canvasElement.querySelectorAll('[data-state="selected"]')).toHaveLength(1);
  },
};

/** Filtered by the filter on the map, to the buses. */
export const FilteredToBus: Story = { args: { modeFilter: { picks: ['bus'], onPicks: fn() } } };

/** Filtered to a kind of ride nothing here is: the list says so, with a way back to All. */
export const FilteredToNothing: Story = {
  args: { modeFilter: { picks: ['ferry'], onPicks: fn() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No Ferry routes here')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Show all routes' }));
    await expect(canvas.queryByText('No Ferry routes here')).toBeNull();
  },
};

/** A hotspot under the tap too: its row first. */
export const WithAHotspot: Story = { args: { hotspots: [talaTerminal] } };

/** Only hotspots under the tap: the list counts them instead. */
export const OnlyHotspots: Story = { args: { routes: [], hotspots: [talaTerminal] } };

/** Taller than the screen: the cards scroll on their own, the map still. */
export const ManyPlaces: Story = { args: { routes: many } };

/** Escape closes it, as the phone's ✕ does, from a card the keyboard is on. */
export const EscapeCloses: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.tab();
    const list = within(canvasElement).getByTestId('chooser');
    await expect(list.contains(canvasElement.ownerDocument.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

/** Kept but hidden behind the route line detail picked from it: Escape is the detail's then. */
export const Hidden: Story = {
  args: { isHidden: true },
  play: async ({ args, canvasElement }) => {
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/**
 * Out of reach under an inert page (the map's credits open over it) or a modal dialog (an account
 * dialog): Escape is theirs, and the list stays.
 */
export const UnderAnInertPage: Story = {
  decorators: [
    (Story) => (
      <div inert className="contents">
        <Story />
      </div>
    ),
  ],
  play: async ({ args, canvasElement }) => {
    const list = within(canvasElement).getByTestId('chooser');
    // Its Escape is listening once its focus effect has run; inert, the focus stays out.
    await waitFor(() => expect(list).not.toHaveFocus());
    await new Promise((settle) => setTimeout(settle, 100));
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
