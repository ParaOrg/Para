import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TimelineRouteDetail } from './timeline-route-detail';
import { LIVERIES } from '../model/liveries';

/**
 * A trip's stops on their own, on the sheet's surface as TripDetail lays them: one story a state,
 * and the pick in each livery. Every stop always shows: nothing folds. Long names and the taps, Set as start's among them, are
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

/** A pick's rows: the rails and the signs it draws. */
const pickedRows =
  (rails: readonly string[], signs: readonly (string | null)[]) => async (ctx: PlayContext) => {
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
      <div className="w-[393px] bg-bg-surface pb-6">
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
 * Picking off, as the public map has it: no row is a control, Start on the origin and End on the
 * destination, under "Route Stops".
 */
export const PickingOff: Story = {
  args: { onPick: undefined, onEnd: undefined },
  play: async (ctx) => {
    const canvas = within(ctx.canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Route Stops' })).toBeVisible();
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expectRows(
      ctx,
      atRest(talaToNovaliches.length).rails,
      atRest(talaToNovaliches.length).signs,
    );
  },
};

/** One hintuan on the way: the origin, Lagro and the destination, all on the rail. */
export const OneHintuan: Story = {
  args: { routeOrigin: 'Fatima', hintuans: hintuans('Lagro'), routeDirection: 'SM Fairview' },
  play: async (ctx) => {
    const { rails, signs } = atRest(1);
    await expectRows(ctx, rails, signs);
  },
};

/** None on the way yet: the rail runs straight from the origin to the end. */
export const NoHintuan: Story = {
  args: { routeOrigin: 'Lagro', hintuans: [], routeDirection: 'SM Fairview' },
  play: async (ctx) => {
    await expectRows(ctx, ['below', 'above'], ['start', 'end']);
  },
};

/** Bus (Figma draws the Timeline set in red). */
export const Bus: Story = { args: { livery: 'bus' } };

/** E-Jeep: its rail in Text/primary, as its mode's colour does not stand out from the surface. */
export const Ejeep: Story = { args: { livery: 'ejeep' } };

/** UV Express: its rail in Text/primary, as E-Jeep's. */
export const UvExpress: Story = { args: { livery: 'uv-express' } };

/**
 * A hintuan picked: its dot the Selected one, End's E in its slot with its
 * pill of the pesos to there, Set as start under it when there is a button for it. The ride runs
 * on the rail from the origin, its S, down to it; the rows after it stand alone (Unselected), the
 * destination without its E.
 */
export const HintuanPicked: Story = { args: { picked: 'h3' }, play: amparoPicked };

/** The last hintuan picked: the rail runs to it, and only the destination stands alone. */
export const LastHintuanPicked: Story = {
  args: { picked: 'h9' },
  play: pickedRows(
    ['below', ...times(9, 'through'), 'above', 'disconnected'],
    ['start', ...times(9, null), 'end', null],
  ),
};

/** Picked, bus. */
export const HintuanPickedBus: Story = {
  args: { livery: 'bus', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, E-Jeep. */
export const HintuanPickedEjeep: Story = {
  args: { livery: 'ejeep', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, UV Express. */
export const HintuanPickedUvExpress: Story = {
  args: { livery: 'uv-express', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, Jeep. */
export const HintuanPickedJeep: Story = {
  args: { livery: 'jeep', picked: 'h3' },
  play: amparoPicked,
};

/** Picked, ferry. */
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

/** Picked, LRT-1: the station's code and the pesos, the pill's two halves. */
export const HintuanPickedLightRailWayOne: Story = {
  args: { ...LightRailWayOne.args, picked: 'h3', pickedCode: 'GL04' },
  play: amparoPicked,
};

/** LRT-2: the rail in Map/Rail/LightRailWayTwo/Timeline/surface, Content/inverse words (4080:4124). */
export const LightRailWayTwo: Story = {
  args: { livery: 'light-rail-way-two', originCode: 'PL01', destinationCode: 'PL12' },
  play: expectEndCodes('PL01', 'PL12'),
};

/** Picked, LRT-2: the station's code and the pesos, the pill's two halves. */
export const HintuanPickedLightRailWayTwo: Story = {
  args: { ...LightRailWayTwo.args, picked: 'h3', pickedCode: 'PL04' },
  play: amparoPicked,
};

/** MRT-3: the rail in card/MRTThree/fill, under "Trains Stations" (RouteHintuans, Railway, 4825:47950). */
export const MetroRailWayThree: Story = {
  args: { livery: 'metro-rail-way-three', originCode: 'YL01', destinationCode: 'YL12' },
  play: async (ctx) => {
    await expect(
      within(ctx.canvasElement).getByRole('heading', { name: 'Trains Stations' }),
    ).toBeVisible();
    const dot = dotOf(ctx.canvasElement.querySelector('[data-testid="trip"] ol > li'));
    await expect(dot && getComputedStyle(dot).backgroundColor).toBe(
      wornBy('bg-card-mrt-three-fill', 'backgroundColor'),
    );
    await expectEndCodes('YL01', 'YL12')(ctx);
  },
};

/** Ferry: the rail in its mode's colour. Figma draws no ferry trip yet. */
export const Ferry: Story = { args: { livery: 'ferry' } };

/** The EDSA Carousel: the train's trip in its red. Figma draws no Carousel trip of its own. */
export const EdsaCarousel: Story = { args: { livery: 'edsa-carousel' } };

/** Picked, MRT-3: the station's code and the pesos, the pill's two halves. */
export const HintuanPickedMetroRailWayThree: Story = {
  args: { ...MetroRailWayThree.args, picked: 'h3', pickedCode: 'YL06' },
  play: amparoPicked,
};

/** One hintuan on the way, picked: the ride from Fatima to it. */
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
    await expect(within(ctx.canvasElement).getByTestId('trip-origin').dataset.state).toBe(
      'selected',
    );
  },
};

/** The destination picked from its row: its dot the Selected one; the whole trip on the rail. */
export const DestinationPicked: Story = {
  args: { endPicked: 'to' },
  play: async (ctx) => {
    await expect(within(ctx.canvasElement).getByTestId('trip-destination').dataset.state).toBe(
      'selected',
    );
  },
};

/**
 * Every row's State=Pressed (Timeline, 3716:1894): press and hold a row — where it leaves from, a
 * hintuan (Pangarap is picked, so a Selected one too), where it goes — and it wears the rail's
 * colour while the finger or the mouse is down. A browser state, `:active`, so there is nothing to
 * set: hold it to see it, in each livery.
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

/** Rest (4137:9884): nothing picked; the rail end to end, S and YL01 at North Avenue, E and YL13 at Taft Avenue. */
export const RideRest: Story = {
  args: onMrt3,
  play: async (ctx) => {
    await expectEndCodes('YL01', 'YL13')(ctx);
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

/** The colour a token class paints, read off a probe wearing it: `property` is the computed style to read. */
const wornBy = (className: string, property: 'backgroundColor' | 'color') => {
  const probe = document.createElement('i');
  probe.className = className;
  document.body.append(probe);
  const colour = getComputedStyle(probe)[property];
  probe.remove();
  return colour;
};

/** The dot on a row's rail: its outer round, ringed or not. */
const dotOf = (row: Element | null | undefined) =>
  row?.querySelector<HTMLElement>('[data-rail] .rounded-full') ?? null;

/** A short sample trip: the origin, one hintuan, the destination. */
const shortTrip = {
  routeOrigin: 'Bagong Silang',
  hintuans: hintuans('Zabarte'),
  routeDirection: 'Novaliches Bayan',
} as const;

/** A short trip: the origin, one hintuan and the destination, every row on the rail. */
export const ShortTrip: Story = {
  args: shortTrip,
  play: async (ctx) => {
    const names = rowsOf(ctx.canvasElement).map((row) => row.textContent);
    await expect(names[0]).toContain('Bagong Silang');
    await expect(names[1]).toContain('Zabarte');
    await expect(names[2]).toContain('Novaliches Bayan');
    const { rails, signs } = atRest(1);
    await expectRows(ctx, rails, signs);
  },
};

const longTrip = hintuans(
  'Kaybiga',
  'Deparo',
  'Camarin',
  'Llano',
  'Bagbaguin',
  'Tullahan',
  'Sta. Quiteria',
  'Gulod',
  'Nagkaisang Nayon',
  'San Bartolome',
  'Sauyo',
  'Talipapa',
  'Baesa',
  'Bahay Toro',
);

/** Fourteen hintuans: every stop shown, one under the other, none hidden or cut. */
export const LongTrip: Story = {
  args: { routeOrigin: 'Bagumbong', hintuans: longTrip, routeDirection: 'Munoz' },
  play: async (ctx) => {
    const canvas = within(ctx.canvasElement);
    await expect(rowsOf(ctx.canvasElement)).toHaveLength(longTrip.length + 2);
    for (const { label } of longTrip) {
      await expect(canvas.getByText(label)).toBeVisible();
    }
    const { rails, signs } = atRest(longTrip.length);
    await expectRows(ctx, rails, signs);
  },
};

/**
 * Not drawn in Figma; built as today's behaviour, owner to confirm: a hintuan picked as the ride's
 * end. Its row wears the ringed dot where the rail stops, the End pill, and the pesos in their pill
 * on the surface (STOP_PILL).
 */
export const PickedStop: Story = {
  args: { picked: 'h3', onSetStart: fn() },
  play: async (ctx) => {
    const { canvasElement } = ctx;
    const amparo = canvasElement.querySelector<HTMLElement>('[data-hintuan="h3"]');
    await expect(amparo?.dataset.state).toBe('selected');
    await expect(amparo?.querySelector('[data-rail]')?.getAttribute('data-rail')).toBe('above');
    // Ringed: a white round inside the rail's colour.
    await expect(dotOf(amparo)?.querySelector('.bg-text-on-fill.size-5')).toBeTruthy();
    await expect(amparo?.querySelector('[data-part="end"]')?.parentElement?.textContent).toBe(
      'End',
    );
    const pill = within(canvasElement).getByTestId('trip-hintuan-fare');
    await expect(pill.textContent).toBe('₱20–22');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-bg-surface-secondary', 'backgroundColor'),
    );
    await expect(getComputedStyle(pill).color).toBe(wornBy('text-text-primary', 'color'));
    await expect(amparo?.textContent).toContain('Set as start');
    await amparoPicked(ctx);
  },
};

/**
 * Not drawn in Figma; built as today's behaviour, owner to confirm: a start set at Pangarap and an
 * end picked at Lagro. The Start pill moves from the origin to Pangarap's row, × Remove as start
 * under it; End and the pesos on Lagro's.
 */
export const PickedStart: Story = {
  args: { start: 'h2', picked: 'h5', pickedPesos: '₱14', onSetStart: fn(), onRemoveStart: fn() },
  play: async (ctx) => {
    const { canvasElement, args } = ctx;
    const canvas = within(canvasElement);
    const pangarap = canvasElement.querySelector<HTMLElement>('[data-hintuan="h2"]');
    const lagro = canvasElement.querySelector<HTMLElement>('[data-hintuan="h5"]');
    await expect(canvas.getByTestId('trip-origin').querySelector('[data-part="start"]')).toBeNull();
    await expect(pangarap?.querySelector('[data-part="start"]')).toBeTruthy();
    await expect(lagro?.querySelector('[data-part="end"]')).toBeTruthy();
    await expect(within(lagro ?? canvasElement).getByTestId('trip-hintuan-fare').textContent).toBe(
      '₱14',
    );
    const remove = within(pangarap ?? canvasElement).getByRole('button', {
      name: 'Remove as start',
    });
    await userEvent.click(remove);
    await expect(args.onRemoveStart).toHaveBeenCalledTimes(1);
  },
};

/**
 * Not drawn in Figma; built as today's behaviour, owner to confirm: a ride picked mid-route, Amparo
 * to Bistek. The rows before the start and after the end are outside it: each keeps its dot, off
 * the rail, and its name stays Text/primary.
 */
export const OutsideTheRide: Story = {
  args: { start: 'h3', picked: 'h7', pickedPesos: '₱14', onSetStart: fn(), onRemoveStart: fn() },
  play: async (ctx) => {
    const { canvasElement } = ctx;
    await expectRows(
      ctx,
      [
        ...times(4, 'disconnected'),
        'below',
        ...times(3, 'through'),
        'above',
        ...times(3, 'disconnected'),
      ],
      [...times(4, null), 'start', null, null, null, 'end', null, null, null],
    );
    const primary = wornBy('text-text-primary', 'color');
    const outside = rowsOf(canvasElement).filter(
      (row) => row.querySelector('[data-rail]')?.getAttribute('data-rail') === 'disconnected',
    );
    await expect(outside).toHaveLength(7);
    for (const row of outside) {
      await expect(dotOf(row)).toBeTruthy();
      const name = row.querySelector<HTMLElement>('[data-part="name"]') ?? row;
      await expect(getComputedStyle(name).color).toBe(primary);
    }
  },
};

const LIGHT_LIVERIES = ['uv-express', 'ejeep'] as const;

/**
 * Not drawn in Figma; built as today's behaviour, owner to confirm: the short trip on the liveries
 * whose own colour does not stand out from the surface, UV Express and E-Jeep. Their rail and dots
 * take Text/primary (TIMELINE_RAIL); MRT-3's is its yellow (MetroRailWayThree).
 */
export const LightLiveries: Story = {
  args: shortTrip,
  render: (args) => (
    <div className="flex flex-col gap-8">
      {LIGHT_LIVERIES.map((livery) => (
        <TimelineRouteDetail key={livery} {...args} livery={livery} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trips = [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="trip"]')];
    await expect(trips.map((trip) => trip.dataset.livery)).toEqual([...LIGHT_LIVERIES]);
    const primary = wornBy('bg-text-primary', 'backgroundColor');
    for (const trip of trips) {
      const dot = dotOf(trip.querySelector('ol > li'));
      await expect(dot && getComputedStyle(dot).backgroundColor).toBe(primary);
    }
  },
};

/**
 * Not drawn in Figma; built as today's behaviour, owner to confirm: a train with its station codes.
 * GL01 and GL09 at its ends, the start's pill its code alone, GL03, and the end's its code and the
 * pesos in two halves, GL06 and ₱20. Sample stations and codes.
 */
export const RailWithCodes: Story = {
  args: {
    livery: 'light-rail-way-one',
    routeOrigin: 'Mabini',
    hintuans: hintuans('Rizal', 'Bonifacio', 'Luna', 'Del Pilar', 'Jacinto', 'Silang', 'Aguinaldo'),
    routeDirection: 'Malvar',
    originCode: 'GL01',
    destinationCode: 'GL09',
    start: 'h1',
    startCode: 'GL03',
    picked: 'h4',
    pickedCode: 'GL06',
    pickedPesos: '₱20',
    onSetStart: fn(),
    onRemoveStart: fn(),
  },
  play: async (ctx) => {
    await expectEndCodes('GL01', 'GL09')(ctx);
    const { canvasElement } = ctx;
    const pillOf = (id: string) =>
      canvasElement.querySelector(`[data-hintuan="${id}"] [data-testid="trip-hintuan-fare"]`);
    await expect(pillOf('h1')?.textContent).toBe('GL03');
    await expect(pillOf('h4')?.querySelector('[data-part="code"]')?.textContent).toBe('GL06');
    await expect(pillOf('h4')?.querySelector('[data-part="pesos"]')?.textContent).toBe('₱20');
  },
};
