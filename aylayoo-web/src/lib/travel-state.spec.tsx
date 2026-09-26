import { act, render } from '@testing-library/react';
import { TravelStateProvider, useTravelState } from './travel-state';

/* The map's click behaviour is three-way — select, focus, deselect — and the info card, the
 * checklist and the guide scoring all read the result, so it is pinned here rather than
 * discovered by clicking around. */

function harness() {
  const seen: { current: ReturnType<typeof useTravelState> } = { current: null as never };
  function Probe() {
    seen.current = useTravelState();
    return null;
  }
  render(
    <TravelStateProvider>
      <Probe />
    </TravelStateProvider>,
  );
  return seen;
}

describe('TravelStateProvider', () => {
  it('starts on Bayankhongor in countryside mode, like the design', () => {
    const state = harness();
    expect(state.current.selected).toEqual(['MN-069']);
    expect(state.current.activeCode).toBe('MN-069');
    expect(state.current.mode).toBe('country');
    expect(state.current.guideFilter).toBe('all');
    expect(state.current.checkedCount).toBe(0);
  });

  describe('clicking an aimag on the map', () => {
    it('selects and focuses one that was not selected', () => {
      const state = harness();
      act(() => state.current.toggleAimag('MN-041'));
      expect(state.current.selected).toEqual(['MN-069', 'MN-041']);
      expect(state.current.activeCode).toBe('MN-041');
    });

    it('focuses a selected aimag that is not the focused one', () => {
      const state = harness();
      act(() => state.current.toggleAimag('MN-041'));
      act(() => state.current.toggleAimag('MN-069'));
      // Still both selected — the click only moved the focus.
      expect(state.current.selected).toEqual(['MN-069', 'MN-041']);
      expect(state.current.activeCode).toBe('MN-069');
    });

    it('deselects only on a second click of the focused aimag', () => {
      const state = harness();
      act(() => state.current.toggleAimag('MN-041'));
      act(() => state.current.toggleAimag('MN-041'));
      expect(state.current.selected).toEqual(['MN-069']);
      // The focus falls back to the last still-selected aimag.
      expect(state.current.activeCode).toBe('MN-069');
    });

    it('leaves nothing focused when the last aimag goes', () => {
      const state = harness();
      act(() => state.current.toggleAimag('MN-069'));
      expect(state.current.selected).toEqual([]);
      expect(state.current.activeCode).toBeNull();
    });
  });

  it('selectAimag adds without disturbing the rest, and re-focuses if already there', () => {
    const state = harness();
    act(() => state.current.selectAimag('MN-041'));
    act(() => state.current.selectAimag('MN-053'));
    expect(state.current.selected).toEqual(['MN-069', 'MN-041', 'MN-053']);

    act(() => state.current.selectAimag('MN-041'));
    // No duplicate, just a new focus.
    expect(state.current.selected).toEqual(['MN-069', 'MN-041', 'MN-053']);
    expect(state.current.activeCode).toBe('MN-041');
  });

  describe('ticked places', () => {
    it('counts ticks and reports them per aimag', () => {
      const state = harness();
      act(() => state.current.selectAimag('MN-041'));
      act(() => state.current.toggleChecked('MN-041', 17));
      act(() => state.current.toggleChecked('MN-041', 18));
      act(() => state.current.toggleChecked('MN-069', 4));

      expect(state.current.checkedCount).toBe(3);
      expect(state.current.isChecked('MN-041', 17)).toBe(true);
      expect(state.current.isChecked('MN-041', 99)).toBe(false);
      expect(state.current.countCheckedIn(['MN-041'])).toBe(2);
      expect(state.current.countCheckedIn(['MN-041', 'MN-069'])).toBe(3);
      expect(state.current.countCheckedIn(['MN-053'])).toBe(0);
      expect(state.current.countCheckedIn([])).toBe(0);
    });

    it('unticks on a second tick', () => {
      const state = harness();
      act(() => state.current.toggleChecked('MN-069', 4));
      act(() => state.current.toggleChecked('MN-069', 4));
      expect(state.current.checkedCount).toBe(0);
    });

    it('does not confuse the same place id in two different aimags', () => {
      const state = harness();
      act(() => state.current.toggleChecked('MN-041', 7));
      expect(state.current.isChecked('MN-053', 7)).toBe(false);
      expect(state.current.countCheckedIn(['MN-053'])).toBe(0);
    });

    it('forgets an aimag\'s ticks when it is deselected', () => {
      // Otherwise the guide scoring keeps counting places the visitor can no longer see.
      const state = harness();
      act(() => state.current.selectAimag('MN-041'));
      act(() => state.current.toggleChecked('MN-041', 17));
      act(() => state.current.toggleChecked('MN-069', 4));
      expect(state.current.checkedCount).toBe(2);

      act(() => state.current.removeAimag('MN-041'));
      expect(state.current.checkedCount).toBe(1);
      expect(state.current.isChecked('MN-041', 17)).toBe(false);
      expect(state.current.isChecked('MN-069', 4)).toBe(true);
    });

    it('forgets them on a deselecting map click too, not just the chip\'s ✕', () => {
      const state = harness();
      act(() => state.current.toggleChecked('MN-069', 4));
      act(() => state.current.toggleAimag('MN-069'));
      expect(state.current.checkedCount).toBe(0);
    });
  });

  it('clearing drops the selection, the focus and every tick', () => {
    const state = harness();
    act(() => state.current.selectAimag('MN-041'));
    act(() => state.current.toggleChecked('MN-041', 17));
    act(() => state.current.clearAimags());

    expect(state.current.selected).toEqual([]);
    expect(state.current.activeCode).toBeNull();
    expect(state.current.checkedCount).toBe(0);
  });

  it('carries the mode and the guide filter', () => {
    const state = harness();
    act(() => state.current.setMode('city'));
    expect(state.current.mode).toBe('city');
    act(() => state.current.setGuideFilter('driver'));
    expect(state.current.guideFilter).toBe('driver');
  });
});
