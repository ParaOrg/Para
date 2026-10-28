import { Button } from '@/design-system/primitives/button';

import { useFocusHeading } from '../use-focus-heading';
import type { NativePermission } from './native-permissions';
import { canRecordWithout, PERMISSION_REASONS } from './permission-steps';

interface RefusedPanelProps {
  permission: NativePermission;
  onOpenSettings: () => void;
  /** Carries on to Start without the permission; only offered when recording still works. */
  onRecordAnyway: () => void;
  onClose: () => void;
}

/** A permission was refused: what still works, and where to change it. */
export function RefusedPanel({
  permission,
  onOpenSettings,
  onRecordAnyway,
  onClose,
}: RefusedPanelProps) {
  const headingRef = useFocusHeading();
  const canRecord = canRecordWithout(permission);
  return (
    <section
      aria-labelledby="refused-heading"
      className="flex flex-col gap-3 bg-surface p-4 font-sn-pro text-content-primary"
    >
      <h1
        id="refused-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-extrabold focus:outline-none"
      >
        {PERMISSION_REASONS[permission].refusedTitle}
      </h1>
      <p className="text-base/6">{PERMISSION_REASONS[permission].refused}</p>
      <p className="text-base/6">
        To change it, open Para’s settings, tap Permissions, then Location or Notifications.
      </p>
      <div className="flex gap-3">
        <Button variant="primary" label="Open settings" onClick={onOpenSettings} />
        {canRecord ? (
          <Button variant="secondary" label="Record anyway" onClick={onRecordAnyway} />
        ) : (
          <Button variant="secondary" label="Close" onClick={onClose} />
        )}
      </div>
    </section>
  );
}
