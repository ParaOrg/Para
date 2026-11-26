import { useId } from 'react';

import { Button } from '@/design-system/primitives/button';
import { cn } from '@/shared/utils/cn';

import { CardBlob } from './card-blob';
import { NavigationOffArt } from './explore-cards-icons';

interface DonationCardProps {
  /**
   * The route list's last card (4885:42554): 80 under it, so the bar a list at the top shows over
   * its foot (ListTopBar) leaves its words in sight. Else the first card's, clear of the home bar.
   */
  isListEnd?: boolean;
}

/** The purple card (DonationCard, 4852:35157): under the explore cards, and at the list's end. */
export function DonationCard({ isListEnd = false }: DonationCardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'relative isolate flex flex-col items-start gap-4 overflow-clip bg-brand-surface p-4 text-text-on-fill shadow-route-card-fill',
        isListEnd ? 'pb-20' : 'pb-[max(1rem,env(safe-area-inset-bottom))] @float:pb-4',
      )}
    >
      <CardBlob />
      <NavigationOffArt />
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-lg/6.5 font-bold">
          Help make Para better
        </h2>
        <p className="text-sm/5">Your donation helps us keep improving Para for every commuter.</p>
      </div>
      {/* TODO: link to the donation page once it has an address; no destination exists yet. */}
      <Button variant="secondary" size="small" label="Donate" disabled />
    </section>
  );
}
