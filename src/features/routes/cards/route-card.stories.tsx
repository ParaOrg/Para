import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { RouteCard } from './route-card';
import type { RouteCardEndPoint, RouteCardRide } from './route-card-ride';

/** Rows to the given places, with no station codes. */
const roadRows = (places: readonly string[]): RouteCardEndPoint[] =>
  places.map((place, i) => ({ id: String(i), destination: place, via: null, stationCode: null }));

/** One train row, to a station and its code. */
const trainRow = (place: string, code: string | null): RouteCardEndPoint[] => [
  { id: 'a', destination: place, via: null, stationCode: code },
];

const meta = {
  title: 'Features/Routes/RouteCard',
  component: RouteCard,
  // Edge to edge, as on a phone: the screenshots compare with Figma's 393-wide frames.
  parameters: { layout: 'fullscreen' },
  // Figma's width, a phone's (RouteCard, 4629:22776): the card fills whatever holds it.
  decorators: [
    (Story) => (
      <div className="w-98.25">
        <Story />
      </div>
    ),
  ],
  args: {
    ride: { kind: 'road', livery: 'jeep', vehicle: 'Jeepney' },
    routeOrigin: 'Tala',
    endPoints: roadRows(['SM Fairview', 'Novaliches']),
    onPick: fn(),
    testId: 'chooser',
  },
} satisfies Meta<typeof RouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Variatns=Jeep: Card/jeep/fill, white words, the jeep alone at the top; the place in Bold 28/32,
 * each row Figma's Destinationn, 38 tall. The list keeps the mode's name in words.
 */
export const Jeep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const place = getComputedStyle(canvas.getByTestId('chooser-select'));
    await expect(place.fontSize).toBe('28px');
    await expect(place.lineHeight).toBe('32px');
    await expect(place.fontWeight).toBe('700');
    await expect(canvas.queryByText('Jeep')).toBeNull();
    await expect(canvas.getByRole('list', { name: 'Jeep' })).toBeVisible();
    const [row] = canvas.getAllByTestId('chooser-item');
    await expect(row?.getBoundingClientRect().height).toBe(38);
  },
};

/**
 * Bagong Silang Phase 5's card in Figma's RouteCardStackedList (4633:19780): two routes to each
 * place told apart by their vias, each under its place.
 */
export const WithVias: Story = {
  args: {
    routeOrigin: 'Bagong Silang Phase 5',
    endPoints: [
      { id: 'a', destination: 'SM Fairview', via: 'Maligaya', stationCode: null },
      { id: 'b', destination: 'SM Fairview', via: 'Almar', stationCode: null },
      { id: 'c', destination: 'Philcoa', via: 'Maligaya', stationCode: null },
      { id: 'd', destination: 'Philcoa', via: 'Almar', stationCode: null },
      { id: 'e', destination: 'Novaliches (Bayan)', via: null, stationCode: null },
    ],
  },
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByTestId('chooser-item');
    await expect(rows[0]?.textContent).toBe('SM Fairview, Via Maligaya');
    await expect(rows[0]?.getBoundingClientRect().height).toBe(58);
  },
};

/** Variatns=UV Express: a light card, Text/primary words, under the inverse card's inner shadow. */
export const UvExpress: Story = {
  args: {
    ride: { kind: 'road', livery: 'uv-express', vehicle: 'UV Express' },
    routeOrigin: 'SM Fairview',
    endPoints: roadRows(['SM North', 'Buendia']),
  },
};

/** Variatns=E Jeep: as UV Express, on E-jeep's own surface (no new fill yet). */
export const Ejeep: Story = {
  args: {
    ride: { kind: 'road', livery: 'ejeep', vehicle: 'E-Jeep' },
    routeOrigin: 'Palmer',
    endPoints: roadRows(['SM Fairview', 'Novaliches', 'Philcoa', 'Cubao']),
  },
};

/** Variatns=Bus: Card/bus/fill, white words. */
export const Bus: Story = {
  args: {
    ride: { kind: 'road', livery: 'bus', vehicle: 'Bus' },
    routeOrigin: 'S. Palay',
    endPoints: roadRows(['GMA', 'PITX']),
  },
};

const LRT_1: RouteCardRide = {
  kind: 'rail',
  railway: 'LRT-1',
  bound: 'Southbound',
  originCode: 'GL02',
};

/**
 * Property 1=LRT 1: the line's badge and its bound's, and the stations' codes beside the origin
 * and at the row's end, in the line's green on Card/Bus/on-surface.
 */
export const LightRailWayOne: Story = {
  args: {
    ride: LRT_1,
    routeOrigin: 'Fernando Poe Jr.',
    endPoints: trainRow('Dr. Santos', 'GL26'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('LRT 1')).toBeVisible();
    await expect(canvas.getByText('Southbound')).toBeVisible();
    await expect(canvas.getByText('GL02')).toBeVisible();
    await expect(canvas.getByText('GL26')).toBeVisible();
  },
};

/** Property 1=i, MRT 3: on its yellow, dark words and dark badges (Background/surface-inverse). */
export const MetroRailWayThree: Story = {
  args: {
    ride: { kind: 'rail', railway: 'MRT-3', bound: 'Southbound', originCode: 'YL01' },
    routeOrigin: 'North Avenue',
    endPoints: trainRow('Taft Avenue', 'YL13'),
  },
};

/** Property 1=Variant7, LRT 2: the purple card. Its badge says "LRT 2". */
export const LightRailWayTwo: Story = {
  args: {
    ride: { kind: 'rail', railway: 'LRT-2', bound: 'Westbound', originCode: 'PL13' },
    routeOrigin: 'Antipolo',
    endPoints: trainRow('Recto', 'PL01'),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('LRT 2')).toBeVisible();
  },
};

/** Property 1=Variant8, Ferry: its badge only; the ferry has no bound and no station codes. */
export const Ferry: Story = {
  args: {
    ride: { kind: 'rail', railway: 'Ferry', bound: null, originCode: null },
    routeOrigin: 'Escolta',
    endPoints: trainRow('Pinagbuhatan', null),
  },
};

/** The studio's (its editors keep Selected): a card Selected, or let go, by a tap off its rows. */
const studio = (state: 'rest' | 'selected') => ({ selection: { state, onSelect: fn() } });

/**
 * In the studio, Selected: pressed in under Route/RouteCardPrimarySelected; nothing else changes.
 * On the public map a card wears it only while a finger is down on it.
 */
export const Selected: Story = { args: { ...studio('selected') } };

/** Selected, on a light card: pressed in under Route/RouteCardInverseSelected. */
export const UvExpressSelected: Story = {
  args: { ...UvExpress.args, ...studio('selected') },
};

/** Selected, a train: as Jeep. */
export const LightRailWayOneSelected: Story = {
  args: { ...LightRailWayOne.args, ...studio('selected') },
};

/** Every destination is listed, however many: the card grows, and nothing is cut to "+N more". */
export const AllDestinations: Story = {
  args: {
    routeOrigin: 'SM Fairview',
    endPoints: roadRows([
      'Tala',
      'Novaliches (Bayan)',
      'Quiapo',
      'Cubao',
      'Lagro',
      'Fatima',
      'Philcoa',
      'Lawton',
      'Blumentritt',
    ]),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByTestId('chooser-item')).toHaveLength(9);
  },
};

/** A place or a destination too long for one line wraps; it is never cut. */
export const LongNames: Story = {
  args: {
    routeOrigin: 'Fairview Teraccess Transport Terminal',
    endPoints: roadRows(['Novaliches (Bayan) via Zabarte and Quirino Highway']),
  },
};

/** A long station name on a train card: the codes keep their room at the right. */
export const LongStationName: Story = {
  args: {
    ride: LRT_1,
    routeOrigin: 'Fernando Poe Jr. (formerly Roosevelt) Station',
    endPoints: trainRow('Dr. Santos (formerly Sucat) Station', 'GL26'),
  },
};

/** A station the line's table does not know, and a bound not known: no badge, never a guess. */
export const MissingCodeAndBound: Story = {
  args: {
    ride: { kind: 'rail', railway: 'LRT-1', bound: null, originCode: null },
    routeOrigin: 'Fernando Poe Jr.',
    endPoints: trainRow('North Triangle', null),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/bound$/)).toBeNull();
    await expect(canvas.queryByText(/^GL/)).toBeNull();
  },
};

/** A ride Figma draws no badge for (P2P, tricycle): the card starts at its place. */
export const NoMode: Story = {
  args: {
    ride: { kind: 'road', livery: 'uv-express', vehicle: null },
    routeOrigin: 'UP Diliman',
    endPoints: roadRows(['UPLB']),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('UV Express')).toBeNull();
  },
};

/**
 * A row opens its direction straight away; a tap anywhere else on the card — its name, the room
 * around its rows — opens its first row's, the card one button named for its place and that row.
 */
export const ARowOpens: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;
    // A finger on a row lands on the row, drawn over the name's target.
    const row = canvas.getByText('Novaliches');
    const box = row.getBoundingClientRect();
    const under = doc.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    await expect(under?.closest('[data-testid]')?.getAttribute('data-testid')).toBe('chooser-item');
    await userEvent.click(row);
    await expect(args.onPick).toHaveBeenLastCalledWith('1');
    // Below the last row, the card's own room is the name's: it opens the first row's direction.
    const card = canvas.getByTestId('chooser-origin').getBoundingClientRect();
    const room = doc.elementFromPoint(card.x + card.width / 2, card.bottom - 3);
    await expect(room?.getAttribute('data-testid')).toBe('chooser-select');
    await expect(room).toHaveAccessibleName('Tala, to SM Fairview');
    await expect(room).not.toHaveAttribute('aria-pressed');
    if (room) await userEvent.click(room);
    await expect(args.onPick).toHaveBeenLastCalledWith('0');
  },
};

/**
 * Pressed, on the public map: while a finger is down on the card off its rows, it is pressed in
 * under the Selected shadow (`data-pressed`); let go, it rests again. It is never Selected.
 */
export const Pressed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByTestId('chooser-origin');
    const target = canvas.getByTestId('chooser-select');
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await waitFor(() => expect(card).toHaveAttribute('data-pressed', 'true'));
    await expect(card).toHaveAttribute('data-state', 'rest');
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await waitFor(() => expect(card).not.toHaveAttribute('data-pressed'));
  },
};

/** In the studio, Selected, a row still opens its direction; a tap on the card lets it go. */
export const SelectedRowsOpen: Story = {
  args: studio('selected'),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Novaliches'));
    await expect(args.onPick).toHaveBeenCalledWith('1');
    await userEvent.click(canvas.getByRole('button', { name: 'Tala', pressed: true }));
    await expect(args.selection?.onSelect).toHaveBeenCalledTimes(1);
  },
};

/**
 * A row's State=Pressed (RouteEndPointBar, 3848:11928): press and hold a row and it wears the
 * card's darker step while the finger is down, then opens its trip as it lets go. A browser state,
 * `:active`: hold it to see it, on each card.
 */
export const RowPressed: Story = {
  render: (args) => (
    <div className="flex flex-col">
      {[
        Jeep,
        UvExpress,
        Ejeep,
        Bus,
        LightRailWayOne,
        MetroRailWayThree,
        LightRailWayTwo,
        Ferry,
      ].map((story, i) => (
        <RouteCard key={i} {...args} {...story.args} />
      ))}
    </div>
  ),
};

/** At a phone's sheet at Low (sheetGesture's LOW_PX): a long place name cut to one line. */
export const OnPhoneAtLow: Story = {
  args: { routeOrigin: 'Fairview Teraccess Transport Terminal' },
  decorators: [
    (Story) => (
      <div className="@container w-97.5" data-floats="card" data-snap="low">
        <Story />
      </div>
    ),
  ],
};
