import { Button } from '@/design-system/primitives/button';

import { useFocusHeading } from '../use-focus-heading';
import type { NativePermission } from './native-permissions';
import { PERMISSION_REASONS } from './permission-steps';

interface PermissionPanelProps {
  permission: NativePermission;
  /** Android's own question comes next. */
  onContinue: () => void;
  onCancel: () => void;
}

/** Says why ParaPo is about to ask for a permission, before Android asks. */
export function PermissionPanel({ permission, onContinue, onCancel }: PermissionPanelProps) {
  const headingRef = useFocusHeading();
  const { title, reason } = PERMISSION_REASONS[permission];
  return (
    <section
      aria-labelledby="permission-heading"
      className="flex flex-col gap-3 bg-surface p-4 font-sn-pro text-content-primary"
    >
      <h1
        id="permission-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-extrabold focus:outline-none"
      >
        {title}
      </h1>
      <p className="text-base/6">{reason}</p>
      <div className="flex gap-3">
        <Button variant="primary" label="Continue" onClick={onContinue} />
        <Button variant="secondary" label="Not now" onClick={onCancel} />
      </div>
    </section>
  );
}
