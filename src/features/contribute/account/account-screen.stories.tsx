import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AccountScreen } from './account-screen';
import type { VehicleRides } from './vehicle-grid';

/** The frame's counts: no UV Express or ferry ride. */
const FRAME_RIDES: VehicleRides = {
  jeep: 5,
  eJeep: 2,
  uvExpress: 0,
  bus: 12,
  train: 2,
  ferry: 0,
};

const meta = {
  title: 'Features/Contribute/AccountScreen',
  component: AccountScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    name: 'Rovic',
    email: 'rovic@example.com',
    stats: {
      kind: 'shown',
      numbers: {
        recordings: 6,
        seconds: 62 * 3600,
        distanceM: 421_000,
        walkM: 168_400,
        farePhpTotal: 129,
        fareRecordings: 4,
        ridesByVehicle: FRAME_RIDES,
      },
    },
    unsentCount: 0,
    isLoggingOut: false,
    error: null,
    onOpenHistory: fn(),
    onOpenSettings: fn(),
    onLogout: fn(),
    onLogoutAsked: fn(),
    onOpenRecord: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's Account (4496:10455). */
export const Default: Story = {};

/** The name and the numbers still coming. */
export const Loading: Story = { args: { name: null, stats: { kind: 'loading' } } };

/** The project has no stats to give yet: the section is left out. */
export const NoStats: Story = { args: { stats: null } };

export const LongName: Story = {
  args: {
    name: 'Juan Protacio Emmanuel dela Cruz y Santos de la Rosa del Rosario',
    email: 'juan.dela.cruz.the.third.of.quezon.city@example-long-domain.com',
  },
};

/** Logout asks first (4521:3500), the page frosted over, focus on Cancel. */
export const LogoutAsked: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Logout' }));
    await expect(
      canvas.getByRole('alertdialog', { name: 'Are you sure you want to logout?' }),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  },
};

/** With recordings not sent yet, it says they stay behind on this phone. */
export const LogoutWithUnsent: Story = {
  args: { unsentCount: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Logout' }));
    await expect(canvas.getByText(/2 recordings not sent yet/)).toBeVisible();
  },
};

/** Logout failed: the line shows in the open question, and stays on the page after Cancel. */
export const LogoutFailed: Story = {
  args: { error: 'No signal. Try again when you’re online.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Logout' }));
    await expect(within(canvas.getByRole('alertdialog')).getByText(/No signal/)).toBeVisible();
  },
};

/** A short, narrow phone: the page scrolls inside the screen, and the grid keeps three across. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
