import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AccountPill } from './account-pill';

const meta = {
  title: 'Features/Studio/AccountPill',
  component: AccountPill,
  // The pill floats at the map's top left. The `phone` parameter gives it a
  // handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? 'relative h-40 w-[390px] bg-surface-quaternary'
            : 'relative h-40 bg-surface-quaternary'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    routes: 12,
    hotspots: 31,
    email: 'owner@example.com',
    onSignIn: fn(),
    onPassword: fn(),
    onSignOut: fn(),
  },
} satisfies Meta<typeof AccountPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed in, with routes and hotspots saved: the counts, who, Password and Sign out. */
export const SignedIn: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Password' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await expect(args.onPassword).toHaveBeenCalledOnce();
    await expect(args.onSignOut).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('button', { name: 'Sign in' })).toBeNull();
  },
};

/** Signed out: the counts, and Sign in. */
export const SignedOut: Story = {
  args: { email: null },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Sign in' }));
    await expect(args.onSignIn).toHaveBeenCalledOnce();
  },
};

/** Nothing saved yet: no counts at all, only the account. */
export const NothingSaved: Story = {
  args: { routes: 0, hotspots: 0 },
};

/** Routes but no hotspots: the hotspot count drops out. */
export const NoHotspots: Story = {
  args: { routes: 3, hotspots: 0 },
};

/** One of each: the singulars. */
export const OneOfEach: Story = {
  args: { routes: 1, hotspots: 1 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/1 route · 1 hotspot/)).toBeVisible();
  },
};

/** A long address: cut to sixteen characters, so the pill never crosses the map. */
export const LongEmail: Story = {
  args: {
    routes: 1_284,
    hotspots: 3_917,
    email: 'maria.clara.delos.santos-ibarra@quezoncity.example.gov.ph',
  },
};

/**
 * On a phone the pill keeps only its buttons: the counts and the address go
 * below the `sm` breakpoint, which reads the viewport, not this box — hence
 * the phone viewport as well as the phone width.
 */
export const Phone: Story = {
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
