import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import { Switch } from '@/design-system/primitives/switch';
import { cn } from '@/shared/utils/cn';

import { LocationIcon, NotificationIcon } from './permission-icons';
import type { PermissionRow, PermissionRowView } from './permission-rows';
import { useFocusHeading } from '../common/use-focus-heading';

const ROW_TEXT = {
  notification: {
    icon: <NotificationIcon />,
    title: 'Notification',
    line: 'Shows a notice while you record, so you know it’s on.',
  },
  location: {
    icon: <LocationIcon />,
    title: 'Location',
    line: 'Draws your route as you ride, only between Start and Stop.',
  },
} satisfies Record<PermissionRow, { icon: ReactNode; title: string; line: string }>;

interface PermissionsScreenProps {
  /** Null while the phone is first checked: the screen stays blank rather than flash the page. */
  rows: PermissionRowView[] | null;
  canContinue: boolean;
  problem: string | null;
  onSwitch: (row: PermissionRow) => void;
  onContinue: () => void;
}

/**
 * "Para needs some permissions" (Figma 4461:5693, 4461:5818, 4461:5520, 4461:5770): a row per
 * permission, its switch on once Android grants it, red with "Tap to fix" once refused. Continue
 * shows once every row has an answer and location is granted.
 */
export function PermissionsScreen({
  rows,
  canContinue,
  problem,
  onSwitch,
  onContinue,
}: PermissionsScreenProps) {
  if (!rows) {
    return (
      <div className="absolute inset-0 z-40 bg-surface">
        <p role="status" className="sr-only">
          Checking the phone’s permissions…
        </p>
      </div>
    );
  }
  return (
    <PermissionsList
      rows={rows}
      canContinue={canContinue}
      problem={problem}
      onSwitch={onSwitch}
      onContinue={onContinue}
    />
  );
}

interface PermissionsListProps extends Omit<PermissionsScreenProps, 'rows'> {
  rows: PermissionRowView[];
}

// Its own component so the heading takes focus when the rows arrive, not on the blank screen.
function PermissionsList({
  rows,
  canContinue,
  problem,
  onSwitch,
  onContinue,
}: PermissionsListProps) {
  const headingRef = useFocusHeading();
  return (
    <section
      aria-labelledby="permissions-heading"
      className="absolute inset-0 z-40 flex flex-col items-center gap-12 overflow-y-auto bg-surface pt-39.5 pb-[max(1rem,env(safe-area-inset-bottom))] font-sn-pro text-content-primary"
    >
      <h1
        id="permissions-heading"
        ref={headingRef}
        tabIndex={-1}
        className="w-65.25 text-center text-3xl font-bold focus:outline-none"
      >
        Para needs some permissions
      </h1>
      <ul className="flex w-full flex-col gap-6 px-4">
        {rows.map(({ row, state }) => {
          const { icon, title, line } = ROW_TEXT[row];
          return (
            <li key={row} className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span aria-hidden className="size-8 shrink-0 *:size-full">
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p id={`permission-${row}-title`} className="text-lg font-semibold">
                    {title}
                  </p>
                  <p
                    id={`permission-${row}-line`}
                    className={cn(
                      'text-xs',
                      state === 'error' ? 'text-content-error' : 'text-content-tertiary',
                    )}
                  >
                    {state === 'error' ? 'Tap to fix' : line}
                  </p>
                </div>
              </div>
              <Switch
                state={state}
                labelledBy={`permission-${row}-title`}
                aria-describedby={`permission-${row}-line`}
                aria-readonly={state === 'on'}
                onClick={() => onSwitch(row)}
              />
            </li>
          );
        })}
      </ul>
      {(problem || canContinue) && (
        <div className="flex w-full flex-col gap-2 px-4">
          {problem && (
            <p role="alert" className="text-sm text-content-error">
              {problem}
            </p>
          )}
          {canContinue && <Button variant="primary" label="Continue" onClick={onContinue} />}
        </div>
      )}
    </section>
  );
}
