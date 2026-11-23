import { useEffect, useState } from 'react';

/**
 * A callback ref whose element's height is kept in the CSS custom property `name` on the page,
 * as it changes: the stack of bars along the bottom (`--stack-room`, which contribute.css lifts the
 * map's bottom corners by) and what stands under the toolbar on Record (`--toolbar-lift`, which
 * lifts the toolbar over it). A callback ref, so an element that appears later is measured as it
 * arrives; the property goes once it does.
 */
export function useHeightVar(name: `--${string}`): (element: HTMLElement | null) => void {
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!element) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty(name, `${element.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(name);
    };
  }, [element, name]);
  return setElement;
}
