import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Switch } from './switch';

const meta = {
  title: 'DesignSystem/Primitives/Switch',
  component: Switch,
  args: { state: 'rest', label: 'Notification', onClick: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rest: off, the knob at the start of the grey track. */
export const Rest: Story = {};

/** On: the brand track, the knob at its end. The only state a screen reader hears as on. */
export const On: Story = { args: { state: 'on' } };

/** Error: refused. A red fill up to the knob, which carries the warning mark; still "off". */
export const Error: Story = { args: { state: 'error' } };

/** Not designed: opacity/60, as Button's disabled, in each state. */
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch state="rest" label="Rest" disabled />
      <Switch state="on" label="On" disabled />
      <Switch state="error" label="Error" disabled />
    </div>
  ),
};

/** Focused from the keyboard: the browser's own ring, as on Button, until a focus look is drawn. */
export const Focused: Story = {
  play: async ({ canvas }) => {
    const control = canvas.getByRole('switch', { name: 'Notification' });
    control.focus();
    await expect(control).toHaveFocus();
  },
};

/**
 * A real specimen: the rows of the permissions screen (4461:5770) at phone
 * width, each switch named by its row's title and described by its line.
 */
export const RowSpecimen: Story = {
  render: () => (
    <div className="@container flex w-[393px] flex-col gap-6 bg-surface px-4 py-6 font-sn-pro">
      {[
        { id: 'a', title: 'Notification', line: 'Tap to fix', state: 'error' as const },
        {
          id: 'b',
          title: 'Location',
          line: 'Draws your route as you ride, only between Start and Stop.',
          state: 'on' as const,
        },
        {
          id: 'c',
          title: 'A long title that wraps onto a second line at phone width',
          line: 'Shows a notice while you record, so you know it’s on.',
          state: 'rest' as const,
        },
      ].map((row) => (
        <div key={row.id} className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p id={`${row.id}-title`} className="text-lg font-semibold text-content-primary">
              {row.title}
            </p>
            <p
              id={`${row.id}-line`}
              className={
                'text-xs ' +
                (row.state === 'error' ? 'text-content-error' : 'text-content-tertiary')
              }
            >
              {row.line}
            </p>
          </div>
          <Switch
            state={row.state}
            labelledBy={`${row.id}-title`}
            aria-describedby={`${row.id}-line`}
          />
        </div>
      ))}
    </div>
  ),
};
