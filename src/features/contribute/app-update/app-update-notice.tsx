import { ButtonLink } from '@/design-system/primitives/button-link';

import type { AppUpdate } from './app-version';

interface AppUpdateNoticeProps {
  update: Exclude<AppUpdate, 'current'>;
  downloadUrl: string;
}

/** A newer app is out: a quiet line above Start, or, below the oldest version still allowed, in Start's place. */
export function AppUpdateNotice({ update, downloadUrl }: AppUpdateNoticeProps) {
  const text = update === 'required' ? 'Update ParaPo to record' : 'A new version is ready';
  return (
    <div className="flex items-center justify-between gap-3 bg-surface p-3 font-sn-pro text-content-primary">
      <p className="text-base/6">{text}</p>
      <ButtonLink
        variant="secondary"
        href={downloadUrl}
        label="Download"
        target="_blank"
        rel="noopener noreferrer"
      />
    </div>
  );
}
