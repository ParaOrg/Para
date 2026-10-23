import { useState } from 'react';
import * as z from 'zod/mini';

import { CONSENT_VERSION } from './consent-version';

// Keyed by the text's version: an answer given about one text says nothing about the next.
const CHOICE_KEY = `parapo.contribute.earlier.${CONSENT_VERSION}`;
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
