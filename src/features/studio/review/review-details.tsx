import { useState } from 'react';

import { Button } from '@/design-system/primitives/button';

import { DraftFactsForm } from './draft-facts-form';
import { ReviewConflict } from './review-conflict';
import { ReviewFieldTable } from './review-field-table';
import { ReviewGeometry } from './review-geometry';
import type { ReviewAction } from '../data/review-commands';
import { reviewFields } from '../data/review-diff';
import { reviewDraftOf } from '../data/review-label';
import type { DraftRow } from '../data/review-schema';
import { useComparisonQuery } from '../data/use-review-query';

interface ReviewDetailsProps {
  draft: DraftRow;
  label?: string;
  isBusy: boolean;
  onAction: (action: ReviewAction, draft: DraftRow) => void;
  onBack: () => void;
  onBusyChange: (busy: boolean) => void;
  onReviewDependency: (id: string) => void;
}
export function ReviewDetails({
  draft,
  label = reviewDraftOf(draft).label,
  isBusy,
  onAction,
  onBack,
  onBusyChange,
  onReviewDependency,
}: ReviewDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const busy = isBusy || isEditing;
  const query = useComparisonQuery(draft);
  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" label="Back to drafts" onClick={onBack} disabled={busy} />
      <h3 className="text-lg font-bold">Review {label}</h3>
      {draft.note && <p>Reviewer note: {draft.note}</p>}
      {query.isPending && <p role="status">Loading the approved version…</p>}
      {query.isError && (
        <div>
          <p role="alert">{query.error.message}</p>
          <Button
            variant="secondary"
            label="Reload comparison"
            onClick={() => void query.refetch()}
          />
        </div>
      )}
      {query.data && (
        <>
          {query.data.hasConflict && query.data.currentRevision !== null && (
            <ReviewConflict
              key={`${draft.revision}:${query.data.currentRevision}`}
              draft={draft}
              currentRevision={query.data.currentRevision}
            />
          )}
          {query.data.dependencies.length > 0 && (
            <section
              aria-label="Places to approve first"
              className="rounded-xl bg-surface-secondary p-4"
            >
              <h4 className="font-bold">Approve or put back these places first</h4>
              <ul>
                {query.data.dependencies.map((dependency) => (
                  <li key={dependency.subjectId} className="mt-2 flex flex-wrap items-center gap-2">
                    {dependency.label}
                    {dependency.draftId && (
                      <Button
                        variant="secondary"
                        size="small"
                        label={`Review ${dependency.label}`}
                        onClick={() => onReviewDependency(dependency.draftId ?? '')}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-sm text-content-secondary">
            Approved is the studio’s current approved data. It can differ from the published public
            map. Expand changed fields to inspect full drawing coordinates and linked places.
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.status === 'pending' ? (
              <>
                <Button
                  variant="primary"
                  label="Approve reviewed changes"
                  disabled={
                    busy ||
                    query.data.hasConflict ||
                    query.data.dependencies.length > 0 ||
                    query.isFetching
                  }
                  onClick={() => onAction('approve', draft)}
                />
                <Button
                  variant="secondary"
                  label="Send back"
                  disabled={busy}
                  onClick={() => onAction('send-back', draft)}
                />
              </>
            ) : (
              <Button
                variant="primary"
                label="Submit for review"
                disabled={busy}
                onClick={() => onAction('submit', draft)}
              />
            )}
            <Button
              variant="secondary"
              label="Discard…"
              disabled={busy}
              onClick={() => onAction('discard', draft)}
            />
            <Button
              variant="secondary"
              label="Refresh comparison"
              disabled={busy || query.isFetching}
              onClick={() => void query.refetch()}
            />
          </div>
          <ReviewGeometry comparison={query.data} />
          <ReviewFieldTable fields={reviewFields(query.data)} />
          <DraftFactsForm
            key={draft.id}
            draft={draft}
            onBusyChange={(value) => {
              setIsEditing(value);
              onBusyChange(value);
            }}
          />
        </>
      )}
    </div>
  );
}
