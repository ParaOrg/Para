import type { ComponentType } from 'react';

import {
  BusIcon,
  EJeepIcon,
  FerryIcon,
  JeepneyIcon,
  TrainIcon,
  UvExpressIcon,
} from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { FootstepsIcon } from './history-icons';
import { isWalkOnlyOf, type RideFacts } from './ride-facts';
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

/** As wide as most distances, held while the distance is read. */
const DISTANCE_ROOM = '9.9 km';

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
  // Known from the recording itself, so the icon is there from the first frame.
  const isWalkOnly = facts?.isWalkOnly ?? isWalkOnlyOf(recording);
  const VehicleIcon = isWalkOnly
    ? FootstepsIcon
    : recording.rideKind && VEHICLE_ICONS[recording.rideKind];
  const meta = [dayText(recording.startedAt), hoursMinutesText(seconds)];

  return (
    <p className="flex items-center gap-2 text-xs/4 text-content-tertiary">
      {VehicleIcon && (
        <span aria-hidden className="size-4 shrink-0 *:size-full">
          <VehicleIcon />
        </span>
      )}
      {isWalkOnly && <span className="sr-only">Walked,</span>}
      {!isWalkOnly && recording.rideKind && <span className="sr-only">{recording.rideKind},</span>}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {meta.map((text, index) => (
          <span key={text} className="flex items-center gap-1.5 whitespace-nowrap">
            {index > 0 && (
              <span aria-hidden className="size-0.5 rounded-full bg-content-tertiary" />
            )}
            {text}
          </span>
        ))}
        {/* The distance, or its room until it is read, so the line never moves when it comes. */}
        <span
          aria-hidden={facts ? undefined : true}
          className={cn('flex items-center gap-1.5 whitespace-nowrap', !facts && 'invisible')}
        >
          <span aria-hidden className="size-0.5 rounded-full bg-content-tertiary" />
          {facts ? cardDistanceText(facts.distanceM) : DISTANCE_ROOM}
        </span>
      </span>
    </p>
  );
}
