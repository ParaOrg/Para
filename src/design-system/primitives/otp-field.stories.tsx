import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { OtpField } from './otp-field';

/** Keeps the field's value, so digits can be typed and pasted through. */
function Controlled(props: ComponentProps<typeof OtpField>) {
  const [value, setValue] = useState(props.value);
  return (
    <OtpField
      {...props}
      value={value}
      onChange={(code) => {
        setValue(code);
        props.onChange(code);
      }}
    />
  );
}

/** PalimosPoDesignSystem's OTPFIeld (Figma 4461:5363): six boxes, a dash after the third. */
const meta = {
  title: 'DesignSystem/Primitives/OtpField',
  component: OtpField,
  render: (args) => <Controlled {...args} />,
  args: { label: 'Verification code', value: '', onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-98 bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OtpField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every box Blank. */
export const Empty: Story = {};

/** All six filled, every box Rest. */
export const Filled: Story = { args: { value: '888888' } };

/** Focused part-way: the box the next digit goes in is Active. */
export const Focused: Story = {
  args: { value: '123' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Verification code'));
  },
};

/** Focused and full: the last box stays Active, as Figma draws it. */
export const FocusedFull: Story = {
  args: { value: '888888' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Verification code'));
  },
};

/** Typing keeps digits only and stops at six. */
export const TypesDigitsOnly: Story = {
  play: async ({ args, canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await userEvent.type(field, '12a3-45678');
    await expect(field).toHaveValue('123456');
    await expect(args.onChange).toHaveBeenLastCalledWith('123456');
  },
};

/** A pasted code fills every box, whatever else the text held. */
export const Pasted: Story = {
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await userEvent.click(field);
    await userEvent.paste('Your code: 482 913');
    await expect(field).toHaveValue('482913');
  },
};

/** A paste over a code already there, wherever the caret is, replaces it whole. */
export const PastedOverCode: Story = {
  args: { value: '123456' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await userEvent.click(field);
    await userEvent.paste('Your code: 482 913');
    await expect(field).toHaveValue('482913');
  },
};

/** A paste into a part-typed code replaces it too. */
export const PastedOverPart: Story = {
  args: { value: '12' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await userEvent.click(field);
    await userEvent.paste('482913');
    await expect(field).toHaveValue('482913');
  },
};

/** The caret stays at the end, so a digit typed after a tap goes in the Active box. */
export const CaretAtEnd: Story = {
  args: { value: '123' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await userEvent.click(field);
    if (field instanceof HTMLInputElement) field.setSelectionRange(0, 0);
    await userEvent.keyboard('4');
    await expect(field).toHaveValue('1234');
  },
};

/** InputField's error look, read out with the field. */
export const WithError: Story = {
  args: { value: '123456', error: 'That code is not right. Check it and try again.' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(
      'That code is not right. Check it and try again.',
    );
  },
};

/** An error with focus: the Active box takes Active's border and keeps the error fill. */
export const WithErrorFocused: Story = {
  args: { value: '123', error: 'That code is not right. Check it and try again.' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText('Verification code'));
  },
};

/** Disabled with an error: the error is neither shown nor read. */
export const DisabledWithError: Story = {
  args: { value: '123', disabled: true, error: 'That code is not right.' },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Verification code');
    await expect(field).not.toHaveAttribute('aria-invalid');
    await expect(field).not.toHaveAttribute('aria-describedby');
  },
};

/** Refused once more each press: the boxes shake once, side to side. */
function Refusals(props: ComponentProps<typeof OtpField>) {
  const [refusals, setRefusals] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <Controlled
        {...props}
        error={refusals > 0 ? props.error : undefined}
        shakeKey={refusals > 0 ? refusals : undefined}
      />
      <button type="button" onClick={() => setRefusals((count) => count + 1)}>
        Refuse
      </button>
    </div>
  );
}

/**
 * A refused code: a new shakeKey shakes the boxes once and they go red. With reduced motion asked
 * for, they only go red.
 */
export const Shake: Story = {
  args: { value: '123456', error: 'That code is wrong or has expired.' },
  render: (args) => <Refusals {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByLabelText('Verification code');
    const boxes = field.previousElementSibling;
    await expect(boxes?.getAnimations()).toHaveLength(0);
    await userEvent.click(canvas.getByRole('button', { name: 'Refuse' }));
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shaking = field.previousElementSibling;
    await expect(shaking?.getAnimations()).toHaveLength(isReduced ? 0 : 1);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  },
};

/** InputField's disabled look: nothing can be typed. */
export const Disabled: Story = { args: { value: '123', disabled: true } };

/** On a narrow phone the boxes shrink together. */
export const Phone: Story = {
  args: { value: '1234' },
  decorators: [
    (Story) => (
      <div className="w-80 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
};
