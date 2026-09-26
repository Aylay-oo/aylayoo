'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* The design's carousel engine, ported.
 *
 * It is a marquee, not a slider: the track drifts left continuously at a few dozen pixels a
 * second and the item list is rendered twice, so when the scroll position passes the width of
 * one copy it wraps back by exactly that width and the seam is invisible. The arrows step by
 * one item on top of that drift, and the drift holds off for a couple of seconds afterwards
 * so a deliberate move is not immediately fought by the animation.
 *
 * Position lives in a ref rather than React state: it changes on every animation frame, and
 * re-rendering the whole carousel 60 times a second to move one transform would be absurd.
 * React still owns the markup — what the items are, and whether the duplicate set exists.
 *
 * `isStatic` is the part that matters for a young site. When the items already fit in the
 * viewport there is nothing to scroll, so no duplicate set is rendered, no animation runs and
 * the arrows are hidden; the CSS centres the row instead. That is what keeps three guides
 * from looking like a broken marquee.
 */

type Options = {
  /** How many items React is rendering (the original set, not the duplicate). */
  itemCount: number;
  /** Pixels per second of drift. The design used 36 for the guides. */
  speed?: number;
  /** How long a manual move suppresses the drift. */
  holdMs?: number;
  /** How long an arrow step takes. */
  stepMs?: number;
};

export type FlowCarousel = {
  rootRef: React.RefObject<HTMLDivElement | null>;
  viewRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** True when everything fits: no clones, no drift, no arrows. */
  isStatic: boolean;
  next: () => void;
  prev: () => void;
  /** Handlers the carousel element spreads onto itself. */
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: (event: React.FocusEvent) => void;
    onBlur: (event: React.FocusEvent) => void;
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
  };
};

/** A drag shorter than this is a click, not a swipe. */
const SWIPE_PX = 40;

export function useFlowCarousel({
  itemCount,
  speed = 36,
  holdMs = 2500,
  stepMs = 520,
}: Options): FlowCarousel {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isStatic, setIsStatic] = useState(true);

  /* Everything the animation frame touches. Kept in one ref so the rAF loop can be set up
   * once and still see current values, without becoming a dependency of itself. */
  const anim = useRef({
    pos: 0,
    /** One item's width including its gap. */
    step: 0,
    /** The width of one copy of the item list — the wrap distance. */
    half: 0,
    /** performance.now() of the last manual move; the drift waits holdMs after it. */
    hold: 0,
    paused: false,
    isStatic: true,
    tween: null as ((now: number) => void) | null,
    swipeStart: null as number | null,
  });

  const apply = useCallback(() => {
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${-anim.current.pos}px,0,0)`;
  }, []);

  const wrap = useCallback(() => {
    const state = anim.current;
    if (state.half <= 0) return;
    while (state.pos >= state.half) state.pos -= state.half;
    while (state.pos < 0) state.pos += state.half;
  }, []);

  /** Measures one item, and decides whether the set needs scrolling at all. */
  const measure = useCallback(() => {
    const state = anim.current;
    const track = trackRef.current;
    const view = viewRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !view || !first || itemCount === 0) {
      state.step = 0;
      state.half = 0;
      return true;
    }
    const gap = parseFloat(getComputedStyle(first).marginRight) || 0;
    state.step = first.getBoundingClientRect().width + gap;
    state.half = state.step * itemCount;
    // The +2 absorbs sub-pixel rounding, so an exact fit counts as fitting.
    return state.half <= view.clientWidth + 2;
  }, [itemCount]);

  // Before paint, and whenever the item count changes: re-measure and reset to the start.
  useLayoutEffect(() => {
    const fits = measure();
    anim.current.pos = 0;
    anim.current.isStatic = fits;
    setIsStatic(fits);
    apply();
  }, [measure, apply, itemCount]);

  // Re-measure when the viewport changes: --n drops at each breakpoint, so a set that needed
  // scrolling on a phone may fit on a desktop and the other way round.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return undefined;

    const onResize = () => {
      const fits = measure();
      if (fits !== anim.current.isStatic) {
        anim.current.isStatic = fits;
        anim.current.pos = 0;
        setIsStatic(fits);
      }
      wrap();
      apply();
    };

    /* ResizeObserver catches the view changing width without the window doing so — a
     * breakpoint reflowing the card grid, or a scrollbar appearing. Guarded because an
     * environment without it should lose that refinement, not crash on render; the window
     * listener below still covers ordinary resizes. */
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    observer?.observe(view);
    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [measure, wrap, apply]);

  /** Steps by one item, in the direction given. */
  const go = useCallback((direction: 1 | -1) => {
    const state = anim.current;
    if (state.isStatic) return;
    measure();
    if (state.step <= 0) return;

    // Going left from the very start would run off the front of the track, so jump a whole
    // copy forward first — the duplicate set makes that invisible.
    if (direction < 0 && state.pos - state.step < -0.5) state.pos += state.half;

    const from = state.pos;
    const to = state.pos + direction * state.step;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = reduceMotion ? 0 : stepMs;
    const started = performance.now();
    state.hold = started;

    if (duration === 0) {
      state.pos = to;
      wrap();
      apply();
      return;
    }

    state.tween = (now: number) => {
      const k = Math.min(1, (now - started) / duration);
      // The design's ease-in-out cubic.
      const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      state.pos = from + (to - from) * eased;
      if (k >= 1) {
        state.tween = null;
        wrap();
      }
      apply();
    };
  }, [measure, wrap, apply, stepMs]);

  // The animation frame loop. Started once and left running; it does nothing while the
  // carousel is static, paused, off-screen, or the visitor prefers reduced motion.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const loop = (now: number) => {
      const state = anim.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (state.tween) {
        state.tween(now);
      } else if (
        !state.isStatic
        && !state.paused
        && !reduceMotion
        // document.hidden: a background tab should not burn frames, and coming back to a
        // carousel that raced ahead while hidden looks broken.
        && !document.hidden
        && now - state.hold > holdMs
      ) {
        state.pos += speed * dt;
        wrap();
        apply();
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [speed, holdMs, wrap, apply]);

  return {
    rootRef,
    viewRef,
    trackRef,
    isStatic,
    next: () => go(1),
    prev: () => go(-1),
    handlers: {
      onMouseEnter: () => { anim.current.paused = true; },
      onMouseLeave: () => { anim.current.paused = false; },

      onFocus: (event) => {
        const state = anim.current;
        state.paused = true;
        /* Tabbing to a card scrolls it into view, otherwise keyboard focus lands on
         * something half off the edge or behind the fade mask. */
        const track = trackRef.current;
        if (!track || state.isStatic) return;
        const item = (event.target as HTMLElement).closest('.car-track > *');
        if (!item) return;
        const index = [...track.children].indexOf(item);
        // Only the original set; a clone is inert and cannot be focused anyway.
        if (index < 0 || index >= itemCount) return;
        measure();
        state.pos = index * state.step;
        apply();
      },

      onBlur: (event) => {
        // Moving between two cards inside the carousel is not leaving it.
        const root = rootRef.current;
        if (root && root.contains(event.relatedTarget as Node | null)) return;
        anim.current.paused = false;
      },

      onPointerDown: (event) => {
        anim.current.swipeStart = Number.isFinite(event.clientX) ? event.clientX : null;
      },

      onPointerUp: (event) => {
        const start = anim.current.swipeStart;
        anim.current.swipeStart = null;
        if (start === null || !Number.isFinite(event.clientX)) return;
        if (Math.abs(event.clientX - start) <= SWIPE_PX) return;
        go(event.clientX < start ? 1 : -1);
      },
    },
  };
}
