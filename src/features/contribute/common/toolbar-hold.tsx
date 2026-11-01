import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/*
 * The page's toolbar stands over Record, History and Account (contribute-page.tsx), above their
 * screens. A question asked on one of them (Logout, Delete) dims that screen and holds the
 * keyboard, so while one is open the toolbar steps out of sight and out of reach: no tab can be
 * pressed past the question.
 */

interface ToolbarHold {
  /** How many questions are open now. */
  openQuestions: number;
  /** One more question open; what it returns lets go of it. */
  hold: () => () => void;
}

const ToolbarHoldContext = createContext<ToolbarHold | null>(null);

interface ToolbarHoldProviderProps {
  children: ReactNode;
}

/** Around the tab screens and the toolbar: questions under it hold the toolbar beside them. */
export function ToolbarHoldProvider({ children }: ToolbarHoldProviderProps) {
  const [openQuestions, setOpenQuestions] = useState(0);
  const [hold] = useState(() => () => {
    setOpenQuestions((n) => n + 1);
    return () => setOpenQuestions((n) => n - 1);
  });
  return (
    <ToolbarHoldContext.Provider value={{ openQuestions, hold }}>
      {children}
    </ToolbarHoldContext.Provider>
  );
}

/** Holds the toolbar for as long as the calling question is on screen; nothing outside a provider. */
export function useHoldToolbar(): void {
  const hold = useContext(ToolbarHoldContext)?.hold;
  useEffect(() => hold?.(), [hold]);
}

/** Whether a question is open, so the toolbar steps aside. */
export function useIsToolbarHeld(): boolean {
  return (useContext(ToolbarHoldContext)?.openQuestions ?? 0) > 0;
}
