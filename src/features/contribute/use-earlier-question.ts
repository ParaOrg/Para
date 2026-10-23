import { isEarlierRecording, shouldAskAboutEarlier } from './consent-version';
import type { EarlierQuestion } from './ready-screen';
import type { Recording } from './recording-schema';
import { useEarlierChoice, type EarlierChoice } from './use-earlier-choice';

interface EarlierQuestionState {
  /** The answer so far, which the upload gate reads. */
  choice: EarlierChoice | null;
  /** The question for the Ready screen, or null when none is open. */
  question: EarlierQuestion | null;
}

/** The question about unsent recordings made before the current consent text, and its answer. */
export function useEarlierQuestion(
  saved: readonly Recording[],
  hasConsent: boolean,
): EarlierQuestionState {
  const { choice, choose } = useEarlierChoice();
  const count = saved.filter(
    (recording) => recording.upload === undefined && isEarlierRecording(recording.consentVersion),
  ).length;
  const isAsked = shouldAskAboutEarlier({
    hasConsent,
    hasAnswered: choice !== null,
    unsentEarlierCount: count,
  });
  const question = isAsked
    ? { count, onSend: () => choose('send'), onKeep: () => choose('keep') }
    : null;
  return { choice, question };
}
