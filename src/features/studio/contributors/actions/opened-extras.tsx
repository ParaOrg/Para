import type { ContributionStart } from './contribution-start';
import { HintoList } from './hinto-list';
import { PhoneBlock } from './phone-block';
import type { Contribution, ContributionDetail } from '../../data/contributions-read';

interface OpenedExtrasProps {
  contribution: Contribution;
  detail: ContributionDetail | undefined;
  onStart: (start: ContributionStart) => void;
}

/** The opened upload's hintos, with Draw a hintuan here, and its phone, with Block. */
export function OpenedExtras({ contribution: c, detail, onStart }: OpenedExtrasProps) {
  return (
    <>
      {detail && <HintoList hintos={detail.hintos} parts={detail.parts} onStart={onStart} />}
      {c.contributorId ? (
        <PhoneBlock contributorId={c.contributorId} phoneCode={c.phoneCode ?? 'unknown'} />
      ) : (
        <p>The phone is no longer linked to this upload.</p>
      )}
    </>
  );
}
