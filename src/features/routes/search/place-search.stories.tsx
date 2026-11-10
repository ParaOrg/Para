import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { PlaceSearch } from './place-search';
import type { Hotspot } from '../model/hotspots';
import type { Direction, RouteSummary } from '../model/routes';
import type { LandmarkFileRead } from '../published/fetch-landmarks';
import type { Landmark } from '../published/landmark-file-schema';

const hotspot = (
  id: string,
  name: string,
  informal: string | null,
  at: [number, number],
  { aliases = [], kind = 'hintuan' }: { aliases?: string[]; kind?: Hotspot['kind'] } = {},
): Hotspot => ({
  id,
  name,
  informal,
  aliases,
  kind,
  point: { type: 'Point', coordinates: at },
  area: null,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  line: null,
});

const route = (id: string, name: string, mode: RouteSummary['mode']): RouteSummary => ({
  id,
  signboard: null,
  longName: null,
  mode,
  fareNote: null,
  headHotspotId: 'h-a',
  tailHotspotId: 'h-b',
  via: null,
  name,
});

const direction = (id: string, r: RouteSummary, name: string): Direction => ({
  id,
  routeId: r.id,
  name,
  originTerminal: null,
  destinationTerminal: null,
  shape: null,
  reversed: false,
  confidence: 'drawn',
  route: r,
});

const HOTSPOTS: Hotspot[] = [
  hotspot('t1', 'SM Fairview Terminal B', 'SM Fairview', [121.06, 14.733], {
    kind: 'terminal',
    aliases: ['SM City Fairview'],
  }),
  hotspot('h1', 'SM Fairview Hintuan', 'SM Fairview', [121.061, 14.734], { aliases: ['Fairview'] }),
  hotspot('h2', 'Quiapo Church', 'Quiapo', [120.984, 14.599]),
  hotspot('t2', 'Parañaque Integrated Terminal Exchange', 'PITX', [120.992, 14.51], {
    kind: 'terminal',
  }),
  hotspot('h3', 'Cubao Farmers', 'Cubao', [121.054, 14.619]),
  hotspot('h4', 'Cubao Gateway', 'Gateway Cubao', [121.053, 14.621]),
  hotspot('h5', 'Commonwealth Market Hintuan', 'Commonwealth Market', [121.0845, 14.6988]),
];

const ROUTES: Record<string, Direction[]> = {
  t1: [direction('d1', route('r1', 'SM Fairview – Quiapo', 'jeepney'), 'SM Fairview → Quiapo')],
  h3: [
    direction('d2', route('r2', 'Cubao – Quiapo', 'jeepney'), 'Cubao → Quiapo'),
    direction('d3', route('r3', 'Cubao – PITX', 'bus'), 'Cubao → PITX'),
  ],
  h5: [
    direction('d4', route('r4', 'Fairview – Quiapo', 'jeepney'), 'Fairview → Quiapo'),
    direction('d5', route('r5', 'Commonwealth – Cubao', 'jeepney'), 'Commonwealth → Cubao'),
    direction('d6', route('r6', 'Commonwealth – Litex', 'jeepney'), 'Commonwealth → Litex'),
    direction('d7', route('r7', 'Commonwealth – Philcoa', 'jeepney'), 'Commonwealth → Philcoa'),
  ],
};

const landmark = (
  id: string,
  name: string,
  kind: Landmark['kind'],
  point: [number, number],
  aliases: string[] = [],
): Landmark => ({ id, name, kind, point, reach: [point], aliases });

const LANDMARKS: LandmarkFileRead = {
  attribution: '© OpenStreetMap contributors',
  landmarks: [
    landmark('w1', 'Commonwealth High School', 'school', [121.0817, 14.699]),
    landmark('w2', 'Fairview Terraces', 'mall', [121.06, 14.737], ['Terraces Mall']),
    landmark('w3', 'La Mesa Watershed Gate', 'barangay', [121.0905, 14.7205]),
    landmark('w4', 'SM City Fairview', 'mall', [121.0605, 14.733]),
  ],
};

const LONG_NAMES: Hotspot[] = [
  hotspot(
    'l1',
    'Polytechnic University of the Philippines Sta. Mesa Main Campus Gate 2 Hintuan',
    'Polytechnic University of the Philippines Santa Mesa',
    [121.01, 14.598],
    { aliases: ['PUP Sta. Mesa Main Campus along Anonas Street Extension'] },
  ),
  hotspot('l2', 'Pureza LRT-2 Station Hintuan', 'Pureza', [121.005, 14.601]),
];

const meta = {
  title: 'Features/Routes/PlaceSearch',
  component: PlaceSearch,
  args: {
    hotspots: HOTSPOTS,
    directionsAt: (id: string) => ROUTES[id] ?? [],
    onPick: fn(),
    onLookAt: fn(),
    loadLandmarks: () => Promise.resolve(LANDMARKS),
  },
  decorators: [
    (Story) => (
      <div className="w-80 bg-surface-tertiary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlaceSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const field = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('combobox', { name: 'Search places' });
const optionTexts = (canvasElement: HTMLElement) =>
  within(canvasElement)
    .getAllByRole('option')
    .map((option) => option.textContent);

/** Nothing typed: the field alone, and no landmark asked for yet. */
export const Default: Story = {
  args: { loadLandmarks: fn(() => Promise.resolve(LANDMARKS)) },
  play: async ({ args, canvasElement }) => {
    await expect(field(canvasElement)).toHaveAttribute('aria-expanded', 'false');
    await expect(within(canvasElement).queryByRole('listbox')).toBeNull();
    await expect(args.loadLandmarks).not.toHaveBeenCalled();
  },
};

/**
 * A few letters in: the places they start, best match first, each with the name that matched
 * under its label when that name is another (Gateway Cubao's box is "Cubao Gateway"), and what
 * rides from it.
 */
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cub');
    await expect(optionTexts(canvasElement)).toEqual([
      'CubaoJeepneyBus',
      'Gateway CubaoCubao Gateway',
    ]);
  },
};

/** An alias and a typo find their places; the arrows and Enter choose one, and the field empties. */
export const Results: Story = {
  play: async ({ args, canvasElement }) => {
    const input = field(canvasElement);
    await userEvent.type(input, 'fairveiw');
    await expect(within(canvasElement).getAllByRole('option')[0]).toHaveTextContent('SM Fairview');
    await userEvent.keyboard('{ArrowDown}');
    await expect(within(canvasElement).getAllByRole('option')[0]).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{Enter}');
    await expect(args.onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    await expect(input).toHaveValue('');
  },
};

/** The arrow keys on a row, left there: the active row's look, which Enter would open. */
export const ResultActive: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{ArrowDown}');
    const [first] = within(canvasElement).getAllByRole('option');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(field(canvasElement)).toHaveAttribute('aria-activedescendant', first.id);
  },
};

/**
 * Para's places first, then the landmarks, marked so, with their credit. SM Fairview matched by
 * its alias "Fairview" says so; SM City Fairview, a landmark of its name beside it, is the place
 * and not listed twice.
 */
export const LandmarkResults: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'fairview');
    await waitFor(() => expect(optionTexts(canvasElement)).toHaveLength(2));
    await expect(optionTexts(canvasElement)).toEqual([
      'SM FairviewJeepneyFairview',
      'Fairview TerracesMall · Landmark',
    ]);
    await expect(within(canvasElement).getByText('© OpenStreetMap contributors')).toBeVisible();
  },
};

/** Located: each result says how far it is. */
export const Located: Story = {
  args: { whereNow: () => [121.0531, 14.6211] },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await expect(within(canvasElement).getAllByRole('option')[0]).toHaveTextContent('km');
  },
};

/** The landmark file on its way: Para's places show now, and a line says landmarks are coming. */
export const LoadingLandmarks: Story = {
  args: {
    loadLandmarks: () =>
      new Promise<LandmarkFileRead>(() => {
        // Held: the file never arrives, so the story stays on its way.
      }),
  },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'quiapo');
    await expect(optionTexts(canvasElement)).toEqual(['Quiapo']);
    await expect(within(canvasElement).getByText('Looking through landmarks…')).toBeVisible();
  },
};

/** The landmark file failed (offline before it was kept): Para's places still show; Try again asks again. */
export const LandmarksFailed: Story = {
  args: { loadLandmarks: fn(() => Promise.reject(new Error('offline'))) },
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'quiapo');
    const retry = await within(canvasElement).findByRole('button', { name: 'Try again' });
    await expect(optionTexts(canvasElement)).toEqual(['Quiapo']);
    await userEvent.click(retry);
    await expect(args.loadLandmarks).toHaveBeenCalledTimes(2);
  },
};

/** Nothing matches: the empty state quotes what was typed. */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'Monumento');
    // Shown under the field, and said by the status region in the same words.
    const [shown] = await within(canvasElement).findAllByText('No place called ‘Monumento’ yet');
    await expect(shown).toBeVisible();
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'No place called ‘Monumento’ yet',
    );
    // No list is open, so the field says none is.
    await expect(field(canvasElement)).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Escape}');
    await expect(field(canvasElement)).toHaveValue('');
  },
};

/**
 * A landmark chosen: the camera goes there, and the hintuans with routes within 500 m are listed,
 * nearest first, each with where its routes go; one opens as a tap on it does.
 */
export const RoutesNearHere: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'commonwealth high');
    await waitFor(() => expect(optionTexts(canvasElement)).toHaveLength(1));
    await userEvent.keyboard('{Enter}');
    await expect(args.onLookAt).toHaveBeenCalledWith([121.0817, 14.699]);
    const panel = within(canvasElement).getByRole('region', { name: 'Commonwealth High School' });
    await expect(panel).toHaveTextContent('in a straight line');
    const hintuan = within(panel).getByRole('button', { name: /Commonwealth Market Hintuan/ });
    // Four routes stop there: three are named, then how many more.
    await expect(hintuan).toHaveTextContent('Quiapo, Cubao, Litex and 1 more');
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      '1 Para hintuan near Commonwealth High School',
    );
    await userEvent.click(hintuan);
    await expect(args.onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'h5' }));
  },
};

/**
 * "Go here" on a hintuan near a landmark (ticket 07): the landmark, the hintuans near it and the
 * one chosen go to the map, which opens that hintuan's routes; the panel closes.
 */
export const GoHere: Story = {
  args: { onGoHere: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.type(field(canvasElement), 'commonwealth high');
    await waitFor(() => expect(optionTexts(canvasElement)).toHaveLength(1));
    await userEvent.keyboard('{Enter}');
    const panel = within(canvasElement).getByRole('region', { name: 'Commonwealth High School' });
    await userEvent.click(
      within(panel).getByRole('button', {
        name: 'Go here: Commonwealth Market Hintuan, for Commonwealth High School',
      }),
    );
    await expect(args.onGoHere).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w1' }),
      [expect.objectContaining({ hintuan: expect.objectContaining({ id: 'h5' }) })],
      expect.objectContaining({ id: 'h5' }),
    );
    await expect(args.onPick).not.toHaveBeenCalled();
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
  },
};

/** Without the map's handler (the studio's), no "Go here" on the rows. */
export const NoGoHere: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'commonwealth high');
    await waitFor(() => expect(optionTexts(canvasElement)).toHaveLength(1));
    await userEvent.keyboard('{Enter}');
    await expect(within(canvasElement).queryByRole('button', { name: /Go here/ })).toBeNull();
  },
};

/** A landmark with no Para hintuan within 500 m. */
export const NoRoutesNearHere: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'la mesa');
    await waitFor(() => expect(optionTexts(canvasElement)).toHaveLength(1));
    await userEvent.keyboard('{Enter}');
    await expect(within(canvasElement).getByText('No Para routes near here yet')).toBeVisible();
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'No Para routes near La Mesa Watershed Gate yet',
    );
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close' }));
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
  },
};

/**
 * The landmark's pin (ticket 06) follows its panel: there while the routes near a landmark are
 * open, moved by another pick, gone once the panel closes or the search is typed in again. The
 * real pin is a map marker (LandmarkPin's own stories); a line of text stands in for it here.
 */
export const LandmarkPinFollowsThePanel: Story = {
  args: {
    renderLandmarkPin: (picked: Landmark) => <p data-testid="pin">Pin at {picked.name}</p>,
  },
  play: async ({ canvasElement }) => {
    const pin = () => within(canvasElement).queryByTestId('pin');
    const pick = async (text: string) => {
      await userEvent.clear(field(canvasElement));
      await userEvent.type(field(canvasElement), text);
      await waitFor(() => expect(optionTexts(canvasElement)).toHaveLength(1));
      await userEvent.keyboard('{Enter}');
    };
    await expect(pin()).toBeNull();
    await pick('commonwealth high');
    await expect(pin()).toHaveTextContent('Pin at Commonwealth High School');
    // Typing again clears it before any result is picked.
    await userEvent.type(field(canvasElement), 'la');
    await expect(pin()).toBeNull();
    await pick('la mesa');
    await expect(pin()).toHaveTextContent('Pin at La Mesa Watershed Gate');
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close' }));
    await expect(pin()).toBeNull();
  },
};

/** A landmark matched by another of its names: the row says which, after its kind. */
export const LandmarkByAlias: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'terraces mall');
    await waitFor(() =>
      expect(optionTexts(canvasElement)).toEqual([
        'Fairview TerracesMall · Landmark · Terraces Mall',
      ]),
    );
  },
};

/**
 * The landmark file failed and no Para place matches either: the empty state and the failure
 * show together, and a screen reader hears both. How they sit together is the owner's to design.
 */
export const LandmarksFailedNoMatch: Story = {
  args: { loadLandmarks: () => Promise.reject(new Error('offline')) },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'Monumento');
    await expect(
      await within(canvasElement).findByRole('button', { name: 'Try again' }),
    ).toBeVisible();
    await expect(within(canvasElement).getByText('No place called ‘Monumento’ yet')).toBeVisible();
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      'No place called ‘Monumento’ yet. Landmarks didn’t load; Try again is below.',
    );
  },
};

/** Long names and a long alias: each line truncates rather than pushing the distance off. */
export const LongNames: Story = {
  args: { hotspots: LONG_NAMES, whereNow: () => [121.0, 14.6] },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'pu');
    await expect(within(canvasElement).getAllByRole('option')).toHaveLength(2);
  },
};

/** On a phone, as wide as the bar across a 390 map leaves the field; long names still truncate. */
export const LongNamesOnPhone: Story = {
  args: { hotspots: LONG_NAMES, whereNow: () => [121.0, 14.6] },
  decorators: [
    (Story) => (
      <div className="w-97.5 bg-surface-tertiary p-4">
        <div className="rounded-xl bg-surface p-3 shadow-large">
          <Story />
        </div>
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'pu');
    await expect(within(canvasElement).getAllByRole('option')).toHaveLength(2);
  },
};
