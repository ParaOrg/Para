import * as z from 'zod/mini';

import type { ReviewComparison } from './review-comparison';

export interface ReviewField {
  label: string;
  approved: string;
  proposed: string;
  changed: boolean;
}

const recordSchema = z.record(z.string(), z.unknown());
const OMIT = new Set(['version', 'overview', 'route_code']);
const LABELS: Record<string, string> = {
  route: 'Route',
  stop: 'Place',
  name: 'Ground name',
  signboard: 'Signboard',
  mode: 'Transport',
  fare_note: 'Fare note',
  via: 'Via',
  head_stop_id: 'Head place',
  tail_stop_id: 'Tail place',
  is_loop: 'Loop',
  informal: 'Common name',
  aliases: 'Other names',
  kind: 'Place type',
  note: 'Note',
  area: 'Outline',
  point: 'Position',
  line: 'Rail or ferry line',
  directions: 'Directions',
  links: 'Linked places and routes',
  shape: 'Line',
  control_points: 'Drawing points',
  segments: 'Drawing segments',
  confidence: 'Confidence',
  borrowed_from: 'Borrowed direction',
  borrowed_part: 'Borrowed section',
  borrowed_m: 'Borrowed metres',
  signboards: 'Signboard files',
  reversed: 'Return direction',
  direction_name: 'Direction name',
  origin_terminal: 'Origin terminal',
  destination_terminal: 'Destination terminal',
  id: 'Identifier',
};
function fieldsOf(value: unknown, prefix = ''): Map<string, string> {
  const fields = new Map<string, string>();
  const object = recordSchema.safeParse(value);
  if (!object.success) return fields;
  for (const [key, item] of Object.entries(object.data)) {
    if (OMIT.has(key)) continue;
    const label = [prefix, LABELS[key] ?? key.replaceAll('_', ' ')].filter(Boolean).join(' / ');
    if (key === 'directions' && Array.isArray(item)) {
      for (const direction of item) {
        const record = recordSchema.safeParse(direction);
        const id =
          record.success && typeof record.data.id === 'string' ? record.data.id : 'unknown';
        for (const [path, text] of fieldsOf(direction, `${label} / ${id}`)) fields.set(path, text);
      }
    } else if (key === 'route' || key === 'stop') {
      for (const [path, text] of fieldsOf(item, label)) fields.set(path, text);
    } else {
      // Full geometry and links remain inspectable; a count alone could hide a changed line.
      fields.set(
        label,
        item == null ? '—' : typeof item === 'string' ? item : JSON.stringify(item),
      );
    }
  }
  return fields;
}

export function reviewFields(comparison: ReviewComparison): ReviewField[] {
  const approved = fieldsOf(comparison.approved);
  const proposed = fieldsOf(comparison.proposed);
  return [...new Set([...approved.keys(), ...proposed.keys()])]
    .sort()
    .map((label) => ({
      label,
      approved: approved.get(label) ?? '—',
      proposed: proposed.get(label) ?? '—',
      changed: approved.get(label) !== proposed.get(label),
    }))
    .sort((a, b) => Number(b.changed) - Number(a.changed) || a.label.localeCompare(b.label));
}
