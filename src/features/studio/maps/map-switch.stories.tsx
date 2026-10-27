import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { MapSwitch } from './map-switch';
import type { StudioMapName } from './studio-map';

const meta = {
  title: 'Features/Studio/MapSwitch',
  component: MapSwitch,
  // The switch floats over the map at the top; the grey stands in for it.
  decorators: [
    (Story) => (
      <div className="flex h-40 justify-center bg-surface-quaternary p-4">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { value: 'playground', onChange: fn() },
} satisfies Meta<typeof MapSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Playground, where editors work: filled, with a check, and the other two left plain. */
export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radio', { name: 'Playground' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Public' })).not.toBeChecked();
  },
};

/** Tab reaches the switch on the current map; an arrow key moves to the next. */
export const WithFocus: Story = {
  args: { value: 'contributors' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'Contributors' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenCalledWith('playground');
  },
};

/**
 * A phone: `max-sm:` reads the viewport, not this box, so the phone viewport
 * is set as well as the width.
 */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

/** The longest word with the check, which on a phone stands in for its icon. */
export const PhoneContributors: Story = {
  args: { value: 'contributors' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const Contributors: Story = {
  args: { value: 'contributors' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('radio', { name: 'Contributors' })).toBeChecked();
  },
};

export const Public: Story = {
  args: { value: 'public' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('radio', { name: 'Public' })).toBeChecked();
  },
};

/** A tap on another map asks for it; the page owns which map is current. */
export const Choosing: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<StudioMapName>(args.value);
    return <MapSwitch value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Public' }));
    await expect(canvas.getByRole('radio', { name: 'Public' })).toBeChecked();
  },
};
