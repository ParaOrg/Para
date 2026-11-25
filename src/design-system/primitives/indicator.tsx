interface IndicatorProps {
  /** How many: a whole number above zero. The caller hides the badge at none. */
  count: number;
}

/**
 * PalimosPoDesignSystem's Indicator (4718:3920): a count on a control, a 20-across circle of
 * Background/surface-inverse with the number in Content/inverse, text-xs/medium. Drawn for the
 * eyes only: the control it sits on says the same in its name.
 */
export function Indicator({ count }: IndicatorProps) {
  return (
    <span
      aria-hidden
      className="pointer-events-none inline-flex size-5 items-center justify-center rounded-full bg-surface-inverse font-sn-pro text-xs/4 font-medium text-content-inverse"
    >
      {count}
    </span>
  );
}
