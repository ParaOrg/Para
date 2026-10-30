import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NotEditor } from './not-editor';

const meta = {
  title: 'Features/Studio/NotEditor',
  component: NotEditor,
  args: { onSignInAgain: fn() },
  // Like SignIn's, the panel dims what it sits over: a map-sized box.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? 'relative h-160 w-[390px] bg-surface-quaternary'
            : 'relative h-160 bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NotEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Focus starts on the heading; the contributor page is a link, signing in again a button. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { name: "This account isn't an editor" }),
    ).toHaveFocus();
    await expect(canvas.getByRole('link', { name: 'Open the contributor page' })).toHaveAttribute(
      'href',
      '/contribute/',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in with another account' }));
    await expect(args.onSignInAgain).toHaveBeenCalled();
  },
};

export const Phone: Story = { parameters: { phone: true } };
