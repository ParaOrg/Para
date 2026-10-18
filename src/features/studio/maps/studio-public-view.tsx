import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { MapPlaceholder } from './map-placeholder';
import { STUDIO_DRAFTS } from '../data/flags';

/** The actual published map, in its own read-only page and data context. */
export function StudioPublicView({
  hasLine,
  onOpenPlayground,
}: {
  hasLine: boolean;
  onOpenPlayground: () => void;
}) {
  const [version, setVersion] = useState(0);
  if (!STUDIO_DRAFTS)
    return <MapPlaceholder map="public" hasLine={hasLine} onOpenPlayground={onOpenPlayground} />;
  return (
    <section
      aria-label="Published public view"
      className="absolute inset-0 z-5 flex flex-col bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-primary p-3">
        <p className="text-sm">
          Published public map · Drafts and unpublished approvals do not appear here.
        </p>
        <Button
          variant="secondary"
          size="small"
          label="Reload published map"
          onClick={() => setVersion((value) => value + 1)}
        />
      </div>
      <iframe
        key={version}
        src="/?studio-public=1"
        title="Published ParaPo public map"
        className="min-h-0 w-full flex-1 border-0"
      />
    </section>
  );
}
