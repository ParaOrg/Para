import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TextAreaField } from './text-area-field';

/** Keeps the field's value, as a form would. */
function Controlled(props: ComponentProps<typeof TextAreaField>) {
  const [value, setValue] = useState(props.value);
  return <TextAreaField {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

/** The InputField (Figma 4295:20567) for several lines: its look, the box as tall as its rows. */
const meta = {
  title: 'DesignSystem/Primitives/TextAreaField',
  component: TextAreaField,
  render: (args) => <Controlled {...args} />,
  args: { label: 'Description', value: 'Crowded at rush hour.', onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-86 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextAreaField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Property 1=Default, three rows. */
export const Default: Story = {};

/** Property 1=Active: focused, the Brand/surface border. */
export const Active: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Description'));
  },
};

/** Empty, its placeholder in Content/disabled. */
export const Placeholder: Story = {
  args: { value: '', placeholder: 'Anything the next rider should know' },
};

/** Property 1=Variant3: an error, read out with the field. */
export const WithError: Story = {
  args: { error: 'Keep it under 1000 characters.' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Description');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Keep it under 1000 characters.');
  },
};

/** An error with focus: the box takes Active's border, the message stays. */
export const WithErrorFocused: Story = {
  args: { error: 'Keep it under 1000 characters.' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Description'));
  },
};

/** Property 1=Disabled. */
export const Disabled: Story = { args: { disabled: true } };

/** Two rows, as the studio's hide reason uses. */
export const TwoRows: Story = { args: { label: 'Why hide it? (optional)', value: '', rows: 2 } };

/** More text than rows: it scrolls inside the box. */
export const LongContent: Story = {
  args: {
    value:
      'Crowded at rush hour. The jeep waits at the corner of Regalado Avenue until it is full, then goes straight down Quirino Highway without stopping at SM Fairview unless someone asks. Fare was 13 pesos to the terminal, 15 if you ride past it to the market.',
  },
};
