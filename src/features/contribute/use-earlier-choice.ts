import { useState } from 'react';
import * as z from 'zod/mini';

import { EARLIEST_SENT_VERSION } from './consent-version';

// Keyed by the first text that sends unasked: the answer is about recordings older than it.
const CHOICE_KEY = `parapo.contribute.earlier.${EARLIEST_SENT_VERSION}`;
const choiceSchema = z.enum(['send', 'keep']);

/** What the person said about recordings made before they agreed to the current text. */
export type EarlierChoice = z.infer<typeof choiceSchema>;

function storedChoice(): EarlierChoice | null {
  try {
    const parsed = choiceSchema.safeParse(localStorage.getItem(CHOICE_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    // Storage blocked: the question comes back next visit, and nothing is sent meanwhile.
    return null;
  }
}

interface EarlierChoiceState {
  /** Null until asked; the question is asked once. */
  choice: EarlierChoice | null;
  choose: (choice: EarlierChoice) => void;
}

/** The one-time answer to "send the earlier recordings too?", kept on the phone. */
export function useEarlierChoice(): EarlierChoiceState {
  const [choice, setChoice] = useState(storedChoice);

  const choose = (next: EarlierChoice) => {
    try {
      localStorage.setItem(CHOICE_KEY, next);
    } catch (error) {
      console.warn('The page could not remember the answer.', error);
    }
    setChoice(next);
  };

  return { choice, choose };
}
