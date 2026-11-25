import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DestinationBar } from './destination-bar';

/**
 * Figma's DestinationBar (4820:33754): one of the other routes out of where a trip starts, in the
 * list under its ends, on the sheet's surface, 12 in from the list's edge as the trip insets it.
 */
const meta = {
  title: 'Features/Routes/DestinationBar',
  component: DestinationBar,
  args: { destination: 'Philcoa', additionalNotes: 'via Almar', variant: 'top', onClick: fn() },
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface px-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DestinationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Variants=Top: a row with more below it, its line running on, a hairline under it. A tap opens it. */
export const Top: Story = {
  play: async ({ args, canvasElement }) => {
    const row = within(canvasElement).getByRole('button', { name: /^Philcoa/ });
    await userEvent.click(row);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** Variants=End: the last row, its line ending at its arrow, no hairline. */
export const End: Story = {
  args: { destination: 'Quiapo', additionalNotes: null, variant: 'end' },
};

/** No via: the place alone, 40 tall. */
export const NoNotes: Story = { args: { destination: 'Novaliches', additionalNotes: null } };

/** Long places and notes wrap; the arrow stays by the first line. */
export const LongNames: Story = {
  args: {
    destination: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal',
    additionalNotes: 'via Zabarte, Quirino Highway and Regalado Avenue',
  },
};

/**
 * Pressed, forced: Figma draws no pressed or hover state, so bg/fill/fill-secondary stands in
 * until the owner draws one.
 */
export const Pressed: Story = { args: { className: 'bg-bg-fill-secondary' } };

/** At a phone's width: 320 wide, a long place wrapping inside it. */
export const Phone: Story = {
  args: LongNames.args,
  decorators: [
    (Story) => (
      <div className="@container w-80 bg-bg-surface px-3">
        <Story />
      </div>
    ),
  ],
};
