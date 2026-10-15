import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';

import { TimelineRouteDetail } from './timeline-route-detail';
import { LIVERIES } from '../model/liveries';

/**
 * A trip's card on its own, as TimelineRouteDetailCard insets it: one story a state,
 * and the pick in each livery. Long names, the rows after a pick folding,
 * and the taps, Set as start's among them, are TimelineRouteDetailCard's
 * stories. Sample data only: the places of
 * the owner's frames (3762:3546), not the real map.
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

/** Opens the fold, as a rider's tap would — and lets go of it, since a tap draws no focus ring. */
const openFold: Story['play'] = async ({ canvasElement }) => {
  const fold = within(canvasElement).getByRole('button', { name: /more (hintuans|stations)/ });
  await userEvent.click(fold);
  fold.blur();
};

const meta = {
  title: 'Features/Routes/TimelineRouteDetail',
  component: TimelineRouteDetail,
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface px-3 py-3">
        <Story />
      </div>
    ),
  ],
  args: {
    livery: 'violet',
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

/** Ten hintuans folded into one row. */
export const Folded: Story = {};

/** Opened: every hintuan alike, then View less. */
export const Opened: Story = { play: openFold };

/** One hintuan on the way: shown as it is, not folded. */
export const OneHintuan: Story = {
  args: { routeOrigin: 'Fatima', hintuans: hintuans('Lagro'), routeDirection: 'SM Fairview' },
};

/** None on the way yet: the rail runs straight from the origin to the end. */
export const NoHintuan: Story = {
  args: { routeOrigin: 'Lagro', hintuans: [], routeDirection: 'SM Fairview' },
};

/** Red, the Timeline set's own colour. */
export const Red: Story = { args: { livery: 'red' } };

/** Orange. */
export const Orange: Story = { args: { livery: 'orange' } };

/** Fuchsia. */
export const Fuchsia: Story = { args: { livery: 'fuchsia' } };

/** Pink. */
export const Pink: Story = { args: { livery: 'pink' } };

/**
 * A hintuan picked: its dot a white ring round the rail's colour, End's E
 * before its name, now ExtraBold, its pill with the pesos to there, and Set
 * as start under it when there is a button for it. The rail runs only along
 * the ride (the owner, 2026-10-15): from the origin down to it, ending
 * there (MiddleBottom); the rows after it, the fold's and the destination's,
 * are their dots alone (Disconnected), the destination without its E.
 * The fold after it opened.
 */
export const HintuanPicked: Story = { args: { picked: 'h3' }, play: openFold };

/** A hintuan picked, the rows after it folded away: the ride's own rows stay open. */
export const HintuanPickedFolded: Story = { args: { picked: 'h3' } };

/** The last hintuan picked: the rail runs to it, nothing after it to fold, and only the destination is left without a rail. */
export const LastHintuanPicked: Story = { args: { picked: 'h9' } };

/** Picked, red: the pill in the card's own colours, swapped. */
export const HintuanPickedRed: Story = { args: { livery: 'red', picked: 'h3' }, play: openFold };

/** Picked, orange. */
export const HintuanPickedOrange: Story = {
  args: { livery: 'orange', picked: 'h3' },
  play: openFold,
};

/** Picked, fuchsia: the pill white, as red's. */
export const HintuanPickedFuchsia: Story = {
  args: { livery: 'fuchsia', picked: 'h3' },
  play: openFold,
};

/** Picked, pink: the pill white, as fuchsia's. */
export const HintuanPickedPink: Story = {
  args: { livery: 'pink', picked: 'h3' },
  play: openFold,
};

/** LRT-1: the rail in Map/Rail/LightRailWayOne/Timeline/surface, Content/inverse words (4074:7402, 2026-10-13); a train's fold reads "N more stations". */
export const LightRailWayOne: Story = { args: { livery: 'light-rail-way-one', isTrain: true } };

/** Picked, LRT-1: the pill white, the station's code and pesos in the line's Timeline/surface, as his frame draws it. */
export const HintuanPickedLightRailWayOne: Story = {
  args: { livery: 'light-rail-way-one', picked: 'h3', pickedCode: 'GL04', isTrain: true },
  play: openFold,
};

/** LRT-2: the rail in Map/Rail/LightRailWayTwo/Timeline/surface, Content/inverse words (4080:4124, 2026-10-13). */
export const LightRailWayTwo: Story = { args: { livery: 'light-rail-way-two', isTrain: true } };

/** Picked, LRT-2: the pill white, the station's code and pesos in the line's Timeline/surface, as his frame draws it. */
export const HintuanPickedLightRailWayTwo: Story = {
  args: { livery: 'light-rail-way-two', picked: 'h3', pickedCode: 'PL04', isTrain: true },
  play: openFold,
};

/** MRT-3: the rail in Map/Rail/MetroRailWayThree/Timeline/surface, Content/primary, dark, words (4080:4241, 2026-10-13). */
export const MetroRailWayThree: Story = { args: { livery: 'metro-rail-way-three', isTrain: true } };

/** Picked, MRT-3: the pill white, the station's code and pesos in the line's Timeline/surface, as his frame draws it. */
export const HintuanPickedMetroRailWayThree: Story = {
  args: { livery: 'metro-rail-way-three', picked: 'h3', pickedCode: 'YL06', isTrain: true },
  play: openFold,
};

/** One hintuan on the way, picked: not folded, so no fold to open. */
export const OneHintuanPicked: Story = {
  args: {
    routeOrigin: 'Fatima',
    hintuans: hintuans('Lagro'),
    routeDirection: 'SM Fairview',
    picked: 'h0',
    pickedPesos: '₱14',
  },
};

/** A hintuan picked but unpriced: no pill. */
export const HintuanPickedUnpriced: Story = {
  args: { picked: 'h3', pickedPesos: undefined },
  play: openFold,
};

/** The origin picked from its row: its dot the Selected one. */
export const OriginPicked: Story = { args: { endPicked: 'from' } };

/** The destination picked from its row: its dot the Selected one. */
export const DestinationPicked: Story = { args: { endPicked: 'to' } };

/**
 * Every row's State=Pressed (Timeline, 3716:1894): press and hold a row —
 * where it leaves from, a hintuan (Pangarap is picked, so a Selected one
 * too), the fold, where it goes — and it wears the rail's colour while the
 * finger or the mouse is down. A browser state, `:active`, so there is
 * nothing to set: hold it to see it, in each livery. Opened, so every row
 * is there to hold.
 */
export const RowPressed: Story = {
  args: { picked: 'h2', pickedPesos: '₱14' },
  play: async ({ canvasElement }) => {
    for (const fold of within(canvasElement).getAllByRole('button', { name: /more hintuans/ })) {
      await userEvent.click(fold);
      fold.blur();
    }
  },
  render: (args) => (
    <div className="flex flex-col gap-4">
      {LIVERIES.map((livery) => (
        <TimelineRouteDetail key={livery} {...args} livery={livery} />
      ))}
    </div>
  ),
};

/**
 * The owner's TimelineRouteDetail (Figma 4137:9886, 2026-10-15), on his
 * example: MRT-3 Southbound, North Avenue to Taft Avenue. Station names and
 * codes as the line's tables have them (rail-codes.ts); his frames write
 * YL60 for every pick.
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
  isTrain: true,
  onSetStart: fn(),
  onRemoveStart: fn(),
} as const;

/** Variant6 (4157:7737): folded, S at North Avenue and E at Taft Avenue. */
export const RideFolded: Story = { args: onMrt3 };

/** Rest (4137:9884): opened, nothing picked; the rail end to end. */
export const RideRest: Story = { args: onMrt3, play: openFold };

/**
 * Choosing (4137:9887): Shaw Boulevard tapped is the end, E and its pill,
 * Set as start under it; the stations after it folded.
 */
export const RideChoosing: Story = {
  args: { ...onMrt3, picked: shaw, pickedCode: 'YL07', pickedPesos: '₱10' },
};

/**
 * Variant3 (4148:12161): after Set as start, Shaw Boulevard is the start,
 * × Remove as start under it, the pill pricing the ride on to Taft Avenue,
 * which keeps its E. North Avenue loses its S, and the stations before
 * Shaw Boulevard fold.
 */
export const RideStartPicked: Story = {
  args: { ...onMrt3, start: shaw, startCode: 'YL07', pickedPesos: '₱10' },
};

/** Variant3 with the stations before the start opened: their dots alone, no rail, and their fold none either. */
export const RideStartPickedOpened: Story = {
  args: RideStartPicked.args,
  play: async ({ canvasElement }) => {
    const fold = canvasElement.querySelector<HTMLButtonElement>(
      'button[data-testid="trip-fold"][data-part="before"]',
    );
    if (!fold) throw new Error('no fold before the start');
    await userEvent.click(fold);
    fold.blur();
  },
};

/** Variant4 (4151:13124): start at Shaw Boulevard, Ayala tapped: the ride Shaw Boulevard → Ayala. */
export const RideStartAndEnd: Story = {
  args: {
    ...onMrt3,
    start: shaw,
    startCode: 'YL07',
    picked: ayala,
    pickedCode: 'YL11',
    pickedPesos: '₱8',
  },
};

/**
 * Variant5 (4151:13619): start at Shaw Boulevard, Quezon Avenue tapped, a
 * station before it. The card stays as it is (the owner, 2026-10-15): E at
 * Quezon Avenue above S at Shaw Boulevard, the rail between them. The map
 * serves the ride on the Northbound line.
 */
export const RideEndBeforeStart: Story = {
  args: {
    ...onMrt3,
    start: shaw,
    startCode: 'YL07',
    picked: quezon,
    pickedCode: 'YL02',
    pickedPesos: '₱10',
  },
};

/** A jeep's ride between two hintuans: the pesos alone in the pill, the same buttons. */
export const RideStartAndEndJeep: Story = {
  args: { start: 'h2', picked: 'h6', pickedPesos: '₱14', onSetStart: fn(), onRemoveStart: fn() },
};
