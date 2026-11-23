import { GeneralBar } from './general-bar';

interface AppSettingRowProps {
  label: string;
  onClick: () => void;
  /** One line when the row's phone screen could not open, or null. */
  error: string | null;
}

/**
 * A row of Account settings in the Android app only (Keep Para recording, Share ride diagnostics):
 * one GeneralBar that opens a screen of the phone's, and the line that says it could not.
 */
export function AppSettingRow({ label, onClick, error }: AppSettingRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <GeneralBar icon="settings" label={label} onClick={onClick} />
      {error && (
        <p role="alert" className="text-sm/5 text-content-quaternary">
          {error}
        </p>
      )}
    </div>
  );
}
