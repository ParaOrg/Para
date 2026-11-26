import type { ComponentType } from 'react';

import {
  BusIcon,
  EJeepIcon,
  FerryIcon,
  JeepneyIcon,
  TrainIcon,
  UvExpressIcon,
} from '@/shared/ui/route-icons';

import type { Mode } from '../model/mode-filter';

interface ModeFilterIconProps {
  mode: Mode;
}

/** Figma's "2" between two buses (4896:42598): point to point, drawn in text/quaternary. */
function PointToPointIcon() {
  return (
    <span className="flex items-center *:size-5">
      <BusIcon />
      <svg viewBox="0 0 20 20" aria-hidden="true" className="fill-current text-text-quaternary">
        <path d="M4.69171 17.9167V15.8727L10.1144 10.5568C10.633 10.0331 11.0652 9.56781 11.411 9.16105C11.7567 8.75428 12.016 8.36023 12.1889 7.97888C12.3618 7.59754 12.4482 7.19078 12.4482 6.75859C12.4482 6.26539 12.3364 5.84337 12.1126 5.49253C11.8889 5.13661 11.5813 4.86205 11.1898 4.66883C10.7983 4.47562 10.3534 4.37901 9.85509 4.37901C9.34155 4.37901 8.89157 4.48579 8.50514 4.69934C8.11871 4.90781 7.81872 5.20526 7.60517 5.59168C7.3967 5.97811 7.29247 6.43826 7.29247 6.97214H4.60019C4.60019 5.98065 4.82646 5.11882 5.27898 4.38664C5.73151 3.65446 6.35437 3.08753 7.14756 2.68585C7.94584 2.28417 8.86106 2.08333 9.89322 2.08333C10.9406 2.08333 11.861 2.27909 12.6541 2.6706C13.4473 3.06211 14.0626 3.59853 14.4998 4.27987C14.9422 4.9612 15.1634 5.73913 15.1634 6.61368C15.1634 7.19841 15.0515 7.77296 14.8278 8.33735C14.6041 8.90173 14.21 9.52714 13.6456 10.2136C13.0863 10.9 12.3008 11.7313 11.2889 12.7075L8.59666 15.4456V15.5523H15.3998V17.9167H4.69171Z" />
      </svg>
      <BusIcon />
    </span>
  );
}

const ICON = {
  jeep: JeepneyIcon,
  ejeep: EJeepIcon,
  uv: UvExpressIcon,
  bus: BusIcon,
  p2p: PointToPointIcon,
  train: TrainIcon,
  ferry: FerryIcon,
} satisfies Record<Mode, ComponentType>;

/** A mode's drawing before its name in the filter menu (4896:42082), 20 across, in currentColor. */
export function ModeFilterIcon({ mode }: ModeFilterIconProps) {
  const Icon = ICON[mode];
  return (
    <span aria-hidden="true" className="flex shrink-0 [&>svg]:size-5">
      <Icon />
    </span>
  );
}
