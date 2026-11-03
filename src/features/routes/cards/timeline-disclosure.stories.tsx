import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { CARD_SURFACE, CARD_TEXT, ROW_PRESSED, TIMELINE_SURFACE } from './livery-card';
import { TimelineDisclosure } from './timeline-disclosure';

/**
 * The row that folds a timeline's hintuans and opens them again, alone on the orange card in a
 * list of its own, as a trip's timeline holds it. A tap calls onToggle. The trip opens and closes
 * the fold, so here the row keeps the state it was given.
 */
const meta = {
  title: 'Features/Routes/TimelineDisclosure',
  component: TimelineDisclosure,
  decorators: [
    (Story) => (
      <ol className={'w-[369px] font-sn-pro ' + CARD_SURFACE.orange + ' ' + CARD_TEXT.orange}>
        <Story />
      </ol>
    ),
  ],
  args: {
    part: 'all',
    rail: TIMELINE_SURFACE.orange,
    pressed: ROW_PRESSED.orange,
    isOpen: false,
    connection: 'connected',
    count: 3,
    isTrain: false,
    onToggle: fn(),
  },
} satisfies Meta<typeof TimelineDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A jeep's hintuans folded. The row reads "3 more hintuans". */
export const ClosedJeep: Story = {};

/** Opened, the row reads "View less" and its chevron points up. */
export const Open: Story = { args: { isOpen: true } };

/** A train's stations folded. The row reads "3 more stations". */
export const ClosedTrain: Story = { args: { isTrain: true } };

/** The fold next to a picked ride, before its start. The rail beside it is left unfilled. */
export const NextToTheRide: Story = { args: { part: 'before', connection: 'disconnected' } };
