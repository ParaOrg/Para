import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat, Segment } from '@/shared/utils/geo';

import { SaveNotices } from './save-notices';

const from: LngLat = [121.043326, 14.742006];
const to: LngLat = [121.04184, 14.742003];
const routed = (streets?: Segment['streets']): Segment => ({
  snap: 'snapped',
  coordinates: [from, to],
  streets,
});
const straight: Segment = { snap: 'freehand', coordinates: [from, to] };

/** Tala – SM Fairview's outbound as the list holds it: what an Extend borrows from. */
const parent: DirectionRow = {
  id: 'sample-out',
  routeId: 'sample-route',
  name: 'Tala → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: null,
  reversed: false,
  confidence: 'drawn',
  updatedAt: '2026-09-21T00:00:00Z',
  route: {
    id: 'sample-route',
    signboard: null,
    routeCode: null,
    shortName: null,
    longName: null,
    mode: 'jeepney',
    fareNote: null,
    fareAsOf: null,
    headHotspotId: 'sample-tala',
    tailHotspotId: 'sample-fairview',
    via: null,
    name: 'Tala – SM Fairview',
  },
};

const meta = {
  title: 'Features/Studio/SaveNotices',
  component: SaveNotices,
  // Inside the save panel's card, at its width. The `phone` parameter puts it
  // at a handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div className={ctx.parameters.phone ? 'w-[390px] bg-surface p-6' : 'w-md bg-surface p-6'}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    segments: [
      routed([{ name: 'Sinai Street', metres: 160 }]),
      routed([
        { name: 'Sinai Street', metres: 60 },
        { name: 'Assyria Street', metres: 55 },
      ]),
    ],
    uTurns: [],
    hotspotsCount: 2,
    wrongWay: null,
    borrowed: null,
    sameEnds: null,
    direction: 'Tala → SM Fairview',
  },
} satisfies Meta<typeof SaveNotices>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An ikot that goes by a place twice: only the first pass is listed, and the editor is told. */
export const IkotPassesAPlaceTwice: Story = {
  args: { isLoop: true, passedTwice: ['Katipunan'], hotspotsCount: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('save-passed-twice')).toHaveTextContent('Katipunan');
    // An ikot has no ends to end at, so no hotspots is not the warning it is for a route.
    await expect(canvas.queryByText(/No hotspots yet/)).toBeNull();
  },
};

/** A clean line: only the streets it runs along. */
export const Streets: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('save-streets')).toHaveTextContent(
      'via Sinai Street → Assyria Street',
    );
  },
};

/** Nothing to say: no street names, nothing to warn of, so nothing at all. */
export const Nothing: Story = {
  args: { segments: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('p')).toBeNull();
  },
};

/** Routed before names were recorded, one stretch straight: the hint how to fill them in. */
export const NamesMissing: Story = {
  args: { segments: [routed(), routed(), straight] },
};

/** Streets and two straight stretches: the list says so rather than running across them. */
export const WithStraightStretches: Story = {
  args: {
    segments: [routed([{ name: 'Sinai Street', metres: 160 }]), straight, straight],
  },
};

/** One U-turn ringed on the map: warned, never blocked. */
export const UTurn: Story = {
  args: { uTurns: [{ point: 1, stub: [], metres: 60 }] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('save-uturns')).toHaveTextContent(
      'at one point',
    );
  },
};

/** The return trip's slot, drawn from the wrong end. */
export const WrongWay: Story = {
  args: {
    wrongWay: { direction: 'SM Fairview → Tala', startsAt: 'Tala', from: 'SM Fairview' },
  },
};

/** An Extend: what it shares with the line it was started from. */
export const Borrowed: Story = {
  args: { borrowed: { metres: 2_480, parent } },
};

/** These ends already make a route whose direction is still a slot: this line fills it. */
export const SameEndsUndrawn: Story = {
  args: { sameEnds: { name: 'Tala – SM Fairview', drawn: false } },
};

/** These ends already make a route with this direction drawn: open it instead. */
export const SameEndsDrawn: Story = {
  args: { sameEnds: { name: 'Tala – SM Fairview', drawn: true } },
};

/** A route with these ends, and a direction not yet named: the notice says "this direction". */
export const SameEndsUnnamedDirection: Story = {
  args: { sameEnds: { name: 'Tala – SM Fairview', drawn: false }, direction: '' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('save-same-ends')).toHaveTextContent(
      'and this direction is still undrawn',
    );
  },
};

/** The same, with that direction drawn already. */
export const SameEndsDrawnUnnamedDirection: Story = {
  args: { sameEnds: { name: 'Tala – SM Fairview', drawn: true }, direction: '' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('save-same-ends')).toHaveTextContent(
      'already has this direction drawn',
    );
  },
};

/** No hotspots saved at all: a route is named after its ends, so draw those first. */
export const NoHotspots: Story = {
  args: { hotspotsCount: 0 },
};

/** Everything at once, with a long street list: the notices stack in the panel's order. */
export const LongContent: Story = {
  args: {
    segments: [
      routed([
        { name: 'Quirino Highway', metres: 1_200 },
        { name: 'Regalado Avenue', metres: 900 },
        { name: 'Commonwealth Avenue', metres: 2_400 },
        { name: 'Tandang Sora Avenue', metres: 700 },
        { name: 'Visayas Avenue', metres: 1_100 },
      ]),
      routed(),
      straight,
      straight,
    ],
    uTurns: [
      { point: 2, stub: [], metres: 60 },
      { point: 5, stub: [], metres: 45 },
    ],
    wrongWay: {
      direction: 'SM City Fairview Public Transport Terminal → Novaliches Bayan',
      startsAt: 'Novaliches Bayan',
      from: 'SM City Fairview Public Transport Terminal',
    },
    borrowed: { metres: 2_480, parent },
    sameEnds: {
      name: 'Novaliches Bayan – SM City Fairview Public Transport Terminal',
      drawn: true,
    },
    hotspotsCount: 0,
    direction: 'SM City Fairview Public Transport Terminal → Novaliches Bayan',
  },
};

/** At phone width, the panel on a phone's whole screen. */
export const Phone: Story = {
  args: LongContent.args,
  parameters: { phone: true },
};
