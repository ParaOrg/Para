import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { kmLabel } from '@/shared/utils/geo';

import { FREE, TimelineRouteDetailCard } from './timeline-route-detail-card';

/** Sample data only: the places of the owner's frames (3762:3546), not the real map. */
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
const talaToFairview = talaToNovaliches.slice(0, 6);
const aLongWay = hintuans(...Array.from({ length: 30 }, (_, i) => `Hintuan ${i + 1}`));

/** Opens the fold, as a rider's tap would — and lets go of it, since a tap draws no focus ring. */
const openFold: Story['play'] = async ({ canvasElement }) => {
  const fold = within(canvasElement).getByRole('button', { name: /more hintuans/ });
  await userEvent.click(fold);
  fold.blur();
};

/**
 * Keeps the picks as the public map does (useRideTo): a row picks its
 * hintuan, or an end, and again lets it go; Set as start makes the picked
 * hintuan the start, and × Remove as start, or its row again, lets the
 * start go; an end row lets both go.
 */
function Picking(props: ComponentProps<typeof TimelineRouteDetailCard>) {
  const [picked, setPicked] = useState(props.picked);
  const [start, setStart] = useState(props.start ?? null);
  const [atEnd, setAtEnd] = useState(props.endPicked);
  return (
    <TimelineRouteDetailCard
      {...props}
      picked={picked}
      start={start}
      endPicked={atEnd}
      onPick={(id) => {
        props.onPick(id);
        if (id === start) return setStart(null);
        setAtEnd(null);
        setPicked((cur) => (cur === id ? null : id));
      }}
      onSetStart={() => {
        props.onSetStart?.();
        setStart(picked);
        setPicked(null);
      }}
      onRemoveStart={() => {
        props.onRemoveStart?.();
        setStart(null);
      }}
      onEnd={(end) => {
        props.onEnd(end);
        setPicked(null);
        setStart(null);
        setAtEnd((cur) => (cur === end ? null : end));
      }}
    />
  );
}

type Frame = 'phone' | 'tablet' | 'wide';
const FRAME = {
  phone: 'max-h-[852px] w-[393px]',
  tablet: 'max-h-[960px] w-[640px]',
  wide: 'max-h-[640px] w-[1024px]',
} satisfies Record<Frame, string>;
const frameOf = (p: { frame?: Frame }) => FRAME[p.frame ?? 'phone'];

const meta = {
  title: 'Features/Routes/TimelineRouteDetailCard',
  component: TimelineRouteDetailCard,
  // Keyed on the picks, so the controls panel's `picked` starts it afresh.
  render: (args) => <Picking key={`${args.picked}:${args.endPicked}`} {...args} />,
  // A map-sized box, marked @container as the apps' roots are: the trip
  // docks along its bottom where the list did, and sits in the top-left
  // corner from 1024 wide (`@float:`). Never taller than the canvas, so the
  // story itself does not scroll.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          '@container relative h-dvh overflow-clip bg-neutral-200 ' + frameOf(ctx.parameters)
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    // Violet since yellow left the set (2026-10-12); his frames (3762:3546) were drawn yellow.
    livery: 'violet',
    // 12.8 km, as the owner's frame has it; its pesos on today's rule.
    metres: 12_800,
    fare: { regular: '₱30–32', discounted: '₱24–26' },
    routeOrigin: 'Tala',
    hintuans: talaToNovaliches,
    routeDirection: 'Novaliches',
    switchable: true,
    back: false,
    way: 'Papunta',
    onSwitch: fn(),
    onBackToList: fn(),
    onClose: fn(),
    picked: null,
    onPick: fn(),
    onEnd: fn(),
    endPicked: null,
    // Amparo's, fourth on the way: from Tala to there on today's map.
    pickedMetres: 7_300,
    pickedFare: { regular: '₱20–22', discounted: '₱16–18' },
  },
} satisfies Meta<typeof TimelineRouteDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The colour a token class paints, read off a probe wearing it. */
const wornBy = (className: string) => {
  const probe = document.createElement('i');
  probe.className = className;
  document.body.append(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return colour;
};

/** The picked row, its pill and the pesos in it, and the fare and Distance tiles following the pick. */
const pickedPesos = async (ctx: Parameters<NonNullable<Story['play']>>[0]) => {
  await openFold(ctx);
  const { canvasElement, args } = ctx;
  const rows = canvasElement.querySelectorAll<HTMLElement>(
    '[data-testid="trip-hintuan"][data-state="selected"]',
  );
  await expect(rows.length).toBe(1);
  const pill = rows[0].querySelector<HTMLElement>('[data-testid="trip-hintuan-fare"]');
  const pesos = args.pickedFare === FREE ? 'Free' : args.pickedFare?.regular;
  // A train's station code goes before the pesos, the two halves of
  // RouteTripLineDetailPill's Two (2026-10-15), a space between for a screen reader.
  const code = pill?.querySelector('[data-part="code"]')?.textContent ?? null;
  await expect(code).toBe(args.pickedCode ?? null);
  await expect(pill?.textContent).toBe(code ? `${code} ${pesos}` : pesos);
  await expect(within(canvasElement).getByTestId('trip-fare').textContent).toBe(pesos);
  // The Distance tile follows the pick too.
  await expect(within(canvasElement).getByTestId('trip-km').textContent).toBe(
    kmLabel(args.pickedMetres ?? args.metres),
  );
  // The white is the halves', not the Two's wrapper: the card shows between them.
  const fill = pill?.querySelector<HTMLElement>('[data-part="pesos"]') ?? pill;
  return { card: within(canvasElement).getByTestId('trip'), row: rows[0], pill: fill };
};

/**
 * Opened to the picked row, which checks it as Figma's State=Selected draws
 * it: the one row, its pill of pesos in the card's own colours swapped, and
 * the fare tile pricing the ride to there, the same pesos.
 */
const pickedAsDrawn: Story['play'] = async (ctx) => {
  const { card, pill } = await pickedPesos(ctx);
  if (pill) {
    // Its words' colour behind the pesos, its fill for them.
    await expect(getComputedStyle(pill).backgroundColor).toBe(getComputedStyle(card).color);
    await expect(getComputedStyle(pill).color).toBe(getComputedStyle(card).backgroundColor);
  }
};

/**
 * A train's pick, as the owner's train frames draw it (2026-10-13): the
 * pill white on every line, MRT-3's dark-worded card too, and its pesos in
 * the line's Timeline/surface, the rail's colour, not the card's.
 */
const pickedOnATrain: Story['play'] = async (ctx) => {
  const { row, pill } = await pickedPesos(ctx);
  // The rail's own fill (the picked dot's ring), not the row's active: one.
  const rail = [...row.querySelectorAll<HTMLElement>('[class*="timeline-surface"]')].find((el) =>
    [...el.classList].some((c) => c.startsWith('bg-') && c.endsWith('-timeline-surface')),
  );
  await expect(rail).toBeDefined();
  if (pill && rail) {
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-content-inverse'));
    await expect(getComputedStyle(pill).color).toBe(getComputedStyle(rail).backgroundColor);
  }
};

/** On a phone, the owner's frame (3778:3183, Variant2): Tala → Novaliches, its Distance and Expected fare, its ten hintuans folded. */
export const Folded: Story = {};

/**
 * The ferry (the owner's picks, 2026-10-03): Free in the fare tile, with no
 * Regular or Discounted to turn, and its fixed note under the tiles.
 */
export const Ferry: Story = {
  args: {
    routeOrigin: 'Escolta',
    hintuans: hintuans(
      'Lawton',
      'Quinta Market',
      'PUP',
      'Santa Ana',
      'Lambingan',
      'Valenzuela',
      'Hulo',
    ),
    routeDirection: 'Guadalupe',
    metres: 9_800,
    fare: FREE,
    pickedFare: FREE,
    pickedMetres: 3_200,
    note: 'Mon–Sat, daytime · Suspended in bad weather: check MMDA',
  },
  play: async ({ canvasElement, args }) => {
    const card = within(canvasElement);
    await expect(card.getByTestId('trip-fare').textContent).toBe('Free');
    await expect(card.queryByTestId('trip-fare-turn')).toBeNull();
    await expect(card.getByTestId('trip-note').textContent).toBe(args.note);
  },
};

/** A ferry hotspot picked: its pill and the tile both say Free. */
export const FerryPicked: Story = {
  args: { ...Ferry.args, picked: 'h3' },
  play: pickedAsDrawn,
};

/** Opened: every hintuan alike — SM Fairview among them — then View less. */
export const Opened: Story = { play: openFold };

/** The owner's other frame: Tala → SM Fairview, six hintuans, opened. */
export const ToSMFairview: Story = {
  args: { hintuans: talaToFairview, routeDirection: 'SM Fairview' },
  play: openFold,
};

/** One hintuan on the way: shown as it is, not folded behind a row of its own size. */
export const OneHintuan: Story = {
  args: {
    routeOrigin: 'Fatima',
    hintuans: hintuans('Lagro'),
    routeDirection: 'SM Fairview',
    metres: 3_100,
    fare: { regular: '₱14', discounted: '₱11–12' },
  },
};

/** None on the way yet: the rail runs straight from the origin to the end. */
export const NoHintuan: Story = {
  args: {
    routeOrigin: 'Lagro',
    hintuans: [],
    routeDirection: 'SM Fairview',
    metres: 2_400,
    fare: { regular: '₱14', discounted: '₱11–12' },
  },
};

/** In red, the Timeline set's own colour, with Content/inverse words. */
export const Red: Story = { args: { livery: 'red' } };

/** Orange (Figma's Pink until 2026-10-13). */
export const Orange: Story = { args: { livery: 'orange' } };

/** Fuchsia, with Content/inverse words, like red. */
export const Fuchsia: Story = { args: { livery: 'fuchsia' } };

/** Pink (4071:7014, 2026-10-13), with Content/inverse words, like fuchsia. */
export const Pink: Story = { args: { livery: 'pink' } };

/** SWITCHed: the way back. SWITCH is pressed for a screen reader only; it has no drawn "on" look yet. */
export const TheWayBack: Story = {
  args: {
    routeOrigin: 'Novaliches',
    hintuans: [...talaToNovaliches].reverse(),
    routeDirection: 'Tala',
    back: true,
  },
};

/** Opened with no list behind it — a tap on its line, a hotspot's card — and no other route sharing an end drawn its way round: nothing to go back to, so no ‹. */
export const NothingToGoBackTo: Story = {
  render: (args) => <TimelineRouteDetailCard {...args} onBackToList={null} />,
};

/** The route's other way is not drawn yet: SWITCH rests disabled. */
export const NothingTheOtherWay: Story = { args: { switchable: false } };

/** A mode with no fare rule: no Expected fare tile, and Distance takes the row (nothing drawn for it; the owner kept this, 2026-09-29). */
export const Unpriced: Story = { args: { fare: undefined } };

/**
 * The fare tile turns (3778:3183, redrawn 2026-09-30): a tap shows the
 * discounted fare, ↻ turning once; another, the regular again.
 */
export const FareTurns: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱30–32');
    await expect(canvas.getByTestId('trip-fare-turn').textContent).toContain('Regular fare');
    await userEvent.click(canvas.getByTestId('trip-fare-turn'));
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱24–26');
    await expect(canvas.getByTestId('trip-fare-turn').textContent).toContain('Discounted fare');
    await userEvent.click(canvas.getByTestId('trip-fare-turn'));
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱30–32');
  },
};

/** Thirty hintuans, opened: taller than the room, the rail scrolls under the header. */
export const ALongWay: Story = { args: { hintuans: aLongWay }, play: openFold };

/** Place names too long for one line wrap; they are never cut. How a wrapped row sits on the rail is not drawn yet. */
export const LongNames: Story = {
  args: {
    livery: 'orange',
    metres: 8_600,
    fare: { regular: '₱24–26', discounted: '₱19–21' },
    routeOrigin: 'Novaliches (Bayan) via Zabarte',
    hintuans: hintuans(
      'Lagro',
      'Quirino Highway corner Zabarte Road, Robinsons Novaliches',
      'Bistek',
    ),
    routeDirection: 'Fairview Teraccess Transport Terminal',
  },
  play: openFold,
};

/** From 1024 wide, in the top-left corner where the list sits. */
export const Floating: Story = { parameters: { frame: 'wide' } };

/** In the corner and opened: the owner's Tala → Novaliches is taller than 640, so the rail scrolls. */
export const FloatingOpened: Story = { parameters: { frame: 'wide' }, play: openFold };

/** The owner's 640 frame: still docked, as wide as the screen. */
export const Tablet: Story = { parameters: { frame: 'tablet' } };

/**
 * A hintuan picked, red — the Timeline set's Selected row on the owner's
 * card (3769:2895), recoloured 2026-09-30 (3778:3183): Amparo's dot a white
 * ring round the rail's red, no longer green, its name ExtraBold, and
 * a white pill with the pesos from Tala to there in the card's red. Opened,
 * since the fold keeps it.
 */
export const PickedRed: Story = { args: { livery: 'red', picked: 'h3' }, play: pickedAsDrawn };

/** Orange, as red: he drew no orange trip. */
export const PickedOrange: Story = {
  args: { livery: 'orange', picked: 'h3' },
  play: pickedAsDrawn,
};

/** Fuchsia, as red: the pill white, its pesos in the card's fuchsia. */
export const PickedFuchsia: Story = {
  args: { livery: 'fuchsia', picked: 'h3' },
  play: pickedAsDrawn,
};

/** Pink, as fuchsia: the pill white, its pesos in the card's pink. */
export const PickedPink: Story = {
  args: { livery: 'pink', picked: 'h3' },
  play: pickedAsDrawn,
};

/** LRT-1, a train's trip (4074:7402, 2026-10-13): its line's colours, Content/inverse words. */
export const LightRailWayOne: Story = { args: { livery: 'light-rail-way-one' } };

/** Picked, LRT-1: the pill white, the station's code and its pesos in the line's Timeline/surface. */
export const PickedLightRailWayOne: Story = {
  args: { livery: 'light-rail-way-one', picked: 'h3', pickedCode: 'GL04' },
  play: pickedOnATrain,
};

/** LRT-2, a train's trip (4080:4124, 2026-10-13): its line's colours, Content/inverse words. */
export const LightRailWayTwo: Story = { args: { livery: 'light-rail-way-two' } };

/** Picked, LRT-2: the pill white, the station's code and its pesos in the line's Timeline/surface. */
export const PickedLightRailWayTwo: Story = {
  args: { livery: 'light-rail-way-two', picked: 'h3', pickedCode: 'PL04' },
  play: pickedOnATrain,
};

/** MRT-3, a train's trip (4080:4241, 2026-10-13): its line's colours, Content/primary, dark, words. */
export const MetroRailWayThree: Story = { args: { livery: 'metro-rail-way-three' } };

/** Picked, MRT-3: the pill's two white halves, YL06 and ₱20–22, in the line's Timeline/surface. */
export const PickedMetroRailWayThree: Story = {
  args: { livery: 'metro-rail-way-three', picked: 'h3', pickedCode: 'YL06' },
  play: pickedOnATrain,
};

/** Tapped through: Amparo's row picks it, pill and all; the tile turned to Discounted, the pill with it; a second tap lets it go. */
export const PickAndLetGo: Story = {
  play: async (ctx) => {
    await openFold(ctx);
    const { canvasElement, args } = ctx;
    const canvas = within(canvasElement);
    // The opened rows come into sight a frame or two after the tap.
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await expect(args.onPick).toHaveBeenCalledWith('h3');
    await expect(canvas.getByTestId('trip-hintuan-fare').textContent).toBe('₱20–22');
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱20–22');
    // Turned to Discounted, the pill follows the tile (the owner, 2026-09-30).
    await userEvent.click(canvas.getByTestId('trip-fare-turn'));
    await expect(canvas.getByTestId('trip-hintuan-fare').textContent).toBe('₱16–18');
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱16–18');
    await userEvent.click(canvas.getByRole('button', { name: /Amparo/, pressed: true }));
    await expect(canvas.queryByTestId('trip-hintuan-fare')).toBeNull();
    await expect(canvasElement.querySelectorAll('[data-state="selected"]').length).toBe(0);
  },
};

/**
 * The ends are buttons too, and picked like a hintuan (the owner's asks,
 * 2026-09-29): Tala picks itself, its dot the Selected one, lets Amparo go and says
 * which end to show; a second tap lets it go. Novaliches the same. One at a
 * time: each lets the others go.
 */
export const EndsShowTheWhole: Story = {
  args: { picked: 'h3' },
  play: async (ctx) => {
    const { canvasElement, args } = ctx;
    const canvas = within(canvasElement);
    const selected = () =>
      canvasElement.querySelectorAll('[data-testid="trip-hintuan"][data-state="selected"]').length;
    const origin = () => canvas.getByTestId('trip-origin').getAttribute('data-state');
    const destination = () => canvas.getByTestId('trip-destination').getAttribute('data-state');
    await expect(selected()).toBe(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Tala', pressed: false }));
    await expect(args.onEnd).toHaveBeenLastCalledWith('from');
    await expect(selected()).toBe(0);
    await expect(origin()).toBe('selected');
    await expect(destination()).toBe('rest');
    await userEvent.click(canvas.getByRole('button', { name: 'Tala', pressed: true }));
    await expect(origin()).toBe('rest');
    await openFold(ctx);
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await expect(selected()).toBe(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Novaliches', pressed: false }));
    await expect(args.onEnd).toHaveBeenLastCalledWith('to');
    await expect(selected()).toBe(0);
    await expect(destination()).toBe('selected');
    await expect(canvas.queryByTestId('trip-hintuan-fare')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Novaliches', pressed: true }));
    await expect(destination()).toBe('rest');
    // Picked again, then let go by the origin, picked in its place; and the
    // origin let go by a hintuan.
    await userEvent.click(canvas.getByRole('button', { name: 'Novaliches', pressed: false }));
    await expect(destination()).toBe('selected');
    await userEvent.click(canvas.getByRole('button', { name: 'Tala', pressed: false }));
    await expect(destination()).toBe('rest');
    await expect(origin()).toBe('selected');
    await userEvent.click(canvas.getByRole('button', { name: /Amparo/, pressed: false }));
    await expect(origin()).toBe('rest');
    await expect(selected()).toBe(1);
  },
};

/** Where the trip leaves from, picked: its dot a white ring round the rail's colour, as a picked hintuan's; its name and the tiles as they were. */
export const OriginPicked: Story = { args: { livery: 'red', endPicked: 'from' } };

/** Where the trip goes, picked, the same way. */
export const DestinationPicked: Story = { args: { livery: 'red', endPicked: 'to' } };

/**
 * A pick is in the ride, so it never folds away (2026-10-15): View less
 * folds only the rows after it, and opened again they are back, the pick
 * still there, pill and all.
 */
export const PickWithTheRestFolded: Story = {
  play: async (ctx) => {
    await openFold(ctx);
    const { canvasElement } = ctx;
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await userEvent.click(canvas.getByRole('button', { name: /View less/ }));
    await expect(canvas.getByRole('button', { name: /Amparo/, pressed: true })).toBeVisible();
    await expect(canvas.getByRole('button', { name: /6 more hintuans/ })).toBeTruthy();
    await openFold(ctx);
    await expect(await canvas.findByRole('button', { name: /Bestlink/ })).toBeVisible();
    await expect(canvas.getByTestId('trip-hintuan-fare').textContent).toBe('₱20–22');
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱20–22');
  },
};

/**
 * Set as start (the owner's TimelineRouteDetail, 2026-10-15): Amparo picked,
 * then made the start, S before it and × Remove as start under it, the
 * tiles the ride from there; Bistek tapped is the end. × Remove as start
 * lets the start go, the keyboard's focus kept on Amparo's row.
 */
export const StartAndEnd: Story = {
  args: {
    pickedMetres: 4_200,
    pickedFare: { regular: '₱14', discounted: '₱11–12' },
  },
  play: async (ctx) => {
    await openFold(ctx);
    const { canvasElement } = ctx;
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await userEvent.click(canvas.getByRole('button', { name: 'Set as start' }));
    const amparo = canvasElement.querySelector('[data-testid="trip-hintuan"][data-hintuan="h3"]');
    await expect(amparo?.querySelector('[data-part="start"]')).toBeTruthy();
    await expect(canvas.getByTestId('trip-km').textContent).toBe(kmLabel(4_200));
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱14');
    await userEvent.click(canvas.getByRole('button', { name: /Bistek/, pressed: false }));
    const bistek = canvasElement.querySelector('[data-testid="trip-hintuan"][data-hintuan="h7"]');
    await expect(bistek?.querySelector('[data-part="end"]')).toBeTruthy();
    await userEvent.click(canvas.getByRole('button', { name: 'Remove as start' }));
    await expect(amparo?.querySelector('[data-part="start"]')).toBeNull();
    await expect(document.activeElement).toBe(
      amparo?.querySelector('[data-testid="trip-hintuan-pick"]'),
    );
  },
};

/** The lone hintuan picked: no fold to open. */
export const OneHintuanPicked: Story = {
  args: {
    ...OneHintuan.args,
    picked: 'h0',
    pickedMetres: 1_900,
    pickedFare: { regular: '₱14', discounted: '₱11–12' },
  },
};

/**
 * A mode with no fare rule: the row picked, and no pill, as there is no
 * Expected fare tile. A row whose box the line misses would look the same
 * beside the tile; the published map has none (timeline-test checks every
 * row cuts).
 */
export const PickedUnpriced: Story = {
  args: { fare: undefined, picked: 'h3', pickedMetres: undefined, pickedFare: undefined },
  play: openFold,
};

/** In the corner, picked. */
export const FloatingPicked: Story = {
  args: { picked: 'h3' },
  parameters: { frame: 'wide' },
  play: openFold,
};

/** A name too long for one line, picked: it wraps beside the pill, which keeps its line. Sample pesos. */
export const LongNamesPicked: Story = {
  args: {
    ...LongNames.args,
    picked: 'h1',
    pickedMetres: 5_200,
    pickedFare: { regular: '₱16–18', discounted: '₱12–15' },
  },
  play: openFold,
};

/**
 * The owner's BottomSheetConfiguration (3815:5637, 2026-09-30), on a phone:
 * the stories above open at Middle; a tap on the HandleNotch goes round.
 */
const tapHandle = async (canvasElement: HTMLElement, times: number) => {
  const handle = within(canvasElement).getByTestId('dock-handle');
  for (let i = 0; i < times; i++) await userEvent.click(handle);
  handle.blur();
};

/** Max: the whole map, the header at the top, the rest scrolling under it (3815:4306). */
export const SheetMax: Story = {
  args: { hintuans: aLongWay },
  play: async (ctx) => {
    await openFold(ctx);
    await tapHandle(ctx.canvasElement, 1);
    await expect(within(ctx.canvasElement).getByTestId('card')).toHaveAttribute('data-snap', 'max');
  },
};

/** Low: the header and the origin along the bottom, the map above it (3814:3976). */
export const SheetLow: Story = {
  play: async (ctx) => {
    await tapHandle(ctx.canvasElement, 2);
    await expect(within(ctx.canvasElement).getByTestId('card')).toHaveAttribute('data-snap', 'low');
  },
};

/**
 * An origin too long for one line on a phone at 20/28 (the origin's size
 * since 2026-10-13; LongNames' fits on one now).
 */
const longOrigin = 'Novaliches (Bayan) via Zabarte and Quirino Highway';

/** Low with a long origin: one line of it, 28 tall, cut short (3814:3976). */
export const SheetLowLongName: Story = {
  args: { ...LongNames.args, routeOrigin: longOrigin },
  play: async (ctx) => {
    await tapHandle(ctx.canvasElement, 2);
    const origin = within(ctx.canvasElement).getByText(longOrigin);
    await waitFor(() => expect(origin.getBoundingClientRect().height).toBe(28));
  },
};

/** Middle with a long origin: all of it, on as many lines as it takes. */
export const SheetMiddleLongName: Story = {
  args: { ...LongNames.args, routeOrigin: longOrigin },
  play: async (ctx) => {
    const origin = within(ctx.canvasElement).getByText(longOrigin);
    await expect(origin.getBoundingClientRect().height).toBeGreaterThan(28);
  },
};

/**
 * "Other routes" under the tiles (the owner's TimelineRouteDetailCard, 3778:3183,
 * 2026-10-01): the other routes out of where the trip starts, each by where
 * it goes; a tap opens that route's trip in this one's place. With none,
 * as in every story above, the section is not there.
 */
export const OtherRoutes: Story = {
  args: {
    otherRoutes: [
      { id: 'tala-sm', to: 'SM Fairview' },
      { id: 'tala-bs', to: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
    ],
    onOtherRoute: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'SM Fairview' }));
    await expect(args.onOtherRoute).toHaveBeenCalledWith('tala-sm');
  },
};

/** Sample boards in the frame's look (3919:11447), not real ones: dark, a lime word over a gold one. */
const board = (top: string, under: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="98" height="40" viewBox="0 0 98 40"><rect width="98" height="40" fill="#111"/>` +
      `<text x="49" y="21" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="16" fill="#7CFC00">${top}</text>` +
      `<text x="49" y="34" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900" font-size="9" fill="#FFB400">${under}</text></svg>`,
  );

/**
 * Figma's Signboard (3919:11355): the direction's boards between the card
 * and the tiles, in their own white strip (the owner's TimelineRouteDetailCard of
 * 2026-10-12, 4051:5528; right under the header by his first redrawing that
 * day, under the tiles with a heading until then), 40 tall, 8 apart, 16
 * under the card and 16 over the tiles.
 */
export const Signboards: Story = {
  args: { signboards: [board('BAYAN', 'SIMBAHAN'), board('SM', 'FAIRVIEW')] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const boards = canvas.getAllByTestId('trip-signboard');
    await expect(boards).toHaveLength(2);
    await waitFor(() => expect(boards[0].getBoundingClientRect().height).toBe(40));
    // Under the card, over the tiles, and no heading over them.
    const strip = canvas.getByTestId('trip-signboards');
    const card = canvas.getByTestId('trip');
    const tiles = canvas.getByTestId('trip-tiles');
    await expect(
      card.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(
      strip.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expect(canvas.queryByRole('heading', { name: 'Signboard' })).toBeNull();
    const top = (el: Element) => el.getBoundingClientRect().top;
    await expect(top(boards[0]) - card.getBoundingClientRect().bottom).toBe(16);
    await expect(top(tiles) - boards[0].getBoundingClientRect().bottom).toBe(0);
    await expect(getComputedStyle(tiles).paddingTop).toBe('16px');
  },
};

/** None uploaded: no strip, the tiles 16 under the card. */
export const NoSignboards: Story = {
  args: { signboards: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('trip-signboards')).toBeNull();
    const tiles = canvas.getByTestId('trip-tiles');
    await expect(tiles.getBoundingClientRect().top).toBe(
      canvas.getByTestId('trip').getBoundingClientRect().bottom,
    );
    await expect(getComputedStyle(tiles).paddingTop).toBe('16px');
  },
};

/** Five boards, one far wider than the rest: the row wraps on a phone, and no board runs past the card. */
export const ManySignboards: Story = {
  args: {
    signboards: [
      board('BAYAN', 'SIMBAHAN'),
      board('SM', 'FAIRVIEW'),
      board('TALA', 'ZABARTE'),
      board('LAGRO', 'NOVA'),
      'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="40" viewBox="0 0 600 40"><rect width="600" height="40" fill="#111"/><text x="300" y="28" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="20" fill="#7CFC00">QUIRINO HIGHWAY · REGALADO · COMMONWEALTH</text></svg>',
        ),
    ],
  },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByTestId('trip-signboards');
    const boards = within(canvasElement).getAllByTestId('trip-signboard');
    await waitFor(() => {
      const last = boards.at(-1);
      if (!last) throw new Error('The trip shows no signboard.');
      return expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(
        row.getBoundingClientRect().right,
      );
    });
    await expect(
      new Set(boards.map((b) => Math.round(b.getBoundingClientRect().top))).size,
    ).toBeGreaterThan(1);
  },
};

/** The signboards between the card and the tiles, and Other routes under the tiles, as the frame stacks them (3778:3183). */
export const SignboardsAndOtherRoutes: Story = {
  args: {
    signboards: [board('BAYAN', 'SIMBAHAN'), board('SM', 'FAIRVIEW')],
    otherRoutes: [
      { id: 'tala-sm', to: 'SM Fairview' },
      { id: 'tala-nova', to: 'Novaliches' },
    ],
    onOtherRoute: fn(),
  },
  play: async ({ canvasElement }) => {
    const boards = within(canvasElement).getByTestId('trip-signboards');
    const others = within(canvasElement).getByTestId('trip-other-routes');
    await expect(
      boards.compareDocumentPosition(others) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};
