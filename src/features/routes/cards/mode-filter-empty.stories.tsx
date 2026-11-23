import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ModeFilterEmpty } from './mode-filter-empty';

const meta = {
  title: 'Features/Routes/ModeFilterEmpty',
  component: ModeFilterEmpty,
  args: { filter: 'jeep', onShowAll: fn() },
  decorators: [
    (Story) => (
      <div className="w-98 bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModeFilterEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Jeep filter with no jeeps under the tap; the button goes back to All. */
export const NoJeeps: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No Jeep routes here')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Show all routes' }));
    await expect(args.onShowAll).toHaveBeenCalled();
  },
};

/** The longest option's words. */
export const NoEJeeps: Story = { args: { filter: 'ejeep' } };
