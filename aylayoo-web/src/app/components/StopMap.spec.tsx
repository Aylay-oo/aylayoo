import { render, screen } from '@testing-library/react';
import type { CityStop } from '../../lib/api';
import { LangProvider } from '../../lib/i18n';
import { StopList } from './StopList';
import { StopMap, VIEW, projectStops } from './StopMap';

/* The projected route map.
 *
 * Worth its own spec because the geometry is the whole feature and it is silent when wrong: a
 * map that squashes a route, or quietly drops the stops that have coordinates, still renders a
 * plausible-looking picture. The numbering matters as much — a stop is numbered by its place in
 * the whole route, so stop 3 reads "3" on the map even when stop 2 could not be plotted.
 */

const stop = (overrides: Partial<CityStop> = {}): CityStop => ({
  placeMn: 'Гандан',
  placeEn: 'Gandan',
  timeOfDay: null,
  noteMn: null,
  noteEn: null,
  lat: null,
  lng: null,
  ...overrides,
});

const inside = (v: number, min: number, max: number) => v >= min - 0.01 && v <= max + 0.01;

describe('projectStops', () => {
  it('plots nothing when no stop has coordinates', () => {
    expect(projectStops([stop(), stop()])).toEqual([]);
  });

  it('ignores a stop carrying only half a coordinate', () => {
    // The API refuses this, but a row written by hand could hold it.
    expect(projectStops([stop({ lat: 47.9 }), stop({ lng: 106.9 })])).toEqual([]);
  });

  it('puts a lone stop in the middle of the frame', () => {
    const [only] = projectStops([stop({ lat: 47.92, lng: 106.89 })]);
    expect(only.x).toBeCloseTo(VIEW.w / 2);
    expect(only.y).toBeCloseTo(VIEW.h / 2);
  });

  it('keeps every point inside the frame', () => {
    const plotted = projectStops([
      stop({ lat: 47.9212, lng: 106.8944 }),
      stop({ lat: 47.9185, lng: 106.9175 }),
      stop({ lat: 47.8866, lng: 106.91 }),
    ]);

    expect(plotted).toHaveLength(3);
    for (const p of plotted) {
      expect(inside(p.x, 0, VIEW.w)).toBe(true);
      expect(inside(p.y, 0, VIEW.h)).toBe(true);
    }
  });

  it('puts north at the top, because SVG y grows the other way', () => {
    const [north, south] = projectStops([
      stop({ lat: 47.95, lng: 106.9 }),
      stop({ lat: 47.85, lng: 106.9 }),
    ]);
    expect(north.y).toBeLessThan(south.y);
  });

  it('puts east to the right', () => {
    const [west, east] = projectStops([
      stop({ lat: 47.9, lng: 106.8 }),
      stop({ lat: 47.9, lng: 107.0 }),
    ]);
    expect(west.x).toBeLessThan(east.x);
  });

  it('scales both axes together, so the route is not distorted', () => {
    /* A square in real distance must come out square on screen. One degree of latitude is
     * about 1/cos(48°) ≈ 1.49 degrees of longitude here, so a "square" spans 1.49× more
     * longitude than latitude — and should still plot as a square. */
    const squash = Math.cos(47.9 * (Math.PI / 180));
    const plotted = projectStops([
      stop({ lat: 47.90, lng: 106.90 }),
      stop({ lat: 47.90, lng: 106.90 + 0.05 / squash }),
      stop({ lat: 47.95, lng: 106.90 + 0.05 / squash }),
      stop({ lat: 47.95, lng: 106.90 }),
    ]);

    const width = plotted[1].x - plotted[0].x;
    const height = plotted[0].y - plotted[3].y;
    expect(width / height).toBeCloseTo(1, 1);
  });

  it('numbers a plotted stop by its place in the whole route', () => {
    // Stop 2 has no coordinates, so the map shows 1 and 3 — matching StopList's numbering.
    const plotted = projectStops([
      stop({ lat: 47.92, lng: 106.89 }),
      stop(),
      stop({ lat: 47.89, lng: 106.91 }),
    ]);
    expect(plotted.map((p) => p.label)).toEqual([1, 3]);
  });

  it('survives a route that runs due east, which has no latitude span', () => {
    const plotted = projectStops([
      stop({ lat: 47.9, lng: 106.8 }),
      stop({ lat: 47.9, lng: 107.0 }),
    ]);
    for (const p of plotted) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

const renderWith = (ui: React.ReactNode) => render(<LangProvider>{ui}</LangProvider>);

describe('StopMap', () => {
  it('renders nothing at all without coordinates', () => {
    const { container } = renderWith(<StopMap stops={[stop(), stop()]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('hides the picture from assistive technology', () => {
    // The ordered list beside it is the content; reading the route twice is the bug here.
    const { container } = renderWith(
      <StopMap stops={[stop({ lat: 47.92, lng: 106.89 }), stop({ lat: 47.89, lng: 106.91 })]} />,
    );
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws no line for a single stop', () => {
    const { container } = renderWith(<StopMap stops={[stop({ lat: 47.92, lng: 106.89 })]} />);
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('says so when it is showing fewer stops than the route has', () => {
    renderWith(
      <StopMap stops={[stop({ lat: 47.92, lng: 106.89 }), stop(), stop()]} />,
    );
    expect(screen.getByText('1/3 зогсоол зураг дээр')).toBeTruthy();
  });
});

describe('StopList', () => {
  it('says so when a route has no stops', () => {
    renderWith(<StopList stops={[]} />);
    expect(screen.getByText('Зогсоол бүртгэгдээгүй байна.')).toBeTruthy();
  });

  it('numbers the stops in order and shows the time of day', () => {
    renderWith(
      <StopList
        stops={[
          stop({ placeMn: 'Гандан', timeOfDay: 'morning' }),
          stop({ placeMn: 'Зайсан', timeOfDay: 'evening', noteMn: 'Нар шингэх үед' }),
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Гандан');
    expect(items[0].textContent).toContain('Өглөө');
    expect(items[1].textContent).toContain('Нар шингэх үед');
  });

  it('is an ordered list, because the order is the route', () => {
    const { container } = renderWith(<StopList stops={[stop()]} />);
    expect(container.querySelector('ol')).toBeTruthy();
  });
});
