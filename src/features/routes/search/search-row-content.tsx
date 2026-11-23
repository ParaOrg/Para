import { LANDMARK_KIND_LABEL, type SearchRow } from './search-rows';
import { VehicleIcon } from '../cards/vehicle-icon';

interface SearchRowContentProps {
  row: SearchRow;
}

/**
 * One result's words: a Para place's label, the name that matched when it is another, and the
 * vehicles that ride from it, each named for a screen reader (colour and shape are never the only
 * signal); a landmark's name, then its kind and the word "Landmark".
 */
export function SearchRowContent({ row }: SearchRowContentProps) {
  if (row.type === 'place') {
    const { place, matchedTerm } = row.match;
    return (
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{place.label}</span>
          {row.note && (
            <span className="shrink-0 rounded-md bg-surface-secondary px-1.5 text-xs text-content-secondary">
              {row.note}
            </span>
          )}
          {row.vehicles.length > 0 && (
            <span className="flex shrink-0 gap-1 text-content-secondary">
              {row.vehicles.map((vehicle) => (
                <span key={vehicle} className="block size-4 *:size-full">
                  <VehicleIcon vehicle={vehicle} />
                  <span className="sr-only">{vehicle}</span>
                </span>
              ))}
            </span>
          )}
        </span>
        {matchedTerm !== place.label && (
          <span className="block truncate text-sm text-content-secondary">{matchedTerm}</span>
        )}
      </span>
    );
  }

  const { landmark, matchedTerm } = row.match;
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold">{landmark.name}</span>
      <span className="block truncate text-sm text-content-secondary">
        {LANDMARK_KIND_LABEL[landmark.kind]} · Landmark
        {matchedTerm !== landmark.name && <> · {matchedTerm}</>}
      </span>
    </span>
  );
}
