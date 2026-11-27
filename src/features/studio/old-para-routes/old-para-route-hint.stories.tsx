import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { OldParaRouteHint } from './old-para-route-hint';
import { at, CUBAO_FILE, NO_LINE } from './old-para-route-story-data';

const meta = {
  title: 'Features/Studio/OldParaRouteHint',
  component: OldParaRouteHint,
  decorators: [
    (Story) => (
      <div className="relative h-[28rem] w-[22rem] bg-surface-quaternary font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    start: { paraId: CUBAO_FILE.paraId, name: CUBAO_FILE.name, part: CUBAO_FILE, end: null },
    spots: [
      { kind: 'gap', at: at(-3000, -1000), metres: 60 },
      { kind: 'stray', at: at(-6000, -2500), metres: 45 },
    ],
    onLookAt: fn(),
    onForget: fn(),
  },
} satisfies Meta<typeof OldParaRouteHint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** From a line: the places to check against it, each taking the camera there. */
export const FromLine: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('2 places to check')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /60 m gap in the old route’s line/ }));
    await expect(args.onLookAt).toHaveBeenCalledWith(at(-3000, -1000));
  },
};

/** Nothing to check yet. */
export const NothingToCheck: Story = {
  args: { spots: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Nothing to check against the old route’s line yet.'),
    ).toBeVisible();
  },
};

/** No line: drawn by hand, with a way to the end to draw to. */
export const NoLine: Story = {
  args: {
    start: { paraId: NO_LINE.paraId, name: NO_LINE.name, part: null, end: NO_LINE.end },
    spots: [],
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/The old app has no line for it/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Look at its end' }));
    await expect(args.onLookAt).toHaveBeenCalledWith(NO_LINE.end);
    await userEvent.click(canvas.getByRole('button', { name: 'Not from old Para' }));
    await expect(args.onForget).toHaveBeenCalled();
  },
};
