import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { PermissionsScreen } from './permissions-screen';

const meta = {
  title: 'Features/Contribute/PermissionsScreen',
  component: PermissionsScreen,
  args: {
    rows: [
      { row: 'notification', state: 'rest' },
      { row: 'location', state: 'rest' },
    ],
    canContinue: false,
    problem: null,
    onSwitch: fn(),
    onContinue: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="@container relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PermissionsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First open on Android 13+: nothing answered yet, so no Continue. */
export const NothingAnswered: Story = {};

/** Notification on, location still off (4461:5520). */
export const NotificationOn: Story = {
  args: {
    rows: [
      { row: 'notification', state: 'on' },
      { row: 'location', state: 'rest' },
    ],
  },
};

/** Notification refused: red, "Tap to fix", which opens Para's page in Settings (4461:5818). */
export const NotificationRefused: Story = {
  args: {
    rows: [
      { row: 'notification', state: 'error' },
      { row: 'location', state: 'rest' },
    ],
  },
};

/** Both on, and Continue (4461:5770). */
export const BothOn: Story = {
  args: {
    rows: [
      { row: 'notification', state: 'on' },
      { row: 'location', state: 'on' },
    ],
    canContinue: true,
  },
};

/** A refused notification does not trap anyone: location is on, so Continue shows. */
export const RefusedNotificationCanContinue: Story = {
  args: {
    rows: [
      { row: 'notification', state: 'error' },
      { row: 'location', state: 'on' },
    ],
    canContinue: true,
  },
};

/** Location refused: Para cannot record without it, so no Continue until it is fixed. */
export const LocationRefused: Story = {
  args: {
    rows: [
      { row: 'notification', state: 'on' },
      { row: 'location', state: 'error' },
    ],
  },
};

/** Android 12 and older have no notification permission: Location alone (4461:5693's one row). */
export const LocationOnly: Story = { args: { rows: [{ row: 'location', state: 'rest' }] } };

/**
 * Android could not be asked: the screen's one red line above its main button. Figma draws no
 * error state; this follows the owner's call for every onboarding screen (one red line above the
 * main button, as today), in Content/error.
 */
export const Problem: Story = {
  args: { problem: 'Para could not ask Android. Tap the switch again.' },
};

/** Settings would not open from a refused row while Continue shows: the line sits above it. */
export const ProblemWithContinue: Story = {
  args: {
    rows: [
      { row: 'notification', state: 'error' },
      { row: 'location', state: 'on' },
    ],
    canContinue: true,
    problem: 'Settings would not open. Open Para in your phone’s Settings to turn it on.',
  },
};

/** The phone is being checked: blank, so the page behind does not flash. */
export const Checking: Story = { args: { rows: null } };
