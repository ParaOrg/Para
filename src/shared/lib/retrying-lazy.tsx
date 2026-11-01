import { lazy, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';

/** How long a failed fetch waits before it is asked for again. */
const RETRY_MS = 10_000;

/**
 * React.lazy that does not stay failed. React.lazy keeps its first answer for good, so a chunk
 * missed on a bad connection would stay missing until the page is reloaded. Here a failed fetch
 * draws nothing, never an error for a boundary to catch, and asks again every RETRY_MS until the
 * code comes, then draws it. `load` should fetch through retryingImport, so each ask reaches the
 * network. Made once, at module level; drawn inside a Suspense.
 */
export function retryingLazy<TProps extends object>(
  load: () => Promise<ComponentType<TProps>>,
): LazyExoticComponent<ComponentType<TProps>> {
  function StillFetching(props: TProps) {
    const [fetched, setFetched] = useState<{ component: ComponentType<TProps> } | null>(null);
    useEffect(() => {
      if (fetched) return;
      let timer = 0;
      let isGone = false;
      const ask = () => {
        load().then(
          (component) => {
            if (!isGone) setFetched({ component });
          },
          () => {
            if (!isGone) timer = window.setTimeout(ask, RETRY_MS);
          },
        );
      };
      timer = window.setTimeout(ask, RETRY_MS);
      return () => {
        isGone = true;
        window.clearTimeout(timer);
      };
    }, [fetched]);
    if (!fetched) return null;
    const Fetched = fetched.component;
    return <Fetched {...props} />;
  }
  return lazy(() =>
    load().then(
      (component) => ({ default: component }),
      (error: unknown) => {
        console.warn('A part of the page could not be fetched; it is asked for again.', error);
        return { default: StillFetching };
      },
    ),
  );
}
