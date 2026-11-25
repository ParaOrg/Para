import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { OverviewButton } from './overview-button';

/**
 * The Overview button over a phone's map, a card's sheet up from the bottom: it stands 12 over the
 * sheet, beside the map's ⓘ where there is one. The sheet's top is set here as BottomSheet sets it
 * (`--dock-y`), at 60% of the frame.
 */
const meta = {
  title: 'Features/Routes/OverviewButton',
  component: OverviewButton,
  args: { isShown: true, go: fn(), isBesideCredits: true, map: null },
  decorators: [
    // A story that draws its own frame (parameters.ownFrame) is left unwrapped.
    (Story, { parameters }) =>
      parameters.ownFrame === true ? (
        <Story />
      ) : (
        <div
          data-dock-host
          className="@container relative h-160 w-98.25 overflow-hidden bg-bg-surface-secondary [--dock-y:60%]"
        >
          <div className="absolute inset-x-0 top-[60%] bottom-0 rounded-t-3xl bg-bg-surface" />
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof OverviewButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown beside the ⓘ: a real button named "Overview"; pressed, it calls `go`. */
export const Shown: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Overview' });
    await expect(button).toBeVisible();
    await userEvent.click(button);
    await expect(args.go).toHaveBeenCalled();
  },
};

/** No ⓘ beside it (the credits are elsewhere): it takes the ⓘ's place at the left. */
export const WithoutCredits: Story = { args: { isBesideCredits: false } };

/** At the overview: hidden, and out of the keyboard's way. */
export const Hidden: Story = {
  args: { isShown: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Overview' })).toBeNull();
  },
};

/**
 * A desktop's map (64rem and over), the card docked full height on the left, 24rem wide: the button
 * stands in locate-me's row, at the map's bottom, just right of the card. Not following the sheet.
 */
export const Desktop: Story = {
  parameters: { ownFrame: true },
  decorators: [
    (Story) => (
      <div
        data-dock-host
        className="@container relative h-160 w-275 overflow-hidden bg-bg-surface-secondary"
      >
        <div className="absolute inset-y-0 left-0 w-96 bg-bg-surface" />
        <Story />
      </div>
    ),
  ],
};
