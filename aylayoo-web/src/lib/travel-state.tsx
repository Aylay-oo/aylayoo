'use client';

import {
  createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode,
} from 'react';

/* The state the design kept in module-level variables — `selectedSet`, `activeCode` and
 * `checked` — shared here through context because several sections read and write it:
 *
 *   hero search      → sets the mode, selects an aimag, or filters the guides
 *   map              → toggles the selection
 *   info card        → focuses or removes one aimag
 *   checklist        → ticks places, which re-scores the recommended guides
 *   must-see button  → jumps to the map with that aimag selected
 *   nav / footer     → switch mode, filter the guides
 *
 * Aimags are addressed by ISO code (MN-041) throughout, because that is what the map's
 * shapes are keyed by; ISO_TO_SLUG in static-data.ts converts when the API needs a slug.
 *
 * The selection, the focused aimag and the ticked places move together in one reducer:
 * deselecting an aimag has to untick its places and possibly move the focus, and doing that
 * across separate setState calls leaves the three briefly disagreeing — which the guide
 * scoring would read and mis-rank.
 */

export type TravelMode = 'country' | 'city';
export type GuideFilter = 'all' | 'guide' | 'driver' | 'company';

/** The aimag the design starts on: Bayankhongor. */
const INITIAL_CODE = 'MN-069';

/* Ticked places are keyed "MN-041:17" — ISO code, then place id. The prefix is what makes
 * "forget everything in this aimag" and "how many ticks does this guide cover" one-liners,
 * which is why the design keyed them this way too. */
type CheckKey = `${string}:${number}`;

const keyOf = (code: string, placeId: number): CheckKey => `${code}:${placeId}`;
const codeOf = (key: string): string => key.slice(0, key.lastIndexOf(':'));

type State = {
  selected: readonly string[];
  activeCode: string | null;
  checked: ReadonlySet<CheckKey>;
};

type Action =
  | { type: 'toggleAimag'; code: string }
  | { type: 'selectAimag'; code: string }
  | { type: 'removeAimag'; code: string }
  | { type: 'focusAimag'; code: string }
  | { type: 'clear' }
  | { type: 'toggleChecked'; code: string; placeId: number };

/** Drops the aimag, its ticks, and moves the focus off it the way the design did. */
function withoutAimag(state: State, code: string): State {
  const selected = state.selected.filter((c) => c !== code);
  const checked = new Set([...state.checked].filter((key) => codeOf(key) !== code));
  return {
    selected,
    // The design fell back to the last still-selected aimag, or to nothing.
    activeCode: state.activeCode === code ? selected[selected.length - 1] ?? null : state.activeCode,
    checked,
  };
}

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'toggleAimag': {
      if (!state.selected.includes(action.code)) {
        return { ...state, selected: [...state.selected, action.code], activeCode: action.code };
      }
      // Already selected: the first click focuses it, a second click on the focused one
      // removes it.
      if (state.activeCode !== action.code) return { ...state, activeCode: action.code };
      return withoutAimag(state, action.code);
    }

    case 'selectAimag':
      return state.selected.includes(action.code)
        ? { ...state, activeCode: action.code }
        : { ...state, selected: [...state.selected, action.code], activeCode: action.code };

    case 'removeAimag':
      return withoutAimag(state, action.code);

    case 'focusAimag':
      return { ...state, activeCode: action.code };

    case 'clear':
      return { selected: [], activeCode: null, checked: new Set() };

    case 'toggleChecked': {
      const key = keyOf(action.code, action.placeId);
      const checked = new Set(state.checked);
      if (checked.has(key)) checked.delete(key);
      else checked.add(key);
      return { ...state, checked };
    }
  }
}

type TravelStateValue = {
  mode: TravelMode;
  setMode: (mode: TravelMode) => void;

  /** Every aimag currently selected on the map, in the order they were picked. */
  selected: readonly string[];
  /** Which of them the info card is showing, or null when nothing is selected. */
  activeCode: string | null;
  isSelected: (code: string) => boolean;

  /** Map click: select, or focus if already selected, or deselect if already focused. */
  toggleAimag: (code: string) => void;
  /** Select an aimag and show it, leaving the rest of the selection alone. */
  selectAimag: (code: string) => void;
  removeAimag: (code: string) => void;
  focusAimag: (code: string) => void;
  clearAimags: () => void;

  isChecked: (code: string, placeId: number) => boolean;
  toggleChecked: (code: string, placeId: number) => void;
  checkedCount: number;
  /** How many ticked places sit in any of these aimags — the guide scoring's second term. */
  countCheckedIn: (codes: readonly string[]) => number;

  guideFilter: GuideFilter;
  setGuideFilter: (filter: GuideFilter) => void;
};

const TravelStateContext = createContext<TravelStateValue | null>(null);

export function TravelStateProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TravelMode>('country');
  const [guideFilter, setGuideFilter] = useState<GuideFilter>('all');
  const [state, dispatch] = useReducer(reduce, {
    selected: [INITIAL_CODE],
    activeCode: INITIAL_CODE,
    checked: new Set<CheckKey>(),
  });

  const { selected, activeCode, checked } = state;

  const countCheckedIn = useCallback((codes: readonly string[]) => {
    if (codes.length === 0) return 0;
    const wanted = new Set(codes);
    let n = 0;
    for (const key of checked) if (wanted.has(codeOf(key))) n += 1;
    return n;
  }, [checked]);

  const value = useMemo<TravelStateValue>(() => ({
    mode,
    setMode,
    selected,
    activeCode,
    isSelected: (code) => selected.includes(code),
    toggleAimag: (code) => dispatch({ type: 'toggleAimag', code }),
    selectAimag: (code) => dispatch({ type: 'selectAimag', code }),
    removeAimag: (code) => dispatch({ type: 'removeAimag', code }),
    focusAimag: (code) => dispatch({ type: 'focusAimag', code }),
    clearAimags: () => dispatch({ type: 'clear' }),
    isChecked: (code, placeId) => checked.has(keyOf(code, placeId)),
    toggleChecked: (code, placeId) => dispatch({ type: 'toggleChecked', code, placeId }),
    checkedCount: checked.size,
    countCheckedIn,
    guideFilter,
    setGuideFilter,
  }), [mode, selected, activeCode, checked, guideFilter, countCheckedIn]);

  return <TravelStateContext.Provider value={value}>{children}</TravelStateContext.Provider>;
}

export function useTravelState(): TravelStateValue {
  const ctx = useContext(TravelStateContext);
  if (!ctx) throw new Error('useTravelState must be used inside <TravelStateProvider>');
  return ctx;
}
