import { useId } from 'react';

/** One row of Transit line information: its name and what it says. */
export interface TransitLineFact {
  label: string;
  value: string;
}

interface TransitLineInfoProps {
  /** In order: Origin, Destination, Via, Regular fare, Transport mode, Distance, Stops. */
  facts: readonly TransitLineFact[];
}

/**
 * The route line detail's Transit line information (4905:28373): a Bold 16/24 heading over the
 * direction's facts, each a 140-wide name in Medium and its value in Regular, 14/20 in
 * Content/quaternary, 10 apart.
 */
export function TransitLineInfo({ facts }: TransitLineInfoProps) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="flex w-full flex-col gap-2.5">
      <h3 id={heading} className="text-base-lower/6 font-bold text-text-primary">
        Transit line information
      </h3>
      <dl className="flex w-full flex-col gap-2.5 text-sm/5 text-content-quaternary">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex w-full">
            <dt className="w-35 shrink-0 font-medium">{label}</dt>
            <dd className="min-w-0 flex-1">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
