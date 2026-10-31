import type { ComponentType } from 'react';

import {
  BusIcon,
  EJeepIcon,
  FerryIcon,
  JeepneyIcon,
  TrainIcon,
  UvExpressIcon,
} from '@/shared/ui/route-icons';

import { FootstepsIcon } from './history-icons';
import type { RideFacts } from './ride-facts';
import { cardDistanceText, dayText, hoursMinutesText } from '../common/format';
import type { Recording, RideKind } from '../storage/recording-schema';

/** The vehicles with an icon of their own; Tricycle and Other have none yet. */
const VEHICLE_ICONS: Partial<Record<RideKind, ComponentType>> = {
  Jeep: JeepneyIcon,
  'E-Jeep': EJeepIcon,
  'UV Express': UvExpressIcon,
  Bus: BusIcon,
  Train: TrainIcon,
  Ferry: FerryIcon,
};

interface CardMetaProps {
  recording: Recording;
  /** Its distance, and whether it was walked the whole way; null until read. */
  facts: RideFacts | null;
}

/**
 * The card's meta line (Figma 4518:24526): the vehicle, or the Lakad foot when walked the whole
 * way, then the day, the time and the distance, always in that order, 2 px dots between.
 */
export function CardMeta({ recording, facts }: CardMetaProps) {
  const seconds = ((recording.stoppedAt ?? recording.startedAt) - recording.startedAt) / 1000;
  const VehicleIcon = facts?.isWalkOnly
    ? FootstepsIcon
    : recording.rideKind && VEHICLE_ICONS[recording.rideKind];
  const meta = [
    dayText(recording.startedAt),
    hoursMinutesText(seconds),
    ...(facts ? [cardDistanceText(facts.distanceM)] : []),
  ];

  return (
    <p className="flex items-center gap-2 text-xs/4 text-content-tertiary">
      {VehicleIcon && (
        <span aria-hidden className="size-4 shrink-0 *:size-full">
          <VehicleIcon />
        </span>
      )}
      {facts?.isWalkOnly && <span className="sr-only">Walked,</span>}
      {!facts?.isWalkOnly && recording.rideKind && (
        <span className="sr-only">{recording.rideKind},</span>
      )}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {meta.map((text, index) => (
          <span key={text} className="flex items-center gap-1.5 whitespace-nowrap">
            {index > 0 && (
              <span aria-hidden className="size-0.5 rounded-full bg-content-tertiary" />
            )}
            {text}
          </span>
        ))}
      </span>
    </p>
  );
}
