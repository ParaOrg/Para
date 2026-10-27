import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TextField } from './text-field';

/** Keeps the field's value, so the clear can be pressed through. */
function Controlled(props: ComponentProps<typeof TextField>) {
  const [value, setValue] = useState(props.value);
  return (
    <TextField
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClear={props.onClear && (() => setValue(''))}
    />
  );
}

/** PalimosPoDesignSystem's InputField (Figma 4295:20567), the general field. */
const meta = {
  title: 'DesignSystem/Primitives/TextField',
  component: TextField,
  render: (args) => <Controlled {...args} />,
  args: { label: 'Email', value: 'example@gmail.com', onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-86 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Property 1=Default, with no icon. */
export const Default: Story = { args: { onClear: undefined } };

/** With Figma's Close: a press empties the field and keeps the caret there. */
export const Clearable: Story = {
  args: { onClear: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(canvas.getByLabelText('Email')).toHaveValue('');
    await expect(canvas.getByLabelText('Email')).toHaveFocus();
    await expect(canvas.queryByRole('button', { name: 'Clear' })).toBeNull();
  },
};

/** Property 1=Active: focused, the Brand/surface border. */
export const Active: Story = {
  args: { onClear: fn() },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Email'));
  },
};

/** Empty, its placeholder in Content/disabled. */
export const Placeholder: Story = { args: { value: '', placeholder: 'you@example.com' } };

/** Property 1=Variant3: an error, read out with the field. */
export const WithError: Story = {
  args: { error: 'Enter an email address.', onClear: fn() },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Email');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Enter an email address.');
  },
};

/** An error with focus: the box takes Active's border, the message stays. */
export const WithErrorFocused: Story = {
  args: { error: 'Enter an email address.', onClear: fn() },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Email'));
  },
};

/** The caller's own description is read before the error. */
export const WithDescription: Story = {
  args: { error: 'Enter an email address.', 'aria-describedby': 'email-note' },
  render: (args) => (
    <>
      <Controlled {...args} />
      <p id="email-note" className="mt-1 text-xs text-content-disabled">
        We only use it to sign you in.
      </p>
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Email')).toHaveAccessibleDescription(
      'We only use it to sign you in. Enter an email address.',
    );
  },
};

/** Disabled with an error: the error is neither shown nor read. */
export const DisabledWithError: Story = {
  args: { disabled: true, error: 'Enter an email address.' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Email');
    await expect(field).not.toHaveAttribute('aria-invalid');
    await expect(field).not.toHaveAttribute('aria-describedby');
  },
};

/** Property 1=Disabled: no clear. */
export const Disabled: Story = { args: { disabled: true, onClear: fn() } };

/** A long value scrolls in the box; a long label wraps above it. */
export const LongContent: Story = {
  args: {
    label: 'Ground name (as written on the ground, the way the sign spells it)',
    value: 'SM City Fairview Jeepney Terminal, Quirino Highway corner Regalado Avenue',
    onClear: fn(),
  },
};
