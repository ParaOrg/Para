import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { StudioTopBar } from './studio-top-bar';

/**
 * The studio's top bar with its map switch, over the map only. On a computer the left panel area
 * runs the full height beside it (a sidebar's width, 380); on a phone there is none.
 */
const meta = {
  title: 'App/Studio/StudioTopBar',
  component: StudioTopBar,
  parameters: { layout: 'fullscreen' },
  args: { value: 'playground', onChange: fn() },
} satisfies Meta<typeof StudioTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** On a computer, with the left panel open: the bar starts at the panel's right edge. */
export const BesideTheLeftPanel: Story = {
  render: (args) => (
    <div className="flex h-160 w-300">
      <div
        data-testid="left-panel"
        className="w-95 shrink-0 border-r border-border-primary bg-surface"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <StudioTopBar {...args} />
        <div className="flex-1 bg-surface-quaternary" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByTestId('left-panel').getBoundingClientRect();
    // The layout itself is the studio's (workshop.tsx); save-test checks it there. Here, the bar
    // keeps to its column and its switch shows.
    const bar = canvas.getByTestId('studio-top-bar').getBoundingClientRect();
    await expect(canvas.getByRole('radiogroup')).toBeVisible();
    await expect(bar.left).toBe(panel.right);
  },
};

/** On a phone: across the whole width, the map below it. `max-sm:` reads the viewport, not this box. */
export const OnAPhone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  render: (args) => (
    <div className="flex h-160 w-98.25 flex-col">
      <StudioTopBar {...args} />
      <div className="flex-1 bg-surface-quaternary" />
    </div>
  ),
};
