import { useId, type ReactNode, type Ref } from 'react';

import { STUDIO_MAPS, type StudioMapName } from './studio-map';

interface MapSwitchProps {
  ref?: Ref<HTMLDivElement>;
  value: StudioMapName;
  onChange: (next: StudioMapName) => void;
}

const ICON_PROPS = {
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
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.3c1.8.8 3 2.7 3 5.7" />
    </>
  ),
  playground: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  public: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9z" />
    </>
  ),
};

const CHECK = <path d="M5 12.5l4.5 4.5L19 7.5" />;

interface IconProps {
  className?: string;
  children: ReactNode;
}

function Icon({ className, children }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={`size-4 shrink-0 ${className ?? ''}`}>
      {children}
    </svg>
  );
}

const OPTION =
  'flex h-7 min-w-0 flex-auto cursor-pointer items-center justify-center gap-1 rounded-full px-1 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-content-primary sm:flex-none sm:gap-1.5 sm:px-3';

/**
 * The studio's map switch, in the top band: Contributors, Playground or
 * Public. A radio group, so Tab reaches it once and the arrow keys move
 * between the maps. The current one is filled and carries a check (on a phone
 * the check stands in for its icon), so it does not rest on colour alone.
 * This changes what the map shows; the layers button changes how it looks.
 */
export function MapSwitch({ ref, value, onChange }: MapSwitchProps) {
  const name = useId();
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="Map"
      className="flex h-9 w-full items-center rounded-full bg-surface-secondary p-1 sm:w-auto"
    >
      {STUDIO_MAPS.map((option) => {
        const isCurrent = option === value;
        return (
          <label
            key={option}
            className={`${OPTION} ${isCurrent ? 'bg-content-primary text-content-inverse' : 'text-content-tertiary hover:bg-surface-tertiary'}`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={isCurrent}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            <Icon className={isCurrent ? 'max-sm:hidden' : ''}>{ICONS[option]}</Icon>
            {isCurrent && <Icon className="sm:hidden">{CHECK}</Icon>}
            <span className="truncate">{LABELS[option]}</span>
            {isCurrent && <Icon className="max-sm:hidden">{CHECK}</Icon>}
          </label>
        );
      })}
    </div>
  );
}
