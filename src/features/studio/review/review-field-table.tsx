import type { ReviewField } from '../data/review-diff';

interface ReviewFieldTableProps {
  fields: ReviewField[];
}

export function ReviewFieldTable({ fields }: ReviewFieldTableProps) {
  return (
    <div aria-label="Draft versus approved comparison" className="flex flex-col gap-2">
      {fields.map((field) => (
        <details key={field.label} className="rounded-lg border border-border-primary p-3">
          <summary className="cursor-pointer font-medium">
            {field.changed ? 'Changed: ' : 'Unchanged: '}
            {field.label}
          </summary>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold">Approved</dt>
              <dd className="max-h-48 overflow-auto break-all whitespace-pre-wrap">
                {field.approved}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Draft</dt>
              <dd className="max-h-48 overflow-auto break-all whitespace-pre-wrap">
                {field.proposed}
              </dd>
            </div>
          </dl>
        </details>
      ))}
    </div>
  );
}
