import { defer, filter, identity, map, Observable, startWith, Subject } from 'rxjs';

import { isNotNil } from './maybe';

const RESIZES = new Subject<ReadonlyArray<ResizeObserverEntry>>();

/**
 * Reuse a **single** observer, for (potentially actually noticeable) performance reasons.
 *
 * @see https://groups.google.com/a/chromium.org/g/blink-dev/c/z6ienONUb5A/m/F5-VcUZtBAAJ
 */
const OBSERVER = new ResizeObserver(e => RESIZES.next(e));

/**
 * Keep references to the number of subscriptions that are listening to resizes of a certain element.
 */
const OBSERVED_COUNTERS = new Map<Element, number>();

function observe(elem: Element, options: ResizeObserverOptions): void {
  /**
   * Calling `ResizeObserver#observe` multiple times on the same target (in a single instance
   * of `ResizeObserver`), doesn't actually start "observing" it more than once.
   *
   * Source: manual testing.
   */
  OBSERVER.observe(elem, options);
  OBSERVED_COUNTERS.set(elem, (OBSERVED_COUNTERS.get(elem) ?? 0) + 1);
}

/**
 * Only actually stops observing an element if there isn't any other subscription listening for its resizes.
 */
function unobserve(elem: Element): void {
  const count = Math.max(0, (OBSERVED_COUNTERS.get(elem) ?? 0) - 1);
  OBSERVED_COUNTERS.set(elem, count);

  if (count === 0) {
    OBSERVER.unobserve(elem);
  }
}

export function onResize(
  elem: Element,
  { init, ...options }: ResizeObserverOptions & { init: boolean } = { init: false },
): Observable<DOMRect> {
  // Defer actually observing the element until the returned `Observable` is subscribed to
  return defer(() => {
    observe(elem, options);

    return new Observable<DOMRect>(subscription => RESIZES.pipe(
      map(entries => entries.find(({ target }) => target === elem)),
      filter(isNotNil),
      map(({ contentRect }) => contentRect),
      init ? startWith(elem.getBoundingClientRect()) : identity,
    ).subscribe(subscription).add(() => unobserve(elem))); // add unobserving element as additional teardown logic
  });
}

/**
 * Completely tears down the mechanisms involved in this utility definitively.
 *
 * @deprecated Chances are you **never** need to call this.
 */
export function disconnect(): void {
  OBSERVER.disconnect();
  RESIZES.complete();
  RESIZES.unsubscribe();
  OBSERVED_COUNTERS.clear();
}
