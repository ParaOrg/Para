import { Turnstile } from '@/shared/ui/turnstile';

import type { UploadCheck as Check } from './use-uploads';

interface UploadCheckProps {
  check: Check;
}

/** Before this phone's first upload: Cloudflare's check that a person, not a script, is sending. Once only. */
export function UploadCheck({ check }: UploadCheckProps) {
  return (
    <section
      aria-label="Check before the first upload"
      className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+5.5rem)] z-30 flex flex-col gap-2 rounded-xl bg-surface p-3 font-sn-pro text-content-primary shadow-lg"
    >
      <p className="text-base/6">Before your first upload: a quick check that you are a person.</p>
      <Turnstile key={check.round} siteKey={check.siteKey} onToken={check.onToken} />
    </section>
  );
}
