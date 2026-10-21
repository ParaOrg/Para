import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { Snap } from '@/shared/ui/sheet-gesture';

import { TripCard } from './trip-card';
import type { Direction, TransportMode } from '../model/routes';
import type { Timeline, TimelineRow } from '../model/timeline';

/** Sample data only, shaped like the map file's rows. Not read from Supabase. */
const direction = (
  routeId: string,
  head: string,
  tail: string,
  {
    reversed = false,
    drawn = true,
    mode = 'jeepney',
    routeCode = null,
    metres = 12_800,
  }: {
    reversed?: boolean;
    drawn?: boolean;
    mode?: TransportMode;
    routeCode?: string | null;
    metres?: number;
  } = {},
): Direction => ({
  id: `${routeId}-${reversed ? 'back' : 'out'}`,
  routeId,
  name: reversed ? `${tail} → ${head}` : `${head} → ${tail}`,
  originTerminal: null,
  destinationTerminal: null,
  shape: drawn
    ? {
        type: 'LineString',
        coordinates: [
          [121.04, 14.74],
          [121.05, 14.75],
        ],
      }
    : null,
  metres,
  reversed,
  confidence: 'drawn',
  route: {
    id: routeId,
    signboard: null,
    longName: null,
    mode,
    fareNote: null,
    // Every sample route starts at Tala, so "Other routes" can find them.
    headHotspotId: `${head}-hotspot`,
    tailHotspotId: `${tail}-hotspot`,
    via: null,
    name: `${head} – ${tail}`,
    routeCode,
  },
});

const row = (label: string, kind: TimelineRow['kind'] = 'hintuan'): TimelineRow => ({
  id: label.toLowerCase().replace(/\W+/g, '-'),
  label,
  kind,
});

const timelineOf = (from: string, to: string, between: readonly string[]): Timeline => ({
  from: row(from, 'terminal'),
  to: row(to, 'terminal'),
  between: between.map((label) => row(label)),
});

const talaToNovaliches = direction('nova', 'Tala', 'Novaliches');
const novalichesToTala = direction('nova', 'Tala', 'Novaliches', { reversed: true });
const talaToFairview = direction('sm', 'Tala', 'SM Fairview', { metres: 9_400 });
const talaTimeline = timelineOf('Tala', 'Novaliches', [
  'Barracks',
  'Malaria',
  'Pangarap',
  'Amparo',
  'Fatima',
  'Lagro',
  'SM Fairview',
  'Bistek',
]);

/** Keeps the sheet's height as the public map does: the list behind the trip shares it. */
function Keeping(props: ComponentProps<typeof TripCard>) {
  const [snap, setSnap] = useState<Snap>(props.height.snap);
  return (
    <TripCard
      {...props}
      height={{
        snap,
        onSnap: (next) => {
          props.height.onSnap(next);
          setSnap(next);
        },
      }}
    />
  );
}

const meta = {
  title: 'Features/Routes/TripCard',
  component: TripCard,
  render: (args) => <Keeping {...args} />,
  // A map-sized box, marked @container as the apps' roots are: the trip docks
  // along its bottom on a phone, and sits in the top-left corner from 1024
  // wide, as this box is. The `phone` parameter shrinks it to a handset.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? '@container relative h-[852px] w-[393px] overflow-clip bg-surface-quaternary'
            : '@container relative h-[40rem] w-[1024px] overflow-clip bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen', phone: true },
  args: {
    direction: talaToNovaliches,
    directions: [talaToNovaliches, novalichesToTala],
    timeline: talaTimeline,
    livery: 'violet',
    onBackToList: fn(),
    onSwitch: fn(),
    onClose: fn(),
    picked: null,
    pickedMetres: undefined,
    pickedCode: null,
    onPick: fn(),
    onEnd: fn(),
    endPicked: null,
    dockRef: fn(),
    height: { snap: 'middle', onSnap: fn() },
  },
} satisfies Meta<typeof TripCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Opens the fold, as a rider's tap would — and lets go of it, since a tap
 * draws no focus ring. A train's says "N more stations".
 */
const openFold: Story['play'] = async ({ canvasElement }) => {
  const fold = within(canvasElement).getByRole('button', { name: /more (hintuans|stations)/ });
  await userEvent.click(fold);
  fold.blur();
};

/** A jeep's trip, opened from the list: its ends, its length, and the pesos its metres come to today. */
export const Jeepney: Story = {};

/** Raised to Max: every hintuan on the way in sight. */
export const JeepneyMax: Story = { args: { height: { snap: 'max', onSnap: fn() } } };

/** SWITCH turns it round: the way back is drawn, so the card asks for that direction. */
export const TurnsRound: Story = {
  play: async ({ args, canvasElement }) => {
    const turn = within(canvasElement).getByTestId('card-switch');
    await userEvent.click(turn);
    turn.blur();
    await expect(args.onSwitch).toHaveBeenCalledWith(novalichesToTala);
  },
};

/** Turned round: the way back, in the colour it opened in. */
export const TheWayBack: Story = {
  args: {
    direction: novalichesToTala,
    timeline: timelineOf('Novaliches', 'Tala', talaTimeline.between.map((r) => r.label).reverse()),
  },
};

/** The way back still a slot: SWITCH rests disabled, and a tap asks for nothing. */
export const NoWayBack: Story = {
  args: { directions: [talaToNovaliches, { ...novalichesToTala, shape: null }] },
  play: async ({ args, canvasElement }) => {
    const turn = within(canvasElement).getByTestId('card-switch');
    await expect(turn).toBeDisabled();
    await userEvent.click(turn);
    await expect(args.onSwitch).not.toHaveBeenCalled();
  },
};

/** In the studio, the way back still a slot: SWITCH is open, and a tap starts drawing it. */
export const DrawTheWayBack: Story = {
  args: {
    directions: [talaToNovaliches, { ...novalichesToTala, shape: null }],
    onDrawOtherWay: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const turn = within(canvasElement).getByTestId('card-switch');
    await expect(turn).toBeEnabled();
    await userEvent.click(turn);
    await expect(args.onDrawOtherWay).toHaveBeenCalled();
    await expect(args.onSwitch).not.toHaveBeenCalled();
  },
};

/** Opened from a hotspot's card, not the list: no ‹ back to it. */
export const NoList: Story = {
  render: (args) => <Keeping {...args} onBackToList={null} />,
};

/** A hintuan picked: its pill prices the ride from Tala to there. */
export const PickedHintuan: Story = {
  args: { picked: 'amparo', pickedMetres: 7_300, height: { snap: 'max', onSnap: fn() } },
  play: openFold,
};

/** The far end's row picked: the whole ride, that end on the map. */
export const EndPicked: Story = { args: { endPicked: 'to' } };

/** Another route leaves from the same place: "Other routes" lists it, and a tap opens it in this one's place. */
export const OtherRoutes: Story = {
  args: {
    directions: [talaToNovaliches, novalichesToTala, talaToFairview],
    onOtherRoute: fn(),
    height: { snap: 'max', onSnap: fn() },
  },
  play: async ({ args, canvasElement }) => {
    const other = within(canvasElement).getByTestId('trip-other-route');
    await userEvent.click(other);
    other.blur();
    await expect(args.onOtherRoute).toHaveBeenCalledWith(talaToFairview);
  },
};

/** A train: priced by its stations, not its metres, in its line's colours; its line and bound at the top (LRT-1 Southbound); the picked station's code in its pill. */
export const Train: Story = {
  args: {
    direction: direction('lrt1', 'Fernando Poe Jr.', 'Baclaran', {
      mode: 'lrt',
      routeCode: 'LRT-1',
    }),
    directions: [],
    timeline: timelineOf('Fernando Poe Jr.', 'Baclaran', [
      'Balintawak',
      'Monumento',
      'Carriedo',
      'EDSA',
    ]),
    livery: 'light-rail-way-one',
    picked: 'carriedo',
    pickedCode: 'CAR',
    height: { snap: 'max', onSnap: fn() },
  },
  // Carriedo picked: the stations before it on the ride, EDSA the one after
  // it, shown as it is, so nothing folds.
};

/** MRT-3 Northbound: its header's words black on the white halves, not its yellow. */
export const TrainMrt3: Story = {
  args: {
    direction: direction('mrt3', 'Taft Avenue', 'North Avenue', {
      mode: 'mrt',
      routeCode: 'MRT-3',
    }),
    directions: [],
    timeline: timelineOf('Taft Avenue', 'North Avenue', ['Magallanes', 'Ayala', 'Cubao']),
    livery: 'metro-rail-way-three',
  },
};

/**
 * A train whose end the line's table does not know: no bound, so the header shows the line alone,
 * and SWITCH falls back to Pabalik and Papunta, as over a mixed list (switchWord). TODO: what
 * SWITCH should say for a train with no known bound is not designed yet.
 */
export const TrainNoBound: Story = {
  args: {
    direction: direction('lrt1x', 'Fernando Poe Jr.', 'Nowhere', {
      mode: 'lrt',
      routeCode: 'LRT-1',
    }),
    directions: [],
    timeline: timelineOf('Fernando Poe Jr.', 'Nowhere', ['Balintawak', 'Monumento']),
    livery: 'light-rail-way-one',
  },
};

/** The ferry: free, with the line's own words under the tiles. */
export const Ferry: Story = {
  args: {
    direction: direction('prfs', 'Escolta', 'Guadalupe', { mode: 'ferry', routeCode: 'PRFS' }),
    directions: [],
    timeline: timelineOf('Escolta', 'Guadalupe', ['Lawton', 'PUP', 'Lambingan', 'Valenzuela']),
    livery: 'orange',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('trip-note')).toHaveTextContent('MMDA');
  },
};

/**
 * A sample board, not a real one: a picture standing in for the SVG files the studio uploads, so
 * its colours are the picture's, not the page's.
 */
const sampleBoard = (name: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="98" height="40" viewBox="0 0 98 40"><rect width="98" height="40" fill="black"/>` +
      `<text x="49" y="25" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="12" fill="yellow">${name}</text></svg>`,
  );

/** The direction's boards, by file name: `signboardUrl` says where each is read (the studio's bucket here; the published map's folder by default). */
export const Signboards: Story = {
  args: {
    direction: { ...talaToNovaliches, signboards: ['NOVA', 'TALA'] },
    signboardUrl: sampleBoard,
  },
  play: async ({ canvasElement }) => {
    const boards = within(canvasElement).getAllByTestId('trip-signboard');
    await expect(boards).toHaveLength(2);
    await expect(boards[0]).toHaveAttribute('src', sampleBoard('NOVA'));
  },
};

/** No fare rule prices this mode: the fare tile has nothing to say. */
export const Unpriced: Story = {
  args: {
    direction: direction('trike', 'Tala', 'Bagong Silang', { mode: 'tricycle', metres: 2_100 }),
    directions: [],
  },
};

/** No hintuans along the way yet: only its two ends. */
export const NoHintuans: Story = { args: { timeline: timelineOf('Tala', 'Novaliches', []) } };

/** The studio's: its facts and its Edit, Extend and Delete under the tiles (`extras`). */
export const StudioExtras: Story = {
  args: {
    extras: (
      <p className="px-4 py-3 text-sm text-content-secondary">
        Drawn 2026-09-28 · 42 points · Edit, Extend and Delete sit here
      </p>
    ),
  },
};

/** Thirty hintuans and long place names: the body scrolls, and the names wrap. */
export const LongContent: Story = {
  args: {
    direction: direction(
      'long',
      'Fairview Teraccess Transport Terminal',
      'Novaliches (Bayan) via Zabarte',
    ),
    directions: [],
    timeline: timelineOf(
      'Fairview Teraccess Transport Terminal',
      'Novaliches (Bayan) via Zabarte',
      Array.from({ length: 30 }, (_, i) => `Hintuan ${i + 1}`),
    ),
    height: { snap: 'max', onSnap: fn() },
  },
};

/** A wide map: the trip in the top-left corner, 384 wide, as the list was. */
export const Wide: Story = { parameters: { phone: false } };

const ikotBase = direction('ikot', 'UP', 'UP', { metres: 5_200 });
const ikot: Direction = {
  ...ikotBase,
  id: 'ikot-out',
  name: 'UP – Ikot',
  route: ikotBase.route && {
    ...ikotBase.route,
    signboard: 'UP – Ikot',
    headHotspotId: null,
    tailHotspotId: null,
    name: 'UP – Ikot',
    isLoop: true,
  },
};
const ikotTimeline: Timeline = {
  from: row('Oblation'),
  to: row('Oblation'),
  between: ['Palma Hall', 'Quezon Hall', 'Sunken Garden', 'Engineering'].map((l) => row(l)),
};

/**
 * A loop's trip (UP – Ikot): "Ikot" where Papunta stands, the tip at the top
 * and again at the bottom, the tiles the whole loop's, and no SWITCH.
 */
export const Loop: Story = {
  args: { direction: ikot, directions: [ikot], timeline: ikotTimeline, livery: 'orange' },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(card.queryByTestId('card-switch')).toBeNull();
    await expect(card.getByText('Ikot')).toBeVisible();
  },
};

/** A hintuan picked on the loop: the ride from the tip forward to it. */
export const LoopPicked: Story = {
  args: {
    direction: ikot,
    directions: [ikot],
    timeline: ikotTimeline,
    livery: 'orange',
    picked: 'quezon-hall',
    pickedMetres: 2_100,
  },
};
