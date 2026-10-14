import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import type { Direction } from '@/features/routes/model/routes';

import { CardActions } from './card-actions';
import { RouteFacts } from './route-facts';

/**
 * A direction as the studio opens it: Tala → SM Fairview, 6.4 km. Sample data
 * only. The fare lines are priced on today's rule, so the old minimum's grace
 * line shows only while today is inside a new rule's grace.
 */
function direction(
  route: Partial<Direction['route']> = {},
  confidence: Direction['confidence'] = 'drawn',
): Direction {
  return {
    id: 'sample-out',
    routeId: 'sample-route',
    name: 'Tala → SM Fairview',
    originTerminal: null,
    destinationTerminal: null,
    shape: null,
    reversed: false,
    confidence,
    metres: 6_400,
    route: {
      id: 'sample-route',
      signboard: null,
      longName: null,
      mode: 'jeepney',
      fareNote: null,
      headHotspotId: 'sample-tala',
      tailHotspotId: 'sample-fairview',
      via: null,
      name: 'Tala – SM Fairview',
      ...route,
    },
  };
}

const meta = {
  title: 'Features/Studio/RouteFacts',
  component: RouteFacts,
  // Under the trip card, at the card's width. The `phone` parameter puts it
  // at a handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div className={ctx.parameters.phone ? 'w-[390px] bg-surface' : 'w-[369px] bg-surface'}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { direction: direction() },
} satisfies Meta<typeof RouteFacts>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A jeepney drawn but not yet ridden: amber status, and the fare's small print. */
export const DrawnJeepney: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('drawn, not yet ridden')).toBeVisible();
    await expect(canvas.getByTestId('facts-fare')).toHaveTextContent(/Students, seniors, PWDs/);
  },
};

/** Ridden end to end: the status turns to verified. */
export const Verified: Story = {
  args: { direction: direction({}, 'verified') },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('verified by riding')).toBeVisible();
  },
};

/** With a signboard and the route's own fare note, below the rule. */
export const WithSignboardAndFareNote: Story = {
  args: {
    direction: direction({
      signboard: 'SM FAIRVIEW',
      fareNote: '₱2 more after 10 pm.',
    }),
  },
};

/** A bus: no fare rule to price it, and no note, so no Fare row at all. */
export const NoFareRule: Story = {
  args: { direction: direction({ mode: 'bus' }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('facts-fare')).toBeNull();
  },
};

/** A UV Express with only its own fare note: the Fare row holds just that. */
export const FareNoteOnly: Story = {
  args: { direction: direction({ mode: 'uv_express', fareNote: '₱45 flat, any stop.' }) },
};

/** The editor's own direction: Edit, Extend and Delete below the facts. */
export const WithActions: Story = {
  args: {
    actions: <CardActions editLabel="Edit route" onEdit={fn()} onExtend={fn()} onDelete={fn()} />,
  },
};

/** A long signboard and a long fare note: both wrap inside the card. */
export const LongContent: Story = {
  args: {
    direction: direction({
      mode: 'e_jeepney',
      signboard: 'NOVALICHES BAYAN – SM FAIRVIEW – LAGRO via QUIRINO HIGHWAY / REGALADO AVENUE',
      fareNote:
        'Drivers on this line charge ₱15 for the first 4 km at night and on Sundays, and ask ' +
        'students for their ID before giving the discount. The terminal posts the fare guide ' +
        'by the dispatcher’s booth.',
    }),
  },
};

/** At phone width, with its actions, as the studio shows it on a phone. */
export const Phone: Story = {
  args: WithActions.args,
  parameters: { phone: true },
};
