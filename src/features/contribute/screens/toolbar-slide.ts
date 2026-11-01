import type { ToolbarTab } from './bottom-toolbar';
import { notePillAt } from './use-sliding-pill';
import { motionOf, prefersReducedMotion } from '../common/tab-motion';
import {
  endSelectionTicks,
  selectionTick,
  startSelectionTicks,
} from '../native-bridge/selection-ticks';

/** How long a finger rests on the bar before it picks the pill up. */
const HOLD_MS = 250;
/** How far a finger moves along the bar before its drag picks the pill up, without the hold. */
const DRAG_PX = 8;
/** How far above the bar a sliding finger may go before the slide is called off. */
const LEAVE_ABOVE_PX = 80;
/** How soon after a slide's release a click is the release's own, not a new tap. */
const RELEASE_CLICK_MS = 100;
/** How long the pill keeps its tab's colours after a pick, if the screen never takes over. */
const PAINT_KEPT_MS = 1000;

interface ToolbarSlide {
  bar: HTMLDivElement;
  pill: HTMLSpanElement;
  current: ToolbarTab;
  /** The tab the pill was let go on, when it is not the one showing: its screen opens. */
  onPick: (tab: ToolbarTab) => void;
  /** The pill reaching another tab on its way: the page may fetch that tab's screen ahead. */
  onTabReached?: (tab: ToolbarTab) => void;
  /** The press that fetched this code, if any: the slide begins from it. */
  first?: PointerEvent;
}

/**
 * Press and hold the toolbar (or drag along it) to pick its pill up and slide it along the bar;
 * the tab under the finger takes the marked colours as the pill reaches it. Let go, and the pill
 * settles on the nearest tab and that tab's screen opens, with the usual move between screens.
 * Let go on the tab it started on, or slide off far above the bar, and nothing changes. A plain
 * tap is left to the tab's own click. Screens change on release only, never on the way past.
 * Returns what takes its listeners off again.
 */
export function attachToolbarSlide({
  bar,
  pill,
  current,
  onPick,
  onTabReached,
  first,
}: ToolbarSlide): () => void {
  const tabs = () => [...bar.querySelectorAll<HTMLElement>('[data-tab]')];
  const tabName = (tab: HTMLElement): ToolbarTab | null => {
    const name = tab.dataset.tab;
    return name === 'record' || name === 'history' || name === 'account' ? name : null;
  };
  const currentTab = tabs().find((tab) => tabName(tab) === current);
  // No tab marked (not drawn yet): nothing to slide, and nothing to take off.
  if (!currentTab) return () => undefined;
  // The marked tab's colour and the others', as the tabs wear them now (bottom-toolbar.tsx).
  const markedColour = getComputedStyle(currentTab).color;
  const otherTab = tabs().find((tab) => tab !== currentTab);
  const unmarkedColour = otherTab ? getComputedStyle(otherTab).color : markedColour;

  let press: {
    pointerId: number;
    startX: number;
    holdTimer: number;
    isSliding: boolean;
    over: HTMLElement;
  } | null = null;
  // When a slide was last let go: the click a release makes (a mouse's) is the slide's, not a tap.
  let releasedAt = Number.NEGATIVE_INFINITY;
  let paintKept = 0;

  /** The tab whose span holds the bar-relative x, the nearest at either end. */
  const tabAt = (x: number): HTMLElement => {
    const all = tabs();
    return (
      all.find((tab) => x < tab.offsetLeft + tab.offsetWidth) ?? all[all.length - 1] ?? currentTab
    );
  };
  /** The tab under the finger in the marked colours, every other in the unmarked. */
  const paint = (over: HTMLElement) => {
    for (const tab of tabs()) tab.style.color = tab === over ? markedColour : unmarkedColour;
  };
  const unpaint = () => {
    for (const tab of tabs()) tab.style.color = '';
  };
  const pillTo = (left: number) => {
    pill.style.transform = `translateX(${left}px)`;
  };
  const settle = (on: HTMLElement) => {
    const from = pill.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    pillTo(on.offsetLeft);
    pill.style.width = `${on.offsetWidth}px`;
    if (prefersReducedMotion()) return;
    pill.animate(
      [{ transform: `translateX(${from}px)` }, { transform: `translateX(${on.offsetLeft}px)` }],
      motionOf('move'),
    );
  };

  const pickUp = () => {
    if (!press) return;
    press.isSliding = true;
    window.clearTimeout(press.holdTimer);
    try {
      bar.setPointerCapture(press.pointerId);
    } catch (error) {
      // The finger already lifted (the pointer is gone): there is no slide to pick up.
      console.warn('The toolbar could not hold the finger; the press is let go.', error);
      press = null;
      return;
    }
    bar.toggleAttribute('data-sliding', true);
    startSelectionTicks();
    // The pill comes to the finger, gliding there: a still hold, or a slow tap, on another tab
    // lands there, the pill seen to go from the tab it marked. The pick-up's own tick stands for
    // reaching that tab.
    const from = pill.style.transform;
    slideTo(press.startX, false);
    const to = pill.style.transform;
    if (from && from !== to && !prefersReducedMotion()) {
      pill.animate([{ transform: from }, { transform: to }], {
        ...motionOf('move'),
        duration: motionOf('leave').duration,
      });
    }
  };
  const slideTo = (clientX: number, isTicked = true) => {
    if (!press) return;
    const barLeft = bar.getBoundingClientRect().left;
    const x = clientX - barLeft;
    const all = tabs();
    const first = all[0] ?? currentTab;
    const last = all[all.length - 1] ?? currentTab;
    const width = pill.offsetWidth;
    const left = Math.min(
      last.offsetLeft + last.offsetWidth - width,
      Math.max(first.offsetLeft, x - width / 2),
    );
    pillTo(left);
    const over = tabAt(x);
    if (over === press.over) return;
    press.over = over;
    paint(over);
    if (isTicked) selectionTick();
    const name = tabName(over);
    if (name) onTabReached?.(name);
  };
  const end = (isKept: boolean) => {
    if (!press) return;
    window.clearTimeout(press.holdTimer);
    const { isSliding, over } = press;
    press = null;
    if (!isSliding) return;
    bar.toggleAttribute('data-sliding', false);
    endSelectionTicks();
    releasedAt = performance.now();
    // A question took the toolbar mid-slide (toolbar-hold.tsx): the slide is called off.
    const target = isKept && !bar.closest('[inert]') ? over : currentTab;
    const name = tabName(target);
    settle(target);
    if (!name || name === current) {
      unpaint();
      return;
    }
    // The picked tab keeps its colours until its screen takes over (the toolbar's `current`
    // changes and this slide is let go), so the move never shows the old tab marked again.
    window.clearTimeout(paintKept);
    paintKept = window.setTimeout(unpaint, PAINT_KEPT_MS);
    // The next screen's toolbar starts its pill where this one let it go.
    notePillAt(name, target.offsetLeft);
    onPick(name);
  };

  const handlePointerDown = (e: PointerEvent) => {
    // A new press: any click from here on is its own, however soon after the last release.
    releasedAt = Number.NEGATIVE_INFINITY;
    if (e.button !== 0 || press) return;
    press = {
      pointerId: e.pointerId,
      startX: e.clientX,
      holdTimer: window.setTimeout(pickUp, HOLD_MS),
      isSliding: false,
      over: currentTab,
    };
  };
  /** A finger that leaves the bar before its hold picks nothing up. */
  const abandon = () => {
    if (!press || press.isSliding) return;
    window.clearTimeout(press.holdTimer);
    press = null;
  };
  // A mouse's leaving; a finger is held by the tab it pressed, so its moves say it (below).
  const handlePointerLeave = (e: PointerEvent) => {
    if (press && e.pointerId === press.pointerId) abandon();
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.pointerId) return;
    if (!press.isSliding) {
      const box = bar.getBoundingClientRect();
      const isOnBar =
        e.clientX >= box.left &&
        e.clientX <= box.right &&
        e.clientY >= box.top &&
        e.clientY <= box.bottom;
      if (!isOnBar) {
        abandon();
        return;
      }
      if (Math.abs(e.clientX - press.startX) < DRAG_PX) return;
      pickUp();
    }
    if (e.clientY < bar.getBoundingClientRect().top - LEAVE_ABOVE_PX) {
      end(false);
      return;
    }
    slideTo(e.clientX);
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (press && e.pointerId === press.pointerId) end(true);
  };
  const handlePointerCancel = (e: PointerEvent) => {
    if (press && e.pointerId === press.pointerId) end(false);
  };
  // The click a slide's release makes (a mouse's; a finger's drag or long press makes none) is
  // the slide's, not the tab's under it. A click after the next press, or a key's later on, is a
  // tap.
  const handleClick = (e: MouseEvent) => {
    if (e.timeStamp - releasedAt > RELEASE_CLICK_MS) return;
    e.preventDefault();
    e.stopPropagation();
  };

  if (first) handlePointerDown(first);
  bar.addEventListener('pointerdown', handlePointerDown);
  bar.addEventListener('pointerleave', handlePointerLeave);
  bar.addEventListener('pointermove', handlePointerMove);
  bar.addEventListener('pointerup', handlePointerUp);
  bar.addEventListener('pointercancel', handlePointerCancel);
  bar.addEventListener('click', handleClick, true);
  return () => {
    // Let go mid-slide (the toolbar drawn for another tab, a second finger's tap): nothing of it
    // stays on the bar.
    if (press) {
      window.clearTimeout(press.holdTimer);
      if (press.isSliding) endSelectionTicks();
      press = null;
    }
    window.clearTimeout(paintKept);
    bar.toggleAttribute('data-sliding', false);
    unpaint();
    bar.removeEventListener('pointerdown', handlePointerDown);
    bar.removeEventListener('pointerleave', handlePointerLeave);
    bar.removeEventListener('pointermove', handlePointerMove);
    bar.removeEventListener('pointerup', handlePointerUp);
    bar.removeEventListener('pointercancel', handlePointerCancel);
    bar.removeEventListener('click', handleClick, true);
  };
}
