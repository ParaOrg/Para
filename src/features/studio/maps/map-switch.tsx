import { useId, type ReactNode } from 'react';

import { STUDIO_MAPS, type StudioMapName } from './studio-map';

interface MapSwitchProps {
  value: StudioMapName;
  onChange: (next: StudioMapName) => void;
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const LABELS: Record<StudioMapName, string> = {
  contributors: 'Contributors',
  playground: 'Playground',
  public: 'Public',
};

const ICONS: Record<StudioMapName, ReactNode> = {
  contributors: (
    <svg {...ICON_PROPS}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3c1.8.8 3 2.7 3 5.7" />
    </svg>
  ),
  playground: (
    <svg {...ICON_PROPS}>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  ),
  public: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9z" />
    </svg>
  ),
};

const OPTION =
  'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium max-sm:gap-1 max-sm:px-2 max-sm:text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-900';

/**
 * The studio's map switch, always at the top: Contributors, Playground or
 * Public. A radio group, so Tab reaches it once and the arrow keys move
 * between the maps. The current one is filled and carries a check, so it
 * does not rest on colour alone. The look is provisional, in the studio's
 * neutral chrome, until the owner gives the Figma frame. This changes what the map shows; the layers
 * button changes how it looks.
 */
export function MapSwitch({ value, onChange }: MapSwitchProps) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label="Map"
      className="flex items-center rounded-full bg-white/90 p-1 shadow ring-1 ring-black/5 backdrop-blur"
    >
      {STUDIO_MAPS.map((option) => {
        const isCurrent = option === value;
        return (
          <label
            key={option}
            className={`${OPTION} ${isCurrent ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={isCurrent}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {ICONS[option]}
            {LABELS[option]}
            {isCurrent && (
              <svg {...ICON_PROPS} width={16} height={16} strokeWidth={3}>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </label>
        );
      })}
    </div>
  );
}
