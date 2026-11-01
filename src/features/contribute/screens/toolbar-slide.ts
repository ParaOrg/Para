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
  let swallowClick = false;

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
    bar.setPointerCapture(press.pointerId);
    startSelectionTicks();
  };
  const slideTo = (clientX: number) => {
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
    selectionTick();
    const name = tabName(over);
    if (name) onTabReached?.(name);
  };
  const end = (isKept: boolean) => {
    if (!press) return;
    window.clearTimeout(press.holdTimer);
    const { isSliding, over } = press;
    press = null;
    if (!isSliding) return;
    endSelectionTicks();
    swallowClick = true;
    const target = isKept ? over : currentTab;
    const name = tabName(target);
    settle(target);
    unpaint();
    if (!name || name === current) return;
    // The next screen's toolbar starts its pill where this one let it go.
    notePillAt(name, target.offsetLeft);
    onPick(name);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || press) return;
    press = {
      pointerId: e.pointerId,
      startX: e.clientX,
      holdTimer: window.setTimeout(pickUp, HOLD_MS),
      isSliding: false,
      over: currentTab,
    };
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!press || e.pointerId !== press.pointerId) return;
    if (!press.isSliding) {
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
  // The click a slide's release makes is the slide's, not the tab's under the finger.
  const handleClick = (e: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  if (first) handlePointerDown(first);
  bar.addEventListener('pointerdown', handlePointerDown);
  bar.addEventListener('pointermove', handlePointerMove);
  bar.addEventListener('pointerup', handlePointerUp);
  bar.addEventListener('pointercancel', handlePointerCancel);
  bar.addEventListener('click', handleClick, true);
  return () => {
    if (press) window.clearTimeout(press.holdTimer);
    bar.removeEventListener('pointerdown', handlePointerDown);
    bar.removeEventListener('pointermove', handlePointerMove);
    bar.removeEventListener('pointerup', handlePointerUp);
    bar.removeEventListener('pointercancel', handlePointerCancel);
    bar.removeEventListener('click', handleClick, true);
  };
}
