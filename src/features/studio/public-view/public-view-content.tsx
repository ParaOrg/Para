import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { PublicWaiting } from './public-waiting';
import { reviewKeys } from '../data/review-keys';

export function PublicViewContent() {
  const [version, setVersion] = useState(0);
  const client = useQueryClient();
  // The list is read against the published index, so a reload re-reads both.
  const handleReload = () => {
    setVersion((value) => value + 1);
    void client.invalidateQueries({ queryKey: reviewKeys.publication() });
  };
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
          onClick={handleReload}
        />
      </div>
      <iframe
        key={version}
        src="/?studio-public=1"
        title="Published ParaPo public map"
        className="min-h-0 w-full flex-1 border-0"
      />
      <div className="max-h-1/3 overflow-y-auto border-t border-border-primary p-3">
        <PublicWaiting />
      </div>
    </section>
  );
}
