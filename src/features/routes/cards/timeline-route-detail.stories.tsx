import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TimelineRouteDetail } from './timeline-route-detail';
import { LIVERIES } from '../model/liveries';

/**
 * A trip's stops on their own, as TimelineRouteDetailCard insets them: one story a state, and the
 * pick in each livery. Long names and the taps, Set as start's among them, are
 * TimelineRouteDetailCard's stories. Sample data only: the places of Figma's frames (3762:3546),
 * not the real map.
 */
const hintuans = (...labels: string[]) => labels.map((label, i) => ({ id: 'h' + i, label }));
const talaToNovaliches = hintuans(
  'Barracks',
  'Malaria',
  'Pangarap',
  'Amparo',
  'Fatima',
  'Lagro',
  'SM Fairview',
  'Bistek',
  'Greenfields',
  'Bestlink',
);

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

/** Taps the card's foot, View more or View less, and lets go of it: a tap draws no focus ring. */
const tapViewMore = async (canvasElement: HTMLElement) => {
  const button = within(canvasElement).getByTestId('trip-view-more');
  await userEvent.click(button);
  button.blur();
};

/** Opens the stops with View more, as a rider's tap would. */
const viewMore: Story['play'] = async ({ canvasElement }) => {
  await tapViewMore(canvasElement);
  await expect(within(canvasElement).getByTestId('trip-view-more')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
};

/** Every row, the origin first and the destination last. */
const rowsOf = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>('[data-testid="trip"] ol > li'),
];

/** Each row's rail (`data-rail` on its rail column), the origin first. */
const railsOf = (canvasElement: HTMLElement) =>
  rowsOf(canvasElement).map((row) => row.querySelector('[data-rail]')?.getAttribute('data-rail'));

/** Each row's S or E in its slot, or null, the origin first. */
const signsOf = (canvasElement: HTMLElement) =>
  rowsOf(canvasElement).map(
    (row) =>
      row.querySelector('[data-part="start"], [data-part="end"]')?.getAttribute('data-part') ??
      null,
  );

/** The rails and the signs a story's rows wear, the origin first. */
const expectRows = async (
  { canvasElement }: PlayContext,
  rails: readonly string[],
  signs: readonly (string | null)[],
) => {
  await expect(railsOf(canvasElement)).toEqual(rails);
  await expect(signsOf(canvasElement)).toEqual(signs);
};

/** `n` rows of one rail. */
const times = <T,>(n: number, value: T): T[] => Array.from({ length: n }, () => value);

/** Nothing picked, `n` hintuans: every row on the rail, S on the origin and E on the destination. */
const atRest = (n: number) => ({
  rails: ['below', ...times(n, 'through'), 'above'],
  signs: ['start', ...times(n, null), 'end'],
});

/** The stops opened, as any pick opens them: no clip, nothing out of reach, View less. */
const expectOpened = async ({ canvasElement }: PlayContext) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByTestId('trip').className).not.toContain('max-h-30');
  await expect(canvas.getByTestId('trip-view-more')).toHaveAttribute('aria-expanded', 'true');
  await expect(canvas.getByTestId('trip-view-more').textContent).toBe('View less');
  await expect(rowsOf(canvasElement).filter((row) => row.inert)).toHaveLength(0);
};

/** Opened by the pick, with the rows it draws. */
const pickedRows =
  (rails: readonly string[], signs: readonly (string | null)[]) => async (ctx: PlayContext) => {
    await expectOpened(ctx);
    await expectRows(ctx, rails, signs);
  };

/** Tala → Novaliches, Amparo (h3) picked: the ride from Tala to it, the rest standing alone. */
const amparoPicked = pickedRows(
  ['below', 'through', 'through', 'through', 'above', ...times(7, 'disconnected')],
  ['start', null, null, null, 'end', ...times(7, null)],
);

const meta = {
  title: 'Features/Routes/TimelineRouteDetail',
  component: TimelineRouteDetail,
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface px-3 pt-3 pb-6">
        <Story />
      </div>
    ),
  ],
  args: {
    livery: 'jeep',
    routeOrigin: 'Tala',
    hintuans: talaToNovaliches,
    routeDirection: 'Novaliches',
    picked: null,
    onPick: fn(),
    pickedPesos: '₱20–22',
    onEnd: fn(),
    endPicked: null,
  },
} satisfies Meta<typeof TimelineRouteDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Folded, as it opens (RouteStopsCard Behavior=Shrink, 4681:29137): every stop drawn, the card cut
 * at 120, Tala and the top of Barracks in sight, View more on its foot. The rows under the cut,
 * every hintuan after the first and the destination, are out of a keyboard's reach.
 */
export const Folded: Story = {
  play: async (ctx) => {
    const { canvasElement } = ctx;
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trip').className).toContain('max-h-30');
    const button = canvas.getByTestId('trip-view-more');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button.textContent).toBe('View more');
    await expect(rowsOf(canvasElement).map((row) => row.inert)).toEqual([
      false,
      false,
      ...times(talaToNovaliches.length, true),
    ]);
    const { rails, signs } = atRest(talaToNovaliches.length);
    await expectRows(ctx, rails, signs);
  },
};

/** Opened by View more (Behavior=Expand): every stop, then View less on the card's foot. */
export const Opened: Story = {
  play: async (ctx) => {
    await viewMore(ctx);
    await expectOpened(ctx);
  },
};

/** Opened, then View less: folded again, the card cut at 120 as it opened. */
export const FoldedAgain: Story = {
  play: async (ctx) => {
    const { canvasElement } = ctx;
    await tapViewMore(canvasElement);
    await tapViewMore(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trip').className).toContain('max-h-30');
    await expect(canvas.getByTestId('trip-view-more')).toHaveAttribute('aria-expanded', 'false');
    await expect(rowsOf(canvasElement).at(-1)?.inert).toBe(true);
  },
};

/** One hintuan on the way: still folded, the destination under the cut until View more. */
export const OneHintuan: Story = {
  args: { routeOrigin: 'Fatima', hintuans: hintuans('Lagro'), routeDirection: 'SM Fairview' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('trip-view-more')).toBeTruthy();
    await expect(rowsOf(canvasElement).map((row) => row.inert)).toEqual([false, false, true]);
  },
};

/** None on the way yet: the rail runs straight from the origin to the end, and nothing folds. */
export const NoHintuan: Story = {
  args: { routeOrigin: 'Lagro', hintuans: [], routeDirection: 'SM Fairview' },
  play: async (ctx) => {
    const canvas = within(ctx.canvasElement);
    await expect(canvas.queryByTestId('trip-view-more')).toBeNull();
    await expect(canvas.getByTestId('trip').className).not.toContain('max-h-30');
    await expectRows(ctx, ['below', 'above'], ['start', 'end']);
  },
};

/** Bus (Figma draws the Timeline set in red). */
export const Bus: Story = { args: { livery: 'bus' } };

/** E-Jeep: a light card, dark words. */
export const Ejeep: Story = { args: { livery: 'ejeep' } };

/** UV Express: a light card, dark words. */
export const UvExpress: Story = { args: { livery: 'uv-express' } };

/**
 * A hintuan picked, which opens the stops: its dot the Selected one, End's E in its slot with its
 * pill of the pesos to there, Set as start under it when there is a button for it. The ride runs
 * on the rail from the origin, its S, down to it; the rows after it stand alone (Unselected), the
 * destination without its E.
 */
export const HintuanPicked: Story = { args: { picked: 'h3' }, play: amparoPicked };

/**
 * A hintuan picked, then View less: the stops folded again by the rider, the pick kept. Amparo is
 * under the cut now, out of a keyboard's reach until View more.
 */
export const HintuanPickedFoldedAgain: Story = {
  args: { picked: 'h3' },
  play: async ({ canvasElement }) => {
    await tapViewMore(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trip').className).toContain('max-h-30');
    const amparo = canvasElement.querySelector<HTMLElement>('[data-hintuan="h3"]');
    await expect(amparo?.dataset.state).toBe('selected');
    await expect(amparo?.inert).toBe(true);
  },
};

/** The last hintuan picked: the rail runs to it, and only the destination stands alone. */
export const LastHintuanPicked: Story = {
  args: { picked: 'h9' },
  play: pickedRows(
    ['below', ...times(9, 'through'), 'above', 'disconnected'],
    ['start', ...times(9, null), 'end', null],
  ),
};

/** Picked, bus: the pill in the card's own colours, swapped. */
export const HintuanPickedBus: Story = {
  args: { livery: 'bus', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, E-Jeep: the light card's pill, on-surface under the card's colour. */
export const HintuanPickedEjeep: Story = {
  args: { livery: 'ejeep', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, UV Express: as E-Jeep's. */
export const HintuanPickedUvExpress: Story = {
  args: { livery: 'uv-express', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, Jeep: the pill white, as Bus's. */
export const HintuanPickedJeep: Story = {
  args: { livery: 'jeep', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, ferry: the card's own colours carry over. */
export const HintuanPickedFerry: Story = {
  args: { livery: 'ferry', picked: 'h3' },
  play: amparoPicked,
};

/**
 * A train's ends carry their station codes in their slots, beside S and E. Sample codes on the
 * sample stops.
 */
const expectEndCodes =
  (originCode: string, destinationCode: string) =>
  async ({ canvasElement }: PlayContext) => {
    const rows = rowsOf(canvasElement);
    await expect(rows[0]?.textContent).toContain(originCode);
    await expect(rows.at(-1)?.textContent).toContain(destinationCode);
  };

/** LRT-1: the rail in Map/Rail/LightRailWayOne/Timeline/surface, Content/inverse words (4074:7402). */
export const LightRailWayOne: Story = {
  args: { livery: 'light-rail-way-one', originCode: 'GL02', destinationCode: 'GL13' },
  play: expectEndCodes('GL02', 'GL13'),
};

/** Picked, LRT-1: the pill white, the station's code and pesos in the line's Timeline/surface, as Figma's frame draws it. */
export const HintuanPickedLightRailWayOne: Story = {
  args: { ...LightRailWayOne.args, picked: 'h3', pickedCode: 'GL04' },
  play: amparoPicked,
};

/** LRT-2: the rail in Map/Rail/LightRailWayTwo/Timeline/surface, Content/inverse words (4080:4124). */
export const LightRailWayTwo: Story = {
  args: { livery: 'light-rail-way-two', originCode: 'PL01', destinationCode: 'PL12' },
  play: expectEndCodes('PL01', 'PL12'),
};

/** Picked, LRT-2: the pill white, the station's code and pesos in the line's Timeline/surface, as Figma's frame draws it. */
export const HintuanPickedLightRailWayTwo: Story = {
  args: { ...LightRailWayTwo.args, picked: 'h3', pickedCode: 'PL04' },
  play: amparoPicked,
};

/** MRT-3: the rail in Map/Rail/MetroRailWayThree/Timeline/surface, Content/primary, dark, words (4080:4241). */
export const MetroRailWayThree: Story = {
  args: { livery: 'metro-rail-way-three', originCode: 'YL01', destinationCode: 'YL12' },
  play: expectEndCodes('YL01', 'YL12'),
};

/** Ferry: the rail in Map/Ferry/Timeline/surface. Figma draws no ferry trip yet; the card's own colours carry over. */
export const Ferry: Story = { args: { livery: 'ferry' } };

/** Picked, MRT-3: the pill white, the station's code and pesos in the line's Timeline/surface, as Figma's frame draws it. */
export const HintuanPickedMetroRailWayThree: Story = {
  args: { ...MetroRailWayThree.args, picked: 'h3', pickedCode: 'YL06' },
  play: amparoPicked,
};

/** One hintuan on the way, picked: the stops opened, the ride from Fatima to it. */
export const OneHintuanPicked: Story = {
  args: {
    routeOrigin: 'Fatima',
    hintuans: hintuans('Lagro'),
    routeDirection: 'SM Fairview',
    picked: 'h0',
    pickedPesos: '₱14',
  },
  play: pickedRows(['below', 'above', 'disconnected'], ['start', 'end', null]),
};

/** A hintuan picked but unpriced: no pill. */
export const HintuanPickedUnpriced: Story = {
  args: { picked: 'h3', pickedPesos: undefined },
  play: async (ctx) => {
    await amparoPicked(ctx);
    await expect(within(ctx.canvasElement).queryByTestId('trip-hintuan-fare')).toBeNull();
  },
};

/** The origin picked from its row: its dot the Selected one; the whole trip on the rail. */
export const OriginPicked: Story = {
  args: { endPicked: 'from' },
  play: async (ctx) => {
    await expectOpened(ctx);
    await expect(within(ctx.canvasElement).getByTestId('trip-origin').dataset.state).toBe(
      'selected',
    );
  },
};

/** The destination picked from its row: its dot the Selected one; the whole trip on the rail. */
export const DestinationPicked: Story = {
  args: { endPicked: 'to' },
  play: async (ctx) => {
    await expectOpened(ctx);
    await expect(within(ctx.canvasElement).getByTestId('trip-destination').dataset.state).toBe(
      'selected',
    );
  },
};

/**
 * Every row's State=Pressed (Timeline, 3716:1894): press and hold a row — where it leaves from, a
 * hintuan (Pangarap is picked, so a Selected one too), where it goes — and it wears the rail's
 * colour while the finger or the mouse is down. A browser state, `:active`, so there is nothing to
 * set: hold it to see it, in each livery. The pick opens the stops, so every row is there to hold.
 */
export const RowPressed: Story = {
  args: { picked: 'h2', pickedPesos: '₱14' },
  render: (args) => (
    <div className="flex flex-col gap-8">
      {LIVERIES.map((livery) => (
        <TimelineRouteDetail key={livery} {...args} livery={livery} />
      ))}
    </div>
  ),
};

/**
 * Figma's TimelineRouteDetail (4137:9886), on its example: MRT-3 Southbound, North Avenue YL01 to
 * Taft Avenue YL13. Station names and codes as the line's tables have them (rail-codes.ts).
 */
const mrt3 = hintuans(
  'Quezon Avenue',
  'GMA Kamuning',
  'Araneta Center-Cubao',
  'Santolan-Annapolis',
  'Ortigas',
  'Shaw Boulevard',
  'Boni',
  'Guadalupe',
  'Buendia',
  'Ayala',
  'Magallanes',
);
const [quezon, shaw, ayala] = ['h0', 'h5', 'h9'];
const onMrt3 = {
  livery: 'metro-rail-way-three',
  routeOrigin: 'North Avenue',
  hintuans: mrt3,
  routeDirection: 'Taft Avenue',
  originCode: 'YL01',
  destinationCode: 'YL13',
  onSetStart: fn(),
  onRemoveStart: fn(),
} as const;

/** Rows of MRT-3's eleven stations standing alone. */
const alone = (n: number) => times(n, 'disconnected');

/** Variant6 (4157:7737): folded, S and YL01 at North Avenue, E and YL13 at Taft Avenue. */
export const RideFolded: Story = {
  args: onMrt3,
  play: async (ctx) => {
    await expectEndCodes('YL01', 'YL13')(ctx);
    await expect(signsOf(ctx.canvasElement)).toEqual(atRest(mrt3.length).signs);
  },
};

/** Rest (4137:9884): opened, nothing picked; the rail end to end. */
export const RideRest: Story = {
  args: onMrt3,
  play: async (ctx) => {
    await viewMore(ctx);
    const { rails, signs } = atRest(mrt3.length);
    await expectRows(ctx, rails, signs);
  },
};

/**
 * Choosing (4137:9887): Shaw Boulevard tapped is the end, E and its pill, Set as start under it;
 * the ride from North Avenue down to it, the stations after it standing alone.
 */
export const RideChoosing: Story = {
  args: { ...onMrt3, picked: shaw, pickedCode: 'YL07', pickedPesos: '₱10' },
  play: async (ctx) => {
    await pickedRows(
      ['below', ...times(5, 'through'), 'above', ...alone(6)],
      ['start', ...times(5, null), 'end', ...times(6, null)],
    )(ctx);
    const shawRow = ctx.canvasElement.querySelector<HTMLElement>(`[data-hintuan="${shaw}"]`);
    await expect(shawRow?.textContent).toContain('Set as start');
  },
};

/**
 * Variant3 (4148:12161): after Set as start, Shaw Boulevard is the start, × Remove as start under
 * it, its pill its code alone. A start alone is no ride yet: every station stands alone. North
 * Avenue loses its S and Taft Avenue has no E until an end is picked.
 */
export const RideStartPicked: Story = {
  args: { ...onMrt3, start: shaw, startCode: 'YL07' },
  play: pickedRows(alone(13), [...times(6, null), 'start', ...times(6, null)]),
};

/** A start alone on the first station, Quezon Avenue: every station alone, North Avenue too. */
export const RideStartFirst: Story = {
  args: { ...onMrt3, start: quezon, startCode: 'YL02' },
  play: pickedRows(alone(13), [null, 'start', ...times(11, null)]),
};

/** A start alone on the last station, Magallanes: every station alone, Taft Avenue too. */
export const RideStartLast: Story = {
  args: { ...onMrt3, start: 'h10', startCode: 'YL12' },
  play: pickedRows(alone(13), [...times(11, null), 'start', null]),
};

/** A jeep's start alone: its S and × Remove as start, no pill, no code to say and no ride to price. */
export const RideStartJeep: Story = {
  args: { start: 'h2', onSetStart: fn(), onRemoveStart: fn() },
  play: pickedRows(alone(12), [null, null, null, 'start', ...times(8, null)]),
};

/**
 * Variant4 (4151:13124): start at Shaw Boulevard, Ayala tapped: the ride Shaw Boulevard → Ayala on
 * the rail, every station outside it alone. The S's pill its code alone, the E's its code and the
 * ride's pesos.
 */
export const RideStartAndEnd: Story = {
  args: {
    ...onMrt3,
    start: shaw,
    startCode: 'YL07',
    picked: ayala,
    pickedCode: 'YL11',
    pickedPesos: '₱8',
  },
  play: pickedRows(
    [...alone(6), 'below', ...times(3, 'through'), 'above', ...alone(2)],
    [...times(6, null), 'start', ...times(3, null), 'end', null, null],
  ),
};

/**
 * Variant5 (4151:13619): Shaw Boulevard the start, then Quezon Avenue tapped above it, the end: E
 * above S, the S's pill its code, the E's its code and the pesos, the ride between them ridden back
 * along the line (the row tapped becomes the end, not the new start).
 */
export const RideEndAboveStart: Story = {
  args: {
    ...onMrt3,
    start: shaw,
    startCode: 'YL07',
    picked: quezon,
    pickedCode: 'YL02',
    pickedPesos: '₱13',
  },
  play: pickedRows(
    ['disconnected', 'below', ...times(4, 'through'), 'above', ...alone(6)],
    [null, 'end', ...times(4, null), 'start', ...times(6, null)],
  ),
};

/**
 * Shaw Boulevard the start, then Taft Avenue's row tapped: the ride from Shaw Boulevard on to it,
 * its E on Taft Avenue with its pill, YL13 and the pesos.
 */
export const RideStartToDestination: Story = {
  args: {
    ...onMrt3,
    start: shaw,
    startCode: 'YL07',
    endPicked: 'to',
    pickedCode: 'YL13',
    pickedPesos: '₱13',
  },
  play: pickedRows(
    [...alone(6), 'below', ...times(5, 'through'), 'above'],
    [...times(6, null), 'start', ...times(5, null), 'end'],
  ),
};

/**
 * Shaw Boulevard the start, then North Avenue's row tapped: the ride back from Shaw Boulevard to
 * it, as an end above the start, its E on North Avenue with its pill, YL01 and the pesos.
 */
export const RideStartToOrigin: Story = {
  args: {
    ...onMrt3,
    start: shaw,
    startCode: 'YL07',
    endPicked: 'from',
    pickedCode: 'YL01',
    pickedPesos: '₱13',
  },
  play: pickedRows(
    ['below', ...times(5, 'through'), 'above', ...alone(6)],
    ['end', ...times(5, null), 'start', ...times(6, null)],
  ),
};

/** A jeep's ride between two hintuans: the pesos alone in the pill, the same buttons. */
export const RideStartAndEndJeep: Story = {
  args: { start: 'h2', picked: 'h6', pickedPesos: '₱14', onSetStart: fn(), onRemoveStart: fn() },
  play: pickedRows(
    [...alone(3), 'below', ...times(3, 'through'), 'above', ...alone(4)],
    [null, null, null, 'start', null, null, null, 'end', ...times(4, null)],
  ),
};

/** LRT-2 from Antipolo to Recto, in bus, as Figma's frames draw it, YL60 for every pick. */
const lrt2 = hintuans(
  'Marikina-Pasig',
  'Santolan',
  'Katipunan',
  'Anonas',
  'Betty Go - Belmonte',
  'Gilmore',
  'J. Ruiz',
  'V. Mapa',
  'Pureza',
  'Legarda',
);
const [katipunan, jRuiz, vMapa] = ['h2', 'h6', 'h7'];
const onLrt2 = {
  livery: 'bus',
  routeOrigin: 'Antipolo',
  hintuans: lrt2,
  routeDirection: 'Recto',
  pickedCode: 'YL60',
  pickedPesos: '₱13-24',
  onSetStart: fn(),
  onRemoveStart: fn(),
} as const;

/**
 * An end alone at V. Mapa (4189:11483): the ride from Antipolo down to it on the rail; Pureza,
 * Legarda and Recto after it stand alone.
 */
export const RideEnd: Story = {
  args: { ...onLrt2, picked: vMapa },
  play: pickedRows(
    ['below', ...times(7, 'through'), 'above', ...alone(3)],
    ['start', ...times(7, null), 'end', null, null, null],
  ),
};

/**
 * S Katipunan, E J. Ruiz (4194:12702): the ride from Katipunan to J. Ruiz on the rail; Antipolo,
 * Marikina-Pasig and Santolan above it and V. Mapa on to Recto after it stand alone.
 */
export const RideStartAndEndBetween: Story = {
  args: { ...onLrt2, start: katipunan, startCode: 'YL60', picked: jRuiz },
  play: pickedRows(
    [...alone(3), 'below', ...times(3, 'through'), 'above', ...alone(4)],
    [null, null, null, 'start', null, null, null, 'end', ...times(4, null)],
  ),
};

// A loop (UP – Ikot): it leaves from its tip and comes back to it, so the top
// and the bottom row are one place, and a ride only goes forward round it.
const loopRows = hintuans(
  'Palma Hall',
  'Quezon Hall',
  'Sunken Garden',
  'Engineering',
  'Math Building',
);
const onLoop = {
  livery: 'bus',
  routeOrigin: 'Oblation',
  routeDirection: 'Oblation',
  hintuans: loopRows,
  isLoop: true,
} as const;

/** A loop at rest: the tip is both ends, S on top and E at the bottom, the rail end to end. */
export const LoopRest: Story = {
  args: onLoop,
  play: async (ctx) => {
    await viewMore(ctx);
    const { rails, signs } = atRest(loopRows.length);
    await expectRows(ctx, rails, signs);
  },
};

/** A loop with a hintuan tapped: the ride goes from the tip forward to it. */
export const LoopPicked: Story = {
  args: { ...onLoop, picked: 'h2' },
  play: pickedRows(
    ['below', 'through', 'through', 'above', ...alone(3)],
    ['start', null, null, 'end', null, null, null],
  ),
};

/**
 * A loop's ride that wraps: started at Engineering, ended at Quezon Hall above it. The rail runs
 * from the start down to the tip and on from the top to the end; Sunken Garden, between the end
 * and the start, stands alone.
 */
export const LoopWrapRide: Story = {
  args: { ...onLoop, start: 'h3', picked: 'h1' },
  play: pickedRows(
    ['below', 'through', 'above', 'disconnected', 'below', 'through', 'above'],
    [null, null, 'end', null, 'start', null, null],
  ),
};

/** An end row picked with a start: on a loop either end is the tip, so the ride goes on round to it. */
export const LoopEndPickedWithStart: Story = {
  args: { ...onLoop, start: 'h2', endPicked: 'to' },
  play: pickedRows(
    [...alone(3), 'below', 'through', 'through', 'above'],
    [null, null, null, 'start', null, null, 'end'],
  ),
};
