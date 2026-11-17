import { FieldError } from '@/design-system/primitives/field-error';

interface RoomProblemProps {
  id: string;
}

/** On the save form when the phone could not keep every fix: part of the trail is missing. */
export function RoomProblem({ id }: RoomProblemProps) {
  return (
    <div role="alert">
      <FieldError
        id={id}
        message="Your phone ran out of room for part of this recording. Free up some space to keep the next one whole."
      />
    </div>
  );
}
