import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { RouteCardList } from './route-card-list';
import type { Hotspot } from '../model/hotspots';
import type { ModePicks } from '../model/mode-filter';
import type { Direction } from '../model/routes';

/** Sample data only, shaped like the published map. Not the real map. */
function route(id: string, name: string): Direction['route'] {
  return {
    id,
    signboard: null,
    longName: null,
    mode: 'jeepney',
    fareNote: null,
    headHotspotId: id + '-head',
    tailHotspotId: id + '-tail',
    via: null,
    name,
  };
}

/**
 * One direction, its line `km` long straight north; `drawn` false leaves it
 * a slot.
 */
function direction(
  key: string,
  name: string,
  direction: string,
  km: number,
  reversed = false,
  drawn = true,
): Direction {
  return {
    id: key + (reversed ? '-back' : '-out'),
    routeId: key + '-route',
    name: direction,
    originTerminal: null,
    destinationTerminal: null,
    shape: drawn
      ? {
          type: 'LineString',
          coordinates: [
            [121.04, 14.7],
            [121.04, 14.7 + km / 111.2],
          ],
        }
      : null,
    reversed,
    confidence: 'drawn',
    route: route(key + '-route', name),
  };
}

/** Figma's frames: two routes into Tala, and out of it the other way round. */
const talaRoutes: Direction[] = [
  direction('a', 'Novaliches (Bayan) – Tala', 'Novaliches (Bayan) → Tala', 8.4),
  direction('a', 'Novaliches (Bayan) – Tala', 'Tala → Novaliches (Bayan)', 8.6, true),
  direction('b', 'SM Fairview – Tala', 'SM Fairview → Tala', 9.1),
  direction('b', 'SM Fairview – Tala', 'Tala → SM Fairview', 9.3, true),
];

/** Six places, for a list taller than the room. */
const many: Direction[] = [
  'Novaliches (Bayan)',
  'SM Fairview',
  'Lagro',
  'Fatima',
  'Quiapo',
  'Cubao',
].flatMap((p, i) => [
  direction('m' + i, `${p} – Tala`, `${p} → Tala`, 3 + i * 2),
  direction('m' + i, `${p} – Tala`, `Tala → ${p}`, 3 + i * 2, true),
]);

/** A place whose name runs to two lines on a phone, at RouteCard's 24/32. */
const LONG = 'Novaliches (Bayan) via Zabarte and Quirino Highway';
const longName: Direction[] = [
  direction('l', `${LONG} – Tala`, `${LONG} → Tala`, 8.4),
  direction('l', `${LONG} – Tala`, `Tala → ${LONG}`, 8.6, true),
];

/** Their ways back still slots: nothing for PAPUNTA to turn to. */
const oneWay: Direction[] = [
  direction('c', 'Lagro – Fatima', 'Lagro → Fatima', 2.5),
  direction('c', 'Lagro – Fatima', 'Fatima → Lagro', 2.5, true, false),
  direction('d', 'Lagro – Quiapo', 'Lagro → Quiapo', 16),
  direction('d', 'Lagro – Quiapo', 'Quiapo → Lagro', 16, true, false),
];

function hotspot(
  id: string,
  name: string,
  kind: Hotspot['kind'],
  informal: string | null = null,
): Hotspot {
  return {
    id,
    name,
    informal,
    aliases: [],
    kind,
    point: { type: 'Point', coordinates: [121.04, 14.7] },
    area: null,
    note: null,
    createdAt: '2026-09-12T00:00:00Z',
  };
}

/** Tala's terminal, where its routes run through it: the tap a terminal most often gets. */
const talaTerminal = hotspot('s1', 'Tala Jeepney Terminal', 'terminal', 'Tala');

/** Two boxes under one finger, and no line. */
const twoBoxes = [talaTerminal, hotspot('s2', 'Malaria', 'hintuan')];

/** One hintuan's two boxes, a mini hotspot either side of the road. */
const oneHintuan = [
  hotspot('s3', 'SM Fairview Main Babaan', 'hintuan', 'SM Fairview'),
  hotspot('s4', 'SM Fairview Main Sakayan', 'hintuan', 'SM Fairview'),
];

type Frame = 'phone' | 'tablet' | 'wide';
const FRAME = {
  phone: 'max-h-[852px] w-[393px]',
  tablet: 'max-h-[960px] w-[640px]',
  wide: 'max-h-[640px] w-[1024px]',
} satisfies Record<Frame, string>;
const frameOf = (p: { frame?: Frame }) => FRAME[p.frame ?? 'phone'];

/**
 * Keeps the filter as the apps do, where a story gives one, and the Selected card where it has
 * `selection` (isCardSelectable), so a story can be tapped through.
 */
function Picking(props: ComponentProps<typeof RouteCardList>) {
  const [selected, setSelected] = useState(props.selection?.selected ?? null);
  const onSelect = props.selection?.onSelect;
  const [picks, setPicks] = useState<ModePicks>(props.modeFilter?.picks ?? []);
  return (
    <RouteCardList
      {...props}
      modeFilter={
        props.modeFilter && {
          picks,
          onPicks: (next) => {
            props.modeFilter?.onPicks(next);
            setPicks(next);
          },
        }
      }
      selection={
        onSelect && {
          selected,
          onSelect: (p) => {
            onSelect(p);
            setSelected(p?.card ?? null);
          },
        }
      }
    />
  );
}

const meta = {
  title: 'Features/Routes/RouteCardList',
  component: RouteCardList,
  render: (args) => <Picking {...args} />,
  // A map-sized box, marked @container as the apps' roots are: the list docks
  // along its bottom, and from 1024 wide (`@float:`) the map's whole height on
  // the left — Figma's frames at 393, 768 and 1024.
  // Never taller than the canvas, so the story itself does not scroll.
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
    routes: talaRoutes,
    back: false,
    listing: 'every-line',
    onRoute: fn(),
    onHotspot: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof RouteCardList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * On a phone, the way there, as the public map and the studio show it (Figma 4796:34329): a card
 * per place, docked along the bottom, each in its mode's colour, and no bar of its own — Vice
 * Versa and the sliders float on the map (MapSheetControls).
 */
export const Phone: Story = {};

/** A filter on, Jeep: only the jeeps' cards. */
export const FilteredToJeep: Story = {
  args: { modeFilter: { picks: ['jeep'], onPicks: fn() } },
};

/** Turned round with Vice Versa: out of Tala both ways, one card — "1 Route". */
export const Switched: Story = { args: { back: true } };

/** Where cards are selectable (isCardSelectable), Tala's card picked: pressed in. */
export const ACardSelected: Story = {
  args: { back: true, selection: { selected: 'Tala|jeep', onSelect: fn() } },
};

/** From 1024 wide (Figma 4831:53545): docked the map's whole height on the left, 384 wide. */
export const Floating: Story = { parameters: { frame: 'wide' } };

/**
 * Figma's 640 frame: still docked, as wide as the screen — the glow runs edge
 * to edge.
 */
export const Tablet: Story = { parameters: { frame: 'tablet' } };

/** Taller than the room: the cards scroll. */
export const ManyPlaces: Story = { args: { routes: many } };

/** The other way round is not drawn yet: its one way's cards alone. */
export const NothingTheOtherWay: Story = { args: { routes: oneWay } };

/**
 * SM Fairview → Cubao runs on Novaliches → Tala, whose Tala → Novaliches is
 * still a slot: a tap there lists both lines on the outbound list, Novaliches
 * → Tala under Novaliches. "2 Routes".
 */
const underOneFinger: Direction[] = [
  direction('n', 'Tala – Novaliches', 'Tala → Novaliches', 8.4, false, false),
  direction('n', 'Tala – Novaliches', 'Novaliches → Tala', 8.4, true),
  direction('f', 'SM Fairview – Cubao', 'SM Fairview → Cubao', 12),
  direction('f', 'SM Fairview – Cubao', 'Cubao → SM Fairview', 12, true),
];

export const EveryLineUnderTheTap: Story = {
  args: { routes: underOneFinger },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement);
    await expect(list.getByRole('dialog', { name: '2 Routes' })).toBeInTheDocument();
    // Its heading, hidden from the eye, for a screen reader to move to.
    await expect(list.getByRole('heading', { level: 2, name: 'Routes here' })).toBeInTheDocument();
    await expect(list.getByText('Novaliches')).toBeInTheDocument();
    await expect(list.getByText('Tala')).toBeInTheDocument();
  },
};

/**
 * The same routes behind a trip opened on its own (`way-round`): only the way
 * round the trip goes is listed, so Novaliches → Tala is not.
 */
export const WayRoundOnly: Story = {
  args: { routes: underOneFinger, listing: 'way-round' },
  play: async ({ canvasElement }) => {
    const list = within(canvasElement);
    await expect(list.getByRole('dialog', { name: '1 Route' })).toBeInTheDocument();
    await expect(list.queryByText('Novaliches')).toBeNull();
  },
};

/**
 * A tap on a hotspot with routes running through it: the hotspot first, as a
 * plain row, then the cards. The count stays the routes'.
 */
export const WithAHotspot: Story = { args: { hotspots: [talaTerminal] } };

/** The same, from 1024 wide. */
export const WithAHotspotFloating: Story = {
  args: { hotspots: [talaTerminal] },
  parameters: { frame: 'wide' },
};

/** Two boxes and no line: "2 Hotspots", with no route to count. */
export const TwoHotspots: Story = { args: { routes: [], hotspots: twoBoxes } };

/**
 * Both boxes of one hintuan and no line: a row each, and "1 Hotspot", as a
 * rider counts it (hotspotCount).
 */
export const OneHintuanTwoBoxes: Story = { args: { routes: [], hotspots: oneHintuan } };

/**
 * The list's sheet (4633:25516) opens at Low. It draws no HandleNotch, but the handle stays for
 * the keyboard: a press on it steps a third of the screen, up to full height and back. Presses
 * Enter on it until the sheet is at `until`, or once with no `until`.
 */
const pressHandle = async (canvasElement: HTMLElement, until?: 'full') => {
  const handle = within(canvasElement).getByTestId('dock-handle');
  const sheet = within(canvasElement).getByTestId('chooser');
  handle.focus();
  for (let i = 0; i < 4; i++) {
    await userEvent.keyboard('{Enter}');
    if (!until || sheet.getAttribute('data-snap') === until) break;
  }
  handle.blur();
};

/** Full height (4633:25575): the whole screen, the places scrolling. */
export const SheetFull: Story = {
  args: { routes: many },
  play: async ({ canvasElement }) => {
    await pressHandle(canvasElement, 'full');
    await expect(within(canvasElement).getByTestId('chooser')).toHaveAttribute('data-snap', 'full');
  },
};

/** Low, where it opens: the first card's mode and the top of its name, 80 tall (4884:38931). */
export const SheetLow: Story = {
  play: async ({ canvasElement }) => {
    const sheet = within(canvasElement).getByTestId('chooser');
    await expect(sheet).toHaveAttribute('data-snap', 'low');
    await expect(sheet).toHaveAttribute('data-low-px', '80');
  },
};

/** At Low, on the public map, a tap on a card opens its trip straight away: the sheet stays. */
export const SheetLowACardOpens: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByTestId('chooser-select')[0]);
    await expect(args.onRoute).toHaveBeenCalledTimes(1);
    await expect(canvas.getByTestId('chooser')).toHaveAttribute('data-snap', 'low');
  },
};

/** At Low, where cards are selectable, a tap on a card raises the sheet a third, as the handle does: no pick. */
export const SheetLowSelectableRaises: Story = {
  args: { selection: { selected: null, onSelect: fn() } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByTestId('chooser-select')[0]);
    await waitFor(() =>
      expect(canvas.getByTestId('chooser')).not.toHaveAttribute('data-snap', 'low'),
    );
    await expect(args.selection?.onSelect).not.toHaveBeenCalled();
    await expect(args.onRoute).not.toHaveBeenCalled();
  },
};

/**
 * The list filtered to a kind of ride nothing here is, its sliders on the map: the list says so,
 * with a way back to All.
 */
export const FilteredToNothing: Story = {
  args: {
    modeFilter: { picks: ['ferry'], onPicks: fn() },
    height: { snap: 0.55, onSnap: fn() },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No Ferry routes here')).toBeVisible();
    await expect(canvas.getByRole('dialog', { name: '0 Routes' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Show all routes' }));
    await expect(canvas.queryByText('No Ferry routes here')).toBeNull();
  },
};

/**
 * Low with a long place, in a list taller than Low: one line of it, 32 tall (RouteCard's 24/32),
 * cut short (3817:6007).
 */
export const SheetLowLongName: Story = {
  args: { routes: [...longName, ...talaRoutes] },
  play: async ({ canvasElement }) => {
    const name = within(canvasElement).getByText(LONG);
    await waitFor(() => expect(name.getBoundingClientRect().height).toBe(32));
  },
};

/**
 * Raised a third with a long place: all of it, on as many lines as it takes, the list rising no
 * higher than its last card.
 */
export const SheetRaisedLongName: Story = {
  args: { routes: [...longName, ...talaRoutes] },
  play: async ({ canvasElement }) => {
    await pressHandle(canvasElement);
    const sheet = within(canvasElement).getByTestId('chooser');
    await expect(sheet).not.toHaveAttribute('data-snap', 'low');
    const name = within(canvasElement).getByText(LONG);
    await waitFor(() => expect(name.getBoundingClientRect().height).toBeGreaterThan(32));
    const cards = within(sheet).getAllByTestId('chooser-origin');
    const lastFoot = cards[cards.length - 1]?.getBoundingClientRect().bottom ?? 0;
    await expect(lastFoot).toBeGreaterThanOrEqual(window.innerHeight - 1);
  },
};

/** UP – Ikot: a loop, one direction, called by its signboard and going to "Ikot". */
const ikotLoop: Direction = {
  ...direction('ikot', 'UP – Ikot', 'UP – Ikot', 5.2),
  name: 'UP – Ikot',
  route: {
    ...route('ikot-route', 'UP – Ikot'),
    headHotspotId: null,
    tailHotspotId: null,
    signboard: 'UP – Ikot',
    isLoop: true,
  },
};

/** A loop in the list, beside Tala's routes: its row says Ikot, and it is there whichever way round the list is. */
export const WithALoop: Story = { args: { routes: [...talaRoutes, ikotLoop] } };

/** Only a loop: no way back to turn to. */
export const OnlyALoop: Story = { args: { routes: [ikotLoop] } };
