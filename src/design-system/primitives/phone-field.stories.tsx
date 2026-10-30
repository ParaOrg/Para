import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PhoneField } from './phone-field';

/** Keeps the field's value, so a number can be typed through. */
function Controlled(props: ComponentProps<typeof PhoneField>) {
  const [value, setValue] = useState(props.value);
  return <PhoneField {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

/** PalimosPoDesignSystem's PhoneField (Figma 4461:2762): the flag and +63, then the number. */
const meta = {
  title: 'DesignSystem/Primitives/PhoneField',
  component: PhoneField,
  render: (args) => <Controlled {...args} />,
  args: { label: 'Phone Number', value: '', onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-98 bg-surface p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhoneField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As Figma draws it: the placeholder 98X XXX XXXX. */
export const Empty: Story = {};

/** A number typed in. */
export const Filled: Story = { args: { value: '917 123 4567' } };

/** Focused: the number box takes Active's border. The field reads with +63 as its description. */
export const Focused: Story = {
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Phone Number');
    await userEvent.click(field);
    await expect(field).toHaveFocus();
    await expect(field).toHaveAccessibleDescription('+63');
  },
};

/** InputField's error look on both boxes, read out with the field. */
export const WithError: Story = {
  args: { value: '917 123', error: 'Enter a mobile number like 917 123 4567.' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Phone Number');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('+63 Enter a mobile number like 917 123 4567.');
  },
};

/** An error with focus: the number box takes Active's border, the message stays. */
export const WithErrorFocused: Story = {
  args: { value: '917 123', error: 'Enter a mobile number like 917 123 4567.' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Phone Number'));
  },
};

/** Disabled with an error: the error is neither shown nor read, +63 still is. */
export const DisabledWithError: Story = {
  args: { value: '917 123', disabled: true, error: 'Enter a mobile number like 917 123 4567.' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Phone Number');
    await expect(field).not.toHaveAttribute('aria-invalid');
    await expect(field).toHaveAccessibleDescription('+63');
  },
};

/** InputField's disabled look on both boxes. */
export const Disabled: Story = { args: { value: '917 123 4567', disabled: true } };

/** A long label wraps above the boxes; the number box shrinks on a narrow phone. */
export const LongContent: Story = {
  args: { label: 'Phone Number (we only use it if we need to reach you about a ride)' },
  decorators: [
    (Story) => (
      <div className="w-80 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
};
