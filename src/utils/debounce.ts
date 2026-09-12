export type Debounced<A extends unknown[]> = ((...args: A) => void) & { cancel: () => void };

/** Used for validation and layout recomputation so typing never blocks the UI. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wrapped = (...args: A): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };

  wrapped.cancel = (): void => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  return wrapped;
}
