import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PasswordField } from './password-field';

/** Keeps the field's value, as a form would. */
function Controlled(props: ComponentProps<typeof PasswordField>) {
  const [value, setValue] = useState(props.value);
  return <PasswordField {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

/** The InputField (Figma 4295:20567) for a password, with its eye. */
const meta = {
  title: 'DesignSystem/Primitives/PasswordField',
  component: PasswordField,
  render: (args) => <Controlled {...args} />,
  args: { label: 'Password', value: 'correct horse', onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-86 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hidden, eye-open: a press shows it, eye-closed; a second hides it again. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByLabelText('Password');
    await expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(canvas.getByRole('button', { name: 'Show password' }));
    await expect(field).toHaveAttribute('type', 'text');
    await userEvent.click(canvas.getByRole('button', { name: 'Hide password' }));
    await expect(field).toHaveAttribute('type', 'password');
  },
};

/** Property 1=Active: focused. */
export const Active: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Password'));
  },
};

/** Empty, with its placeholder. */
export const Placeholder: Story = { args: { value: '', placeholder: 'Password' } };

/** Property 1=Variant3. */
export const WithError: Story = { args: { error: 'Wrong email or password.' } };

/** Property 1=Disabled: the eye cannot be pressed. */
export const Disabled: Story = { args: { disabled: true } };
