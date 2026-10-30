import type { ComponentPropsWithoutRef } from 'react';

/**
 * PalimosPoDesignSystem's Switch, from the Figma set (node 4461:5621): a
 * rounded track holding a square knob, both outlined in border-width/0-6.
 * Its Property 1 is `state`: Rest is off, the knob at the start of a grey
 * track; On is the brand track with the knob at its end; Error is a refused
 * switch, a red fill up to a knob that carries the warning mark.
 *
 * Only On reads as checked: Rest and Error are both off. Error is also
 * aria-invalid, so a screen reader hears the refusal; how to fix it is the
 * screen's to say (its "Tap to fix", via aria-describedby). No disabled or
 * focus look is designed: disabled wears opacity/60 as Button does, and the
 * browser's own focus ring stands, as on Button, until the owner draws one.
 */

export type SwitchState = 'rest' | 'on' | 'error';

type Props = Omit<
  ComponentPropsWithoutRef<'button'>,
  | 'children'
  | 'className'
  | 'style'
  | 'dangerouslySetInnerHTML'
  | 'type'
  | 'role'
  | 'aria-checked'
  | 'aria-invalid'
  | 'aria-label'
  | 'aria-labelledby'
> & {
  state: SwitchState;
} & (
    | {
        /** Not in the Figma set: what a screen reader names the switch, when no words beside it do. */
        label: string;
        labelledBy?: never;
      }
    | {
        /** The id of the words beside the switch that name it (a row's title). */
        labelledBy: string;
        label?: never;
      }
  );

const TRACK = {
  rest: 'bg-surface-quaternary',
  on: 'bg-brand-surface',
  error: 'bg-surface-quaternary',
} satisfies Record<SwitchState, string>;

const TRACK_BORDER = {
  rest: 'border-border-secondary',
  on: 'border-brand-border',
  error: 'border-border-secondary',
} satisfies Record<SwitchState, string>;

const KNOB_BORDER = {
  rest: 'border-border-secondary',
  on: 'border-brand-border',
  error: 'border-card-red-surface',
} satisfies Record<SwitchState, string>;

// The track is 50px and the knob 24: On ends flush with the track's end (26px
// along); Error stops where the 37px red fill ends (13px along).
const KNOB_PLACE = {
  rest: 'translate-x-0',
  on: 'translate-x-6.5',
  error: 'translate-x-3.25',
} satisfies Record<SwitchState, string>;

export function Switch({ state, label, labelledBy, ...rest }: Props) {
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={state === 'on'}
      aria-invalid={state === 'error'}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={'relative h-6 w-12.5 shrink-0 rounded-md disabled:opacity-60 ' + TRACK[state]}
    >
      {/* The track's outline is drawn over it, not as its border, so the knob and the red fill
          can sit on the outline as the set draws them. */}
      <span
        aria-hidden
        className={'absolute inset-0 rounded-md border-0-6 ' + TRACK_BORDER[state]}
      />
      {state === 'error' && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-9.25 rounded-md border-0-6 border-card-red-border-primary bg-card-red-surface"
        />
      )}
      <span
        aria-hidden
        className={
          'absolute top-0 left-0 flex size-6 items-center justify-center rounded-md border-0-6 bg-surface ' +
          'transition-transform duration-quick ease-move motion-reduce:transition-none ' +
          KNOB_BORDER[state] +
          ' ' +
          KNOB_PLACE[state]
        }
      >
        {state === 'error' && <AlertIcon />}
      </span>
    </button>
  );
}

/** alert: the set's warning mark (4461:5613), Figma's own path, 20 square, in Card/red/surface. */
function AlertIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className="size-5 text-card-red-surface"
    >
      <path d="M10 2.80956C10.9098 2.80956 11.5901 3.34691 12.1987 4.09544C12.8028 4.83842 13.4506 5.93457 14.2655 7.30837L15.6641 9.66523C16.5129 11.0962 17.1889 12.2333 17.5642 13.1505C17.9413 14.0723 18.091 14.9526 17.6309 15.7648C17.1702 16.578 16.3382 16.9 15.3549 17.0465C14.377 17.1921 13.0572 17.1904 11.3979 17.1904H8.60206C6.94285 17.1904 5.62296 17.192 4.64512 17.0465C3.66183 16.9 2.82976 16.578 2.36912 15.7648C1.90898 14.9526 2.05865 14.0723 2.43579 13.1505C2.81107 12.2333 3.4878 11.0962 4.33659 9.66523L5.73453 7.30837C6.54939 5.93457 7.19723 4.83842 7.80131 4.09544C8.40995 3.34692 9.09023 2.80956 10 2.80956ZM10 4.11743C9.68473 4.11743 9.33924 4.27621 8.81554 4.92031C8.28722 5.57012 7.69607 6.56404 6.85871 7.97578L5.46076 10.3326C4.58952 11.8015 3.97563 12.8394 3.64578 13.6456C3.31786 14.447 3.34739 14.8386 3.50676 15.1201C3.66581 15.4006 3.98464 15.6265 4.83733 15.7535C5.69586 15.8813 6.89838 15.8826 8.60206 15.8826H11.3979C13.1016 15.8826 14.3041 15.8813 15.1627 15.7535C16.0156 15.6264 16.3342 15.4008 16.4932 15.1201C16.6526 14.8386 16.6821 14.447 16.3542 13.6456C16.0244 12.8394 15.4105 11.8015 14.5392 10.3326L13.1413 7.97578C12.3039 6.56404 11.7128 5.57012 11.1845 4.92031C10.6608 4.27621 10.3153 4.11743 10 4.11743Z" />
      <path d="M9.34607 10.7263V7.82117C9.34607 7.46016 9.639 7.16723 10 7.16723C10.361 7.16723 10.6539 7.46016 10.6539 7.82117V10.7263C10.6539 11.0873 10.361 11.3802 10 11.3802C9.639 11.3802 9.34607 11.0873 9.34607 10.7263Z" />
      <path d="M10.0851 12.6186C10.5064 12.6612 10.8355 13.0172 10.8355 13.4498C10.8355 13.9111 10.4613 14.2853 10 14.2853C9.56742 14.2853 9.21138 13.9563 9.16875 13.5349L9.1645 13.4498L9.16875 13.3647C9.21138 12.9434 9.56742 12.6143 10 12.6143L10.0851 12.6186Z" />
    </svg>
  );
}
