import { useEffect, useRef } from 'react';

import type { ToastContent } from './toast';
import { ToastHost } from './toast-host';
import { useToast } from './use-toast';

/** A toast that stands for something true of the page right now, until it is no longer true. */
export interface StandingToast {
  /** Names the problem: gone from the list, the toast with this id is taken back. */
  id: string;
  content: ToastContent;
  /**
   * Raised to say it again with the same words: a tap that asks again and is refused again
   * brings back a toast closed with ✕, or refreshes the one showing.
   */
  saying: number;
}

export interface StandingToastsProps {
  /** Every toast as the page has it now. */
  toasts: readonly StandingToast[];
}

/**
 * A page's problems as toasts (ToastHost): each said once, again when its words or its `saying`
 * change, and taken back when it leaves the list. One closed with ✕ stays closed until then.
 * Its own host, so a page can fetch it the first time it has something to say.
 */
export function StandingToasts({ toasts }: StandingToastsProps) {
  return (
    <ToastHost>
      <SaidToasts toasts={toasts} />
    </ToastHost>
  );
}

function SaidToasts({ toasts }: StandingToastsProps) {
  const { showToast, hideToast } = useToast();
  // What each toast last said, by its id: its words, and the saying they were said at.
  const said = useRef(new Map<string, { words: string; saying: number }>());
  // The host's queue is told, not rendered: this keeps it in step with the list.
  useEffect(() => {
    const now = new Set(toasts.map((toast) => toast.id));
    for (const id of said.current.keys()) {
      if (now.has(id)) continue;
      said.current.delete(id);
      hideToast(id);
    }
    for (const { id, content, saying } of toasts) {
      const words = `${content.title}\n${content.body ?? ''}`;
      const last = said.current.get(id);
      if (last?.words === words && last.saying === saying) continue;
      // New words: a toast still waiting keeps its first ones, so the old one goes and the new
      // one is said in its place. The same words said again refresh the one showing.
      if (last && last.words !== words) hideToast(id);
      said.current.set(id, { words, saying });
      showToast({ ...content, id });
    }
  }, [toasts, showToast, hideToast]);
  return null;
}
