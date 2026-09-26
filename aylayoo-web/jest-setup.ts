/* Test environment gaps.
 *
 * jsdom does not implement window.matchMedia, and several components ask it whether the
 * device has hover and whether the visitor prefers reduced motion — the city tiles' hover
 * slideshow, the carousels and the must-see autoplay. Without this they throw on render.
 *
 * The stub answers "no" to everything, which is the honest default for a headless
 * environment: a device with hover, no reduced-motion preference. A test that needs the
 * other answer overrides it per case.
 */
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
