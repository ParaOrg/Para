/**
 * Says a draft is stored for the sidebar's route or hotspot: beside its heading, in Line detail's
 * Draft orange, the word itself the sign. A look for now, until the owner designs it.
 */
export function DraftBadge() {
  return (
    <span className="rounded-full border border-current px-2 py-0.5 text-xs/4 font-medium text-content-warning">
      Draft
    </span>
  );
}
