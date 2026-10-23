import { ButtonLink } from '@/design-system/primitives/button-link';
import { PlusIcon } from '@/shared/ui/route-icons';

/**
 * The way to the contributor page from the public map: a plain link at the
 * top left, the plus with its word. The page is another address with its own
 * bundle, so a commuter who never taps it downloads nothing for it
 * (scripts/checks/check-build.mjs).
 */
export function ContributorButton() {
  return (
    <div className="absolute top-0 left-0 z-10 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))]">
      <ButtonLink
        data-testid="contributor-button"
        href="/contribute/"
        variant="special"
        label="Contribute"
        firstIcon={<PlusIcon />}
      />
    </div>
  );
}
