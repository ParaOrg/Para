import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { isNativeApp } from './native-app';
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

// Plain colours and inline styles on purpose: this throwaway panel must stay readable in a
// phone's dark mode and whatever the page's stylesheet does or does not carry.
const PANEL_STYLE = {
  background: '#fff',
  color: '#000',
  fontSize: 14,
  lineHeight: 1.4,
  padding: 12,
  borderRadius: 8,
  maxHeight: '70vh',
  overflow: 'auto',
  marginTop: 4,
  width: 'calc(100vw - 16px)',
  boxSizing: 'border-box',
  border: '2px solid #000',
} as const;
const BUTTON_STYLE = {
  background: '#000',
  color: '#fff',
  border: 0,
  borderRadius: 8,
  padding: '8px 16px',
  minHeight: 48,
  fontSize: 16,
  fontWeight: 700,
} as const;

const ORDER: NativePermission[] = ['notifications', 'location', 'backgroundLocation'];

interface CatchProps {
  children: ReactNode;
}
interface CatchState {
  error: Error | null;
}

// The one class component outside shared/ui: a throwaway, so a thrown error prints in the panel
// instead of leaving it blank. Not for merging.
class ShowErrors extends Component<CatchProps, CatchState> {
  state: CatchState = { error: null };
  static getDerivedStateFromError(error: Error): CatchState {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
        {error.message}
        {'\n'}
        {error.stack}
      </pre>
    );
  }
}

function Permissions() {
  const [states, setStates] = useState<NativePermissionStates | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const handleDone = (next: NativePermissionStates) => {
    setStates(next);
    setProblem(null);
  };
  const handleFail = (error: unknown) =>
    setProblem(error instanceof Error ? error.message : 'unknown error');

  useEffect(() => {
    checkNativePermissions().then(handleDone).catch(handleFail);
  }, []);

  if (problem) return <p>Permissions error: {problem}</p>;
  if (!states) return <p>Permissions: loading…</p>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {ORDER.map((permission) => (
        <li key={permission} style={{ marginBottom: 8, padding: 8, background: '#eee' }}>
          <strong>{PERMISSION_REASONS[permission].title}</strong>: {states[permission]}
          <br />
          {PERMISSION_REASONS[permission].reason}
          <br />
          <button
            type="button"
            style={{ ...BUTTON_STYLE, minHeight: 40, fontSize: 14 }}
            onClick={() => requestNativePermission(permission).then(handleDone).catch(handleFail)}
          >
            Ask
          </button>
        </li>
      ))}
    </ul>
  );
}

function PanelBody() {
  const watch = useSyncExternalStore(subscribeToNativeWatch, readNativeWatchStats);
  return (
    <>
      <p>
        <strong>
          Spike panel v3 · Native app detected: {isNativeApp() ? 'yes' : 'NO'} · origin:{' '}
          {window.location.origin}
        </strong>
      </p>
      <p>Test build, it cannot upload. Notice: “{RECORDING_NOTIFICATION.title}”.</p>
      <h2 style={{ fontSize: 16 }}>Native fixes</h2>
      <p>
        Count {watch.fixCount}, last{' '}
        {watch.lastFixAt ? new Date(watch.lastFixAt).toLocaleTimeString() : 'none'}, accuracy{' '}
        {watch.lastAccuracyM === null ? '-' : `${Math.round(watch.lastAccuracyM)} m`}
        {watch.lastError ? `, error ${watch.lastError}` : ''}.
      </p>
      <h2 style={{ fontSize: 16 }}>Permissions</h2>
      <Permissions />
      <h2 style={{ fontSize: 16 }}>Turnstile</h2>
      <NativeTurnstileCheck />
    </>
  );
}

/** The throwaway test app's tools: permissions, what the native watch has delivered, Turnstile. */
export function NativeSpikePanel() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <p
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          zIndex: 1000,
          margin: 0,
          padding: '4px 8px',
          background: '#000',
          color: '#fff',
          fontSize: 14,
          borderRadius: 6,
        }}
      >
        Test build · Spike ↑
      </p>
      <div style={{ position: 'fixed', top: '33%', left: 8, zIndex: 1000 }}>
        <button
          type="button"
          style={BUTTON_STYLE}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((was) => !was)}
        >
          Spike
        </button>
        {isOpen && (
          <section aria-label="Spike tools" style={PANEL_STYLE}>
            <ShowErrors>
              <PanelBody />
            </ShowErrors>
          </section>
        )}
      </div>
    </>
  );
}
