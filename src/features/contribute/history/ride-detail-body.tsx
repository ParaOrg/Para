import type { CardStatus } from './card-status';
import { CardStatusLine } from './card-status-line';
import type { RideDetailRow } from './ride-details';

interface RideDetailBodyProps {
  /** Its upload's line, as its History card shows it. */
  status: CardStatus;
  rows: readonly RideDetailRow[];
  description: string;
  /** The ride in words, so the retry button says which one it sends. */
  fullName: string;
  onRetry: () => void;
}

/**
 * The ride sheet's body, under its name (Figma 4560:12422): the upload's line, Commute
 * Information and the Description, read only. The Description is left out when none was written.
 */
export function RideDetailBody({
  status,
  rows,
  description,
  fullName,
  onRetry,
}: RideDetailBodyProps) {
  return (
    <div className="flex flex-col gap-8 px-5 pb-8">
      <div className="flex">
        <CardStatusLine status={status} size="sheet" fullName={fullName} onRetry={onRetry} />
      </div>
      <section aria-labelledby="ride-commute-heading" className="flex flex-col gap-2">
        <h2 id="ride-commute-heading" className="text-xl/7 font-semibold">
          Commute Information
        </h2>
        <dl className="flex flex-col gap-2 text-sm/5 text-content-quaternary">
          {rows.map((row) => (
            <div key={row.label} className="flex">
              <dt className="w-35 shrink-0 font-medium">{row.label}</dt>
              <dd className="min-w-0 flex-1 break-words">
                {row.spoken ? (
                  <>
                    <span aria-hidden>{row.value}</span>
                    <span className="sr-only">{row.spoken}</span>
                  </>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {description.trim() !== '' && (
        <section aria-labelledby="ride-description-heading" className="flex flex-col gap-2">
          <h2 id="ride-description-heading" className="text-xl/7 font-semibold">
            Description
          </h2>
          <p className="text-sm/5 break-words whitespace-pre-line text-content-tertiary">
            {description}
          </p>
        </section>
      )}
    </div>
  );
}
