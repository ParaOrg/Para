import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { kmLabel } from '@/shared/utils/geo';

import { TimelineRouteDetailCard } from './timeline-route-detail-card';
import { FREE } from './trip-fare';

/** Sample data only: the places of Figma's frames (3762:3546), not the real map. */
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

/**
 * Opens the stops with View more, as a rider's tap would — and lets go of it, since a tap draws no
 * focus ring. A pick opens them by itself.
 */
const viewMore: Story['play'] = async ({ canvasElement }) => {
  const button = within(canvasElement).getByTestId('trip-view-more');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(button);
  button.blur();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
};

/** A hintuan's row, by its id. */
const hintuanRow = (canvasElement: HTMLElement, id: string) =>
  canvasElement.querySelector<HTMLElement>(`[data-testid="trip-hintuan"][data-hintuan="${id}"]`);

/** The rail a hintuan's row wears (`data-rail` on its rail column). */
const railOf = (canvasElement: HTMLElement, id: string) =>
  hintuanRow(canvasElement, id)?.querySelector('[data-rail]')?.getAttribute('data-rail');

/**
 * Keeps the picks as the public map does (useRideTo): a row picks its hintuan, or an end, and again
 * lets it go; Set as start makes the picked hintuan the start, and × Remove as start, or its row
 * again, lets the start go; an end row is the ride's end, the start kept.
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
    // Raised, as a commuter has them before tapping a row: at Low a tap on the body raises the
    // sheet and reaches nothing under it. The stories about the sheet's heights keep their own.
    height: { snap: 0.55, onSnap: fn() },
    livery: 'jeep',
    // 12.8 km, as Figma's frame has it; its pesos on today's rule.
    metres: 12_800,
    fare: { regular: '₱30–32', discounted: '₱24–26' },
    routeOrigin: 'Tala',
    hintuans: talaToNovaliches,
    routeDirection: 'Novaliches',
    switchable: true,
    back: false,
    // Papunta showing: SWITCH names the way a tap leads.
    way: 'Pabalik',
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
  const { canvasElement, args } = ctx;
  // A pick opens the stops by itself.
  await expect(within(canvasElement).getByTestId('trip-view-more')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const rows = canvasElement.querySelectorAll<HTMLElement>(
    '[data-testid="trip-hintuan"][data-state="selected"]',
  );
  await expect(rows.length).toBe(1);
  const pill = rows[0].querySelector<HTMLElement>('[data-testid="trip-hintuan-fare"]');
  const pesos = args.pickedFare === FREE ? 'Free' : args.pickedFare?.regular;
  // A train's station code goes before the pesos, the two halves of RouteTripLineDetailPill's Two,
  // a space between for a screen reader.
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
    // Figma's Timeline State=Selected (3769:2847): on Jeep and Bus the pill is Content/inverse;
    // on the light UV Express and E-Jeep cards the other way round, the card's words behind the
    // pesos (TIMELINE_PILL). Its pesos in the card's own colour either way.
    const isLight = ['uv-express', 'ejeep'].includes(card.dataset.livery ?? '');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      isLight ? getComputedStyle(card).color : wornBy('bg-content-inverse'),
    );
    await expect(getComputedStyle(pill).color).toBe(getComputedStyle(card).backgroundColor);
  }
};

/**
 * A train's pick, as Figma's train frames draw it: the pill white on every line, MRT-3's
 * dark-worded card too, and its pesos in the line's Timeline/surface, the rail's colour, not the
 * card's.
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

/**
 * On a phone, Figma's frame (3778:3183, Variant2): Tala → Novaliches, its Distance and Expected
 * fare, its stops folded (RouteStopsCard Behavior=Shrink): the card cut at 120, View more on its
 * foot.
 */
export const Folded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trip').className).toContain('max-h-30');
    await expect(canvas.getByTestId('trip-view-more').textContent).toBe('View more');
  },
};

/**
 * The ferry: Free in the fare tile, with no Regular or Discounted to turn, and its fixed note under
 * the tiles.
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
export const Opened: Story = { play: viewMore };

/** Figma's other frame: Tala → SM Fairview, six hintuans, opened. */
export const ToSMFairview: Story = {
  args: { hintuans: talaToFairview, routeDirection: 'SM Fairview' },
  play: viewMore,
};

/** One hintuan on the way: folded as any trip with a hintuan, the destination under the cut. */
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

/** Bus (Figma draws the Timeline set in red), with Content/inverse words. */
export const Bus: Story = { args: { livery: 'bus' } };

/** E-Jeep: a light card, its words in Card/Ejeep/Ejeep-on-surface. */
export const Ejeep: Story = { args: { livery: 'ejeep' } };

/** UV Express: a light card, its words in Card/UVExpress/UVExpress-on-surface. */
export const UvExpress: Story = { args: { livery: 'uv-express' } };

/** SWITCHed: the way back, so SWITCH reads Papunta, the way a tap leads. */
export const TheWayBack: Story = {
  args: {
    routeOrigin: 'Novaliches',
    hintuans: [...talaToNovaliches].reverse(),
    routeDirection: 'Tala',
    back: true,
    way: 'Papunta',
  },
};

/** Opened with no list behind it — a tap on its line, a hotspot's card — and no other route sharing an end drawn its way round: nothing to go back to, so no ‹. */
export const NothingToGoBackTo: Story = {
  render: (args) => <TimelineRouteDetailCard {...args} onBackToList={null} />,
};

/** The route's other way is not drawn yet: SWITCH rests disabled. */
export const NothingTheOtherWay: Story = { args: { switchable: false } };

/**
 * A mode with no fare rule: no Expected fare tile, and Distance takes the row (Figma draws nothing
 * for it; the owner keeps this default).
 */
export const Unpriced: Story = { args: { fare: undefined } };

/**
 * The fare tile turns (3778:3183): a tap shows the discounted fare, ↻ turning once; another, the
 * regular again.
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
export const ALongWay: Story = { args: { hintuans: aLongWay }, play: viewMore };

/** Place names too long for one line wrap; they are never cut. How a wrapped row sits on the rail is not drawn yet. */
export const LongNames: Story = {
  args: {
    livery: 'bus',
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
  play: viewMore,
};

/** From 1024 wide, in the top-left corner where the list sits. */
export const Floating: Story = { parameters: { frame: 'wide' } };

/** In the corner and opened: Tala → Novaliches is taller than 640, so the rail scrolls. */
export const FloatingOpened: Story = { parameters: { frame: 'wide' }, play: viewMore };

/** Figma's 640 frame: still docked, as wide as the screen. */
export const Tablet: Story = { parameters: { frame: 'tablet' } };

/**
 * A hintuan picked, bus — the Timeline set's Selected row, drawn on Figma's red card (3769:2895, 3778:3183):
 * Amparo's dot a white ring round the rail's bus, End's E in its slot, and a white pill with the
 * pesos from Tala to there in the card's bus. The pick opens the stops.
 */
export const PickedBus: Story = {
  args: { livery: 'bus', picked: 'h3' },
  play: pickedAsDrawn,
};

/** E-Jeep: the light card's pill the other way round, on-surface under the card's colour. */
export const PickedEjeep: Story = {
  args: { livery: 'ejeep', picked: 'h3' },
  play: pickedAsDrawn,
};

/** UV Express, as E-Jeep. */
export const PickedUvExpress: Story = {
  args: { livery: 'uv-express', picked: 'h3' },
  play: pickedAsDrawn,
};

/** Jeep, as Bus: the pill white, its pesos in the card's blue. */
export const PickedJeep: Story = {
  args: { livery: 'jeep', picked: 'h3' },
  play: pickedAsDrawn,
};

/** LRT-1, a train's trip (4074:7402): its line's colours, Content/inverse words. */
export const LightRailWayOne: Story = { args: { livery: 'light-rail-way-one' } };

/** Picked, LRT-1: the pill white, the station's code and its pesos in the line's Timeline/surface. */
export const PickedLightRailWayOne: Story = {
  args: { livery: 'light-rail-way-one', picked: 'h3', pickedCode: 'GL04' },
  play: pickedOnATrain,
};

/** LRT-2, a train's trip (4080:4124): its line's colours, Content/inverse words. */
export const LightRailWayTwo: Story = { args: { livery: 'light-rail-way-two' } };

/** Picked, LRT-2: the pill white, the station's code and its pesos in the line's Timeline/surface. */
export const PickedLightRailWayTwo: Story = {
  args: { livery: 'light-rail-way-two', picked: 'h3', pickedCode: 'PL04' },
  play: pickedOnATrain,
};

/** MRT-3, a train's trip (4080:4241): its line's colours, Content/primary, dark, words. */
export const MetroRailWayThree: Story = { args: { livery: 'metro-rail-way-three' } };

/** Picked, MRT-3: the pill's two white halves, YL06 and ₱20–22, in the line's Timeline/surface. */
export const PickedMetroRailWayThree: Story = {
  args: { livery: 'metro-rail-way-three', picked: 'h3', pickedCode: 'YL06' },
  play: pickedOnATrain,
};

/** Tapped through: Amparo's row picks it, pill and all; the tile turned to Discounted, the pill with it; a second tap lets it go. */
export const PickAndLetGo: Story = {
  play: async (ctx) => {
    await viewMore(ctx);
    const { canvasElement, args } = ctx;
    const canvas = within(canvasElement);
    // The opened rows come into sight a frame or two after the tap.
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await expect(args.onPick).toHaveBeenCalledWith('h3');
    await expect(canvas.getByTestId('trip-hintuan-fare').textContent).toBe('₱20–22');
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱20–22');
    // Turned to Discounted, the pill follows the tile.
    await userEvent.click(canvas.getByTestId('trip-fare-turn'));
    await expect(canvas.getByTestId('trip-hintuan-fare').textContent).toBe('₱16–18');
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱16–18');
    await userEvent.click(canvas.getByRole('button', { name: /Amparo/, pressed: true }));
    await expect(canvas.queryByTestId('trip-hintuan-fare')).toBeNull();
    await expect(canvasElement.querySelectorAll('[data-state="selected"]').length).toBe(0);
  },
};

/**
 * The trip's ends by the place's name, whatever a screen reader hears after it: the ride's mark
 * (", start") and, picked, its pesos.
 */
const TALA = /^Tala\b/;
const NOVALICHES = /^Novaliches\b/;

/**
 * The ends are buttons too, and picked like a hintuan: Tala picks itself, its dot the Selected one,
 * lets Amparo go and says which end to show; a second tap lets it go. Novaliches the same. One at a
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
    await userEvent.click(canvas.getByRole('button', { name: TALA, pressed: false }));
    await expect(args.onEnd).toHaveBeenLastCalledWith('from');
    await expect(selected()).toBe(0);
    await expect(origin()).toBe('selected');
    await expect(destination()).toBe('rest');
    await userEvent.click(canvas.getByRole('button', { name: TALA, pressed: true }));
    await expect(origin()).toBe('rest');
    // Nothing picked now, the stops stay open as the picks left them: Amparo is in reach.
    await expect(canvas.getByTestId('trip-view-more')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(canvas.getByRole('button', { name: /Amparo/, pressed: false }));
    await expect(selected()).toBe(1);
    await userEvent.click(canvas.getByRole('button', { name: NOVALICHES, pressed: false }));
    await expect(args.onEnd).toHaveBeenLastCalledWith('to');
    await expect(selected()).toBe(0);
    await expect(destination()).toBe('selected');
    await expect(canvas.queryByTestId('trip-hintuan-fare')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: NOVALICHES, pressed: true }));
    await expect(destination()).toBe('rest');
    // Picked again, then let go by the origin, picked in its place; and the
    // origin let go by a hintuan.
    await userEvent.click(canvas.getByRole('button', { name: NOVALICHES, pressed: false }));
    await expect(destination()).toBe('selected');
    await userEvent.click(canvas.getByRole('button', { name: TALA, pressed: false }));
    await expect(destination()).toBe('rest');
    await expect(origin()).toBe('selected');
    await userEvent.click(canvas.getByRole('button', { name: /Amparo/, pressed: false }));
    await expect(origin()).toBe('rest');
    await expect(selected()).toBe(1);
  },
};

/** Where the trip leaves from, picked: its dot a white ring round the rail's colour, as a picked hintuan's; its name and the tiles as they were. */
export const OriginPicked: Story = { args: { livery: 'bus', endPicked: 'from' } };

/** Where the trip goes, picked, the same way. */
export const DestinationPicked: Story = { args: { livery: 'bus', endPicked: 'to' } };

/**
 * A pick opens the stops, and View less folds them again: the card cut at 120, Amparo kept picked
 * under the cut, out of a keyboard's reach. View more again, every stop is back, the pick still
 * there, pill and all.
 */
export const PickThenViewLess: Story = {
  play: async (ctx) => {
    await viewMore(ctx);
    const { canvasElement } = ctx;
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    const button = canvas.getByTestId('trip-view-more');
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByTestId('trip').className).toContain('max-h-30');
    const amparo = hintuanRow(canvasElement, 'h3');
    await expect(amparo?.dataset.state).toBe('selected');
    await expect(amparo?.inert).toBe(true);
    await userEvent.click(button);
    await expect(amparo?.inert).toBe(false);
    await expect(await canvas.findByRole('button', { name: /Bestlink/ })).toBeVisible();
    await expect(canvas.getByTestId('trip-hintuan-fare').textContent).toBe('₱20–22');
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱20–22');
  },
};

/**
 * Set as start: Amparo picked, then made the start, S before it and × Remove as start under it, the
 * tiles still the whole trip's — a start alone is no ride yet (Figma Variant3); Bistek tapped is
 * the end, and the tiles read the ride between them. × Remove as start lets the start go, the
 * keyboard's focus kept on Amparo's row.
 */
export const StartAndEnd: Story = {
  args: {
    pickedMetres: 4_200,
    pickedFare: { regular: '₱14', discounted: '₱11–12' },
  },
  play: async (ctx) => {
    await viewMore(ctx);
    const { canvasElement } = ctx;
    const canvas = within(canvasElement);
    const wholeKm = canvas.getByTestId('trip-km').textContent;
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await userEvent.click(canvas.getByRole('button', { name: 'Set as start' }));
    const amparo = canvasElement.querySelector('[data-testid="trip-hintuan"][data-hintuan="h3"]');
    await expect(amparo?.querySelector('[data-part="start"]')).toBeTruthy();
    await expect(canvas.getByTestId('trip-km').textContent).toBe(wholeKm);
    await userEvent.click(canvas.getByRole('button', { name: /Bistek/, pressed: false }));
    const bistek = canvasElement.querySelector('[data-testid="trip-hintuan"][data-hintuan="h7"]');
    await expect(bistek?.querySelector('[data-part="end"]')).toBeTruthy();
    await expect(canvas.getByTestId('trip-km').textContent).toBe(kmLabel(4_200));
    await expect(canvas.getByTestId('trip-fare').textContent).toBe('₱14');
    await userEvent.click(canvas.getByRole('button', { name: 'Remove as start' }));
    await expect(amparo?.querySelector('[data-part="start"]')).toBeNull();
    await expect(document.activeElement).toBe(
      amparo?.querySelector('[data-testid="trip-hintuan-pick"]'),
    );
  },
};

/**
 * A ride from Amparo to Bistek, and Bistek tapped again: the end let go, Amparo a start alone, so
 * every row stands alone, off the rail, until an end is picked. The stops stay open and the
 * keyboard's focus stays on Bistek's row.
 */
export const LetTheEndGo: Story = {
  args: {
    start: 'h3',
    picked: 'h7',
    pickedMetres: 4_200,
    pickedFare: { regular: '₱14', discounted: '₱11–12' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bistek = hintuanRow(canvasElement, 'h7');
    await expect(railOf(canvasElement, 'h7')).toBe('above');
    await userEvent.click(canvas.getByRole('button', { name: /Bistek/, pressed: true }));
    await expect(bistek?.getAttribute('data-state')).toBe('rest');
    await expect(bistek?.querySelector('[data-part="end"]')).toBeNull();
    await expect(
      hintuanRow(canvasElement, 'h3')?.querySelector('[data-part="start"]'),
    ).toBeTruthy();
    const rails = [...canvasElement.querySelectorAll('[data-rail]')].map((el) =>
      el.getAttribute('data-rail'),
    );
    await expect(rails.every((rail) => rail === 'disconnected')).toBe(true);
    await expect(canvas.getByTestId('trip-view-more')).toHaveAttribute('aria-expanded', 'true');
    await expect(document.activeElement).toBe(
      bistek?.querySelector('[data-testid="trip-hintuan-pick"]'),
    );
  },
};

/**
 * Amparo the start, then the destination's row tapped: the ride from Amparo to Novaliches, its E on
 * the destination, Amparo's S kept, the tiles the ride's.
 */
export const EndRowKeepsStart: Story = {
  args: {
    start: 'h3',
    pickedMetres: 6_100,
    pickedFare: { regular: '₱16', discounted: '₱13' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const destination = canvas.getByTestId('trip-destination');
    await userEvent.click(within(destination).getByRole('button'));
    await expect(destination.getAttribute('data-state')).toBe('selected');
    await expect(destination.querySelector('[data-part="end"]')).toBeTruthy();
    const amparo = canvasElement.querySelector('[data-testid="trip-hintuan"][data-hintuan="h3"]');
    await expect(amparo?.querySelector('[data-part="start"]')).toBeTruthy();
    await expect(canvas.getByTestId('trip-km').textContent).toBe(kmLabel(6_100));
  },
};

/**
 * A row above the start tapped, Figma's Variant5 (4151:13619): Amparo is the end, above Bistek, the
 * start, and the ride runs back between them (not SWITCHed, which would confuse a commuter). The
 * ride's rows are on the rail, Amparo's below its dot and Bistek's above it; every row outside the
 * ride stands alone. The keyboard's focus stays on Amparo.
 */
export const EndAboveStart: Story = {
  args: {
    start: 'h7',
    pickedMetres: 4_200,
    pickedFare: { regular: '₱14', discounted: '₱11–12' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /Amparo/, pressed: false }));
    await expect(hintuanRow(canvasElement, 'h3')?.querySelector('[data-part="end"]')).toBeTruthy();
    await expect(
      hintuanRow(canvasElement, 'h7')?.querySelector('[data-part="start"]'),
    ).toBeTruthy();
    await expect(canvas.getByTestId('trip-km').textContent).toBe(kmLabel(4_200));
    await expect(
      ['h2', 'h3', 'h4', 'h6', 'h7', 'h8'].map((id) => railOf(canvasElement, id)),
    ).toEqual(['disconnected', 'below', 'through', 'through', 'above', 'disconnected']);
    await expect(
      canvas.getByTestId('trip-origin').querySelector('[data-rail]')?.getAttribute('data-rail'),
    ).toBe('disconnected');
    await expect(document.activeElement).toBe(
      hintuanRow(canvasElement, 'h3')?.querySelector('[data-testid="trip-hintuan-pick"]'),
    );
  },
};

/** The lone hintuan picked: the stops opened by the pick. */
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
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('trip-hintuan-fare')).toBeNull();
  },
};

/** In the corner, picked. */
export const FloatingPicked: Story = {
  args: { picked: 'h3' },
  parameters: { frame: 'wide' },
};

/**
 * A name too long for one line, picked: it wraps beside the pill, which
 * keeps its line. Sample pesos. The pick opens the stops; Bistek, after it,
 * stands alone.
 */
export const LongNamesPicked: Story = {
  args: {
    ...LongNames.args,
    picked: 'h1',
    pickedMetres: 5_200,
    pickedFare: { regular: '₱16–18', discounted: '₱12–15' },
  },
};

/**
 * Figma's BottomSheetConfiguration (3815:5637), on a phone: the stories above sit raised (0.55, from
 * the meta), these below open at Low; a tap on the HandleNotch steps a third of the map, up to full height and back. Taps it until the
 * sheet is at `until`, or once with no `until`.
 */
const tapHandle = async (canvasElement: HTMLElement, until?: 'full') => {
  const handle = within(canvasElement).getByTestId('dock-handle');
  const sheet = within(canvasElement).getByTestId('card');
  for (let i = 0; i < 4; i++) {
    await userEvent.click(handle);
    if (!until || sheet.getAttribute('data-snap') === until) break;
  }
  handle.blur();
};

/** Full height: the whole map, the header at the top, the rest scrolling under it (3815:4306). */
export const SheetFull: Story = {
  args: { height: undefined, hintuans: aLongWay },
  play: async (ctx) => {
    await tapHandle(ctx.canvasElement, 'full');
    await viewMore(ctx);
    await expect(within(ctx.canvasElement).getByTestId('card')).toHaveAttribute(
      'data-snap',
      'full',
    );
  },
};

/** Low, where it opens: the header and the origin along the bottom, the map above it (3814:3976). */
export const SheetLow: Story = {
  args: { height: undefined },
  play: async (ctx) => {
    await expect(within(ctx.canvasElement).getByTestId('card')).toHaveAttribute('data-snap', 'low');
  },
};

/**
 * An origin too long for one line on a phone at 17/24 (LongNames' fits on one).
 */
const longOrigin = 'Novaliches (Bayan) via Zabarte and Quirino Highway';

/** Low with a long origin: one line of it, 24 tall, cut short (3814:3976). */
export const SheetLowLongName: Story = {
  args: { height: undefined, ...LongNames.args, routeOrigin: longOrigin },
  play: async (ctx) => {
    const ends = within(within(ctx.canvasElement).getByTestId('trip-ends'));
    const origin = ends.getByText(longOrigin);
    await waitFor(() => expect(origin.getBoundingClientRect().height).toBe(24));
  },
};

/** Raised a third with a long origin: all of it, on as many lines as it takes. */
export const SheetRaisedLongName: Story = {
  args: { height: undefined, ...LongNames.args, routeOrigin: longOrigin },
  play: async (ctx) => {
    await tapHandle(ctx.canvasElement);
    const ends = within(within(ctx.canvasElement).getByTestId('trip-ends'));
    await expect(ends.getByText(longOrigin).getBoundingClientRect().height).toBeGreaterThan(24);
  },
};

/**
 * "Other routes" under the stops: the other routes out of where the trip starts,
 * each by where it goes; a tap opens that route's trip in this one's place. With none, as in every
 * story above, the section is not there.
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
    // SM Fairview is a hintuan too: the one under Other routes.
    const others = within(await within(canvasElement).findByTestId('trip-other-routes'));
    await userEvent.click(others.getByRole('button', { name: 'SM Fairview' }));
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
 * The direction's boards on their own card, "Signboard" over them (4680:25123), 40 tall, 8 apart,
 * between the tiles and the stops, 16 from each.
 */
export const Signboards: Story = {
  args: { signboards: [board('BAYAN', 'SIMBAHAN'), board('SM', 'FAIRVIEW')] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const boards = canvas.getAllByTestId('trip-signboard');
    await expect(boards).toHaveLength(2);
    await waitFor(() => expect(boards[0].getBoundingClientRect().height).toBe(40));
    // On their own card, "Signboard" over them, between the tiles and the stops, 16 from each.
    const section = canvas.getByRole('region', { name: 'Signboard' });
    const card = canvas.getByTestId('trip');
    const tiles = canvas.getByTestId('trip-tiles');
    const box = (el: Element) => el.getBoundingClientRect();
    await expect(box(section).top - box(tiles).bottom).toBe(16);
    await expect(box(card).top - box(section).bottom).toBe(16);
  },
};

/** None uploaded: no card, the stops 16 under the tiles. */
export const NoSignboards: Story = {
  args: { signboards: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('trip-signboards')).toBeNull();
    const tiles = canvas.getByTestId('trip-tiles');
    await expect(
      canvas.getByTestId('trip').getBoundingClientRect().top - tiles.getBoundingClientRect().bottom,
    ).toBe(16);
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

/** The signboards between the tiles and the stops, and Other routes under the stops. */
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

/**
 * A trip opened by "Go here" from a landmark (ticket 07): its end picked at the hintuan nearest
 * the landmark, and under the stops, first, how far the walk is from there, in a straight line.
 * With a line's own note too, the walk comes before it.
 */
export const WalkToALandmark: Story = {
  args: {
    ...Ferry.args,
    picked: 'h3',
    walk: 'About 300 m to SM North EDSA, in a straight line',
  },
  play: async ({ canvasElement, args }) => {
    const card = within(canvasElement);
    const walk = card.getByTestId('trip-walk');
    await expect(walk.textContent).toBe(args.walk);
    const note = card.getByTestId('trip-note');
    await expect(
      walk.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

/** No goal: no walk line. */
export const NoWalk: Story = {
  args: { picked: 'h3' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('trip-walk')).toBeNull();
  },
};
