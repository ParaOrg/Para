import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  readNativeWatchStats,
  RECORDING_NOTIFICATION,
  subscribeToNativeWatch,
} from './native-location';
import {
  checkNativePermissions,
  PERMISSION_REASONS,
  requestNativePermission,
  type NativePermission,
  type NativePermissionStates,
} from './native-permissions';
import { NativeTurnstileCheck } from './native-turnstile-check';

const ORDER: NativePermission[] = ['notifications', 'location', 'backgroundLocation'];

function PermissionRow({
  permission,
  state,
  onAsk,
}: {
  permission: NativePermission;
  state: string;
  onAsk: (permission: NativePermission) => void;
}) {
  const { title, reason } = PERMISSION_REASONS[permission];
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface-secondary p-2">
      <p>
        <strong>{title}</strong>: {state}
      </p>
      <p>{reason}</p>
      <button
        type="button"
        onClick={() => onAsk(permission)}
        className="self-start rounded-md bg-surface-tertiary px-3 py-1"
      >
        Ask
      </button>
    </li>
  );
}

/** The throwaway test app's tools: permissions, what the native watch has delivered, Turnstile. */
export function NativeSpikePanel() {
  const [states, setStates] = useState<NativePermissionStates | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const watch = useSyncExternalStore(subscribeToNativeWatch, readNativeWatchStats);

  useEffect(() => {
    if (isOpen) void checkNativePermissions().then(setStates);
  }, [isOpen]);

  const handleAsk = (permission: NativePermission) =>
    void requestNativePermission(permission).then(setStates);

  return (
    <div className="absolute top-2 right-2 z-50 font-sn-pro text-sm text-content-primary">
      <button
        type="button"
        onClick={() => setIsOpen((was) => !was)}
        aria-expanded={isOpen}
        className="rounded-md bg-surface px-2 py-1 shadow-lg"
      >
        Spike
      </button>
      {isOpen && (
        <section
          aria-label="Spike tools"
          className="mt-1 flex max-h-[80dvh] w-[calc(100vw-1rem)] flex-col gap-3 overflow-y-auto rounded-xl bg-surface p-3 shadow-lg"
        >
          <p>Test build. It cannot upload. Notice: “{RECORDING_NOTIFICATION.title}”.</p>
          <h2 className="font-bold">Native fixes</h2>
          <p>
            Count {watch.fixCount}, last{' '}
            {watch.lastFixAt ? new Date(watch.lastFixAt).toLocaleTimeString() : 'none'}, accuracy{' '}
            {watch.lastAccuracyM === null ? '-' : `${Math.round(watch.lastAccuracyM)} m`}
            {watch.lastError ? `, error ${watch.lastError}` : ''}.
          </p>
          <h2 className="font-bold">Permissions</h2>
          <ul className="flex flex-col gap-2">
            {ORDER.map((permission) => (
              <PermissionRow
                key={permission}
                permission={permission}
                state={states?.[permission] ?? 'unknown'}
                onAsk={handleAsk}
              />
            ))}
          </ul>
          <h2 className="font-bold">Turnstile</h2>
          <NativeTurnstileCheck />
        </section>
      )}
    </div>
  );
}
