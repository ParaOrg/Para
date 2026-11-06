import { agoText } from './last-known';

interface LastKnownMarkProps {
  /** When the phone was there, in milliseconds since the epoch. */
  time: number;
  /** The clock it is read on. */
  now: number;
}

/**
 * The last known place's look: the locator's dot without its face, in grey, and a pill under it
 * saying how long ago, as Life360's "1 minute ago". The builder's for now (owner to design later,
 * .scratch/contribute-apk/README.md).
 */
export function LastKnownMark({ time, now }: LastKnownMarkProps) {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-1 font-sn-pro">
      <span className="rounded-full bg-surface p-1 shadow-locator-dot-shadow">
        <span className="block size-4 rounded-full bg-content-disabled" />
      </span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs/4 font-semibold whitespace-nowrap text-content-tertiary shadow-locator-dot-shadow">
        <span className="sr-only">Last known location, </span>
        {agoText(time, now)}
      </span>
    </div>
  );
}
