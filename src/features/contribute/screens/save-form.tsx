import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { Button } from '@/design-system/primitives/button';
import { TextAreaField } from '@/design-system/primitives/text-area-field';
import { TextField } from '@/design-system/primitives/text-field';

import { DiscardRecordingButton } from './discard-recording-button';
import { fareFromText } from './fare-text';
import { RideField } from './ride-field';
import { RideSheet } from './ride-sheet';
import { RoomProblem } from './room-problem';
import { SaveFormHeader } from './save-form-header';
import { StopRecordingScreen } from './stop-recording-screen';
import { useSaveCountdown } from './use-save-countdown';
import type { RecordingFigures } from '../recorder/recording-figures';
import type { RecordingDetails } from '../recorder/recording-state';
import { StopNotesSection } from '../stop-notes/stop-notes-section';
import type { StopNotesData } from '../stop-notes/stop-notes-view';
import type { RideKind } from '../storage/recording-schema';

interface SaveFormProps {
  /** The recording's time and distance, for Discard's question. */
  figures: RecordingFigures;
  /** Fixes the phone could not keep; above zero, the recording is missing part of its trail. */
  failedFixWrites: number;
  /** Resume: back to recording, for a stop that was a mistake. */
  onKeepRecording: () => void;
  /** Save recording, and the form's two minutes running out: saves with what was said. */
  onSave: (details: RecordingDetails) => void;
  /** Discard's question answered Stop without saving: the recording is thrown away. */
  onDiscard: () => void;
  /** The ride's flagged stops, on the form's own timeline: notes written there, stops deleted. */
  stopNotes: StopNotesData;
}

/**
 * Figma's Save Recording (4725:29196): the title, then Recording Information — Start point name,
 * End point name, Fare, What did you ride? (a sheet, 4525:15313) and Description — the ride's
 * Stops notes, and Discard recordings, over a bottom bar with Save recordings and Resume.
 *
 * Every field is optional. Left alone for two minutes it saves with what was typed, so a phone
 * put away after a ride does not keep a recording open; a fare it cannot read is left out then,
 * and Save recordings asks for it to be put right first. Discard asks over the whole screen, as ✕
 * does while recording, and never throws a recording away in one tap.
 */
export function SaveForm({
  figures,
  failedFixWrites,
  onKeepRecording,
  onSave,
  onDiscard,
  stopNotes,
}: SaveFormProps) {
  const ids = useId();
  const fareRef = useRef<HTMLInputElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const rideFieldRef = useRef<HTMLButtonElement>(null);
  const [startPointName, setStartPointName] = useState('');
  const [endPointName, setEndPointName] = useState('');
  const [fareText, setFareText] = useState('');
  const [isFareChecked, setIsFareChecked] = useState(false);
  const [rideKind, setRideKind] = useState<RideKind | null>(null);
  const [description, setDescription] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDiscardAsked, setIsDiscardAsked] = useState(false);

  const fare = fareFromText(fareText);
  const fareError = isFareChecked ? fare.error : undefined;
  // What is said, the fare only when it reads: a bad one is never kept, nor sent.
  const details: RecordingDetails = {
    startPointName,
    endPointName,
    description,
    rideKind,
    ...(fare.farePhp === undefined ? {} : { farePhp: fare.farePhp }),
  };
  const { touch } = useSaveCountdown(() => onSave(details), isSheetOpen || isDiscardAsked);

  // Focus back on the field, by hand: the form went inert as the sheet opened, so the field had
  // already lost focus and the sheet has nothing to give back.
  const closeSheet = () => {
    flushSync(() => setIsSheetOpen(false));
    touch();
    rideFieldRef.current?.focus();
  };
  const keepIt = () => {
    flushSync(() => setIsDiscardAsked(false));
    touch();
    discardRef.current?.focus();
  };

  return (
    <>
      <form
        aria-labelledby={`${ids}-heading`}
        inert={isSheetOpen || isDiscardAsked}
        noValidate
        onPointerDownCapture={touch}
        onKeyDownCapture={touch}
        onChangeCapture={touch}
        onSubmit={(event) => {
          event.preventDefault();
          if (fare.error) {
            setIsFareChecked(true);
            fareRef.current?.focus();
            return;
          }
          onSave(details);
        }}
        className="absolute inset-0 z-20 flex flex-col bg-surface font-sn-pro text-content-primary"
      >
        <SaveFormHeader headingId={`${ids}-heading`} />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          <div className="flex flex-col gap-5">
            <h2 className="text-2xl/8 font-bold">Recording Information</h2>
            {failedFixWrites > 0 && <RoomProblem id={`${ids}-room`} />}
            <TextField
              id={`${ids}-start`}
              label="Start point name"
              maxLength={80}
              value={startPointName}
              onChange={(event) => setStartPointName(event.target.value)}
              onClear={() => setStartPointName('')}
            />
            <TextField
              id={`${ids}-end`}
              label="End point name"
              maxLength={80}
              value={endPointName}
              onChange={(event) => setEndPointName(event.target.value)}
              onClear={() => setEndPointName('')}
            />
            <TextField
              ref={fareRef}
              id={`${ids}-fare`}
              label="Fare"
              inputMode="decimal"
              autoComplete="off"
              maxLength={9}
              value={fareText}
              error={fareError}
              onChange={(event) => setFareText(event.target.value)}
              onBlur={() => setIsFareChecked(true)}
              onClear={() => {
                setFareText('');
                setIsFareChecked(false);
              }}
            />
            <RideField
              ref={rideFieldRef}
              rideKind={rideKind}
              isSheetOpen={isSheetOpen}
              onOpen={() => setIsSheetOpen(true)}
            />
            <TextAreaField
              id={`${ids}-description`}
              label="Description"
              placeholder="Signboard, landmarks, anything that helps"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <StopNotesSection stopNotes={stopNotes} />
            <DiscardRecordingButton
              buttonRef={discardRef}
              onClick={() => setIsDiscardAsked(true)}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1 rounded-t-4xl bg-surface px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-bottom-sheet-top-shadow">
          <Button variant="primary" type="submit" label="Save recordings" />
          <Button variant="plain" label="Resume" onClick={onKeepRecording} />
        </div>
      </form>
      {isSheetOpen && (
        <RideSheet
          rideKind={rideKind}
          onPick={(picked) => {
            setRideKind(picked);
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}
      {isDiscardAsked && (
        <StopRecordingScreen
          figures={figures}
          keepLabel="Keep it"
          onKeep={keepIt}
          onStop={onDiscard}
        />
      )}
    </>
  );
}
