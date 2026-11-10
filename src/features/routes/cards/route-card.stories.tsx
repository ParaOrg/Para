import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteCard, type RouteCardEndPoint, type RouteCardRide } from './route-card';

/** Rows to the given places, with no station codes. */
const roadRows = (places: readonly string[]): RouteCardEndPoint[] =>
  places.map((place, i) => ({ id: String(i), routeDirection: place, stationCode: null }));

/** One train row, to a station and its code. */
const trainRow = (place: string, code: string | null): RouteCardEndPoint[] => [
  { id: 'a', routeDirection: place, stationCode: code },
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
    state: 'rest',
    routeOrigin: 'Tala',
    endPoints: roadRows(['SM Fairview', 'Novaliches']),
    onSelect: fn(),
    onPick: fn(),
    testId: 'chooser',
  },
} satisfies Meta<typeof RouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Property 1=Default, Jeep: Card/Jeep under Route/RouteCardPrimary and the Primary Blob; its badge
 * Card/Jeep/surface on Card/Bus/on-surface. The place in SN Pro Bold 24/32, the rows Medium 17/24.
 */
export const Jeep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const place = getComputedStyle(canvas.getByTestId('chooser-select'));
    await expect(place.fontSize).toBe('24px');
    await expect(place.lineHeight).toBe('32px');
    await expect(place.fontWeight).toBe('700');
    await expect(canvas.getByText('Jeep')).toBeVisible();
    // Each row is 32 tall (Figma's RouteEndPointBar inside RouteCard).
    const [row] = canvas.getAllByTestId('chooser-item');
    await expect(row?.getBoundingClientRect().height).toBe(32);
  },
};

/** Property 1=Variant2, UV Express: a light card, dark words, under Route/RouteCardInverse; a dark badge. */
export const UvExpress: Story = {
  args: {
    ride: { kind: 'road', livery: 'uv-express', vehicle: 'UV Express' },
    routeOrigin: 'SM Fairview',
    endPoints: roadRows(['SM North', 'Buendia']),
  },
};

/** Property 1=Variant3, E-Jeep: as UV Express, in Card/Ejeep. */
export const Ejeep: Story = {
  args: {
    ride: { kind: 'road', livery: 'ejeep', vehicle: 'E-Jeep' },
    routeOrigin: 'Palmer',
    endPoints: roadRows(['SM Fairview', 'Novaliches', 'Philcoa', 'Cubao']),
  },
};

/** Property 1=Bus: Card/Bus under Route/RouteCardPrimary. */
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

/** Selected: pressed in under Route/RouteCardPrimarySelected; nothing else changes. */
export const Selected: Story = { args: { state: 'selected' } };

/** Selected, on a light card: pressed in under Route/RouteCardInverseSelected. */
export const UvExpressSelected: Story = { args: { ...UvExpress.args, state: 'selected' } };

/** Selected, a train: as Jeep. */
export const LightRailWayOneSelected: Story = {
  args: { ...LightRailWayOne.args, state: 'selected' },
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
 * around its rows — selects it.
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
    await expect(args.onPick).toHaveBeenCalledWith('1');
    await expect(args.onSelect).not.toHaveBeenCalled();
    // Below the last row, the card's own room is the name's.
    const card = canvas.getByTestId('chooser-origin').getBoundingClientRect();
    const room = doc.elementFromPoint(card.x + card.width / 2, card.bottom - 3);
    await expect(room?.getAttribute('data-testid')).toBe('chooser-select');
    if (room) await userEvent.click(room);
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};

/** Selected, a row still opens its direction; a tap on the card lets it go. */
export const SelectedRowsOpen: Story = {
  args: { state: 'selected' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Novaliches'));
    await expect(args.onPick).toHaveBeenCalledWith('1');
    await userEvent.click(canvas.getByRole('button', { name: 'Tala', pressed: true }));
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
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
