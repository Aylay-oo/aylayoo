/* Test environment gaps and per-test cleanup.
 *
 * jsdom does not implement window.matchMedia, and several components ask it whether the
 * device has hover and whether the visitor prefers reduced motion — the city tiles' hover
 * slideshow, the carousels and the must-see autoplay. Without this they throw on render.
 *
 * The stub answers "no" to everything, which is the honest default for a headless
 * environment: a device with hover, no reduced-motion preference. A test that needs the
 * other answer overrides it per case.
 */

/* The language choice is stored in localStorage and jsdom keeps it for the whole test file,
 * so one test switching to English silently left every test after it in English — which is
 * exactly the persistence the feature wants, and exactly the wrong starting point for the
 * next test. */
beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // A jsdom without storage is fine; nothing to clear.
  }
});
/* jsdom has no ResizeObserver either. The carousel guards against its absence, so this is
 * not needed to avoid a crash — it is here so a test can exercise the observer path, and so
 * a component that forgets to guard fails loudly in review rather than silently in a browser
 * that does have it. */
if (!('ResizeObserver' in window)) {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: class {
      observe() { /* layout never changes on its own in jsdom */ }
      unobserve() { /* no-op */ }
      disconnect() { /* no-op */ }
    },
  });
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined, // deprecated, but some libraries still call it
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
