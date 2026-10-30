import type { Meta, StoryObj } from '@storybook/react-vite';

import { CARD_SURFACE } from './livery-card';
import { RideMark } from './ride-mark';

/**
 * Start's circled S and End's circled E on the orange card. Their ring and letter are white, so a
 * white page would hide them. `isSmall` keeps the size and changes only the spacing, the way a
 * hintuan's row places the mark.
 */
const meta = {
  title: 'Features/Routes/RideMark',
  component: RideMark,
  decorators: [
    (Story) => (
      <div className={'inline-flex p-3 ' + CARD_SURFACE.orange}>
        <Story />
      </div>
    ),
  ],
  args: { mark: 'start' },
} satisfies Meta<typeof RideMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Where the ride starts, beside an end's row. */
export const Start: Story = {};

/** Where the ride ends, beside an end's row. */
export const End: Story = { args: { mark: 'end' } };

/** A start picked at a hintuan. */
export const StartSmall: Story = { args: { isSmall: true } };

/** An end picked at a hintuan. */
export const EndSmall: Story = { args: { mark: 'end', isSmall: true } };
