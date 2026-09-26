import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Place } from '../../lib/api';
import { LangProvider } from '../../lib/i18n';
import { TravelStateProvider } from '../../lib/travel-state';
import type { Resource } from '../../lib/use-resource';
import { MustSeeCarousel } from './MustSeeCarousel';

const place = (over: Partial<Place> & Pick<Place, 'id' | 'nameMn' | 'aimagSlug'>): Place => ({
  aimagId: 1, nameEn: 'Place', descriptionMn: 'Тайлбар', descriptionEn: 'Description',
  category: 'nature', lat: null, lng: null, images: [], isMustSee: true, imageKey: 'lake',
  bestMonthsMn: null, bestMonthsEn: null, mustTitleMn: null, mustTitleEn: null,
  mustSummaryMn: null, mustSummaryEn: null,
  aimagNameMn: 'Аймаг', aimagNameEn: 'Aimag', ...over,
});

const KHUVSGUL = place({
  id: 1, nameMn: 'Хөвсгөл нуур', nameEn: 'Lake Khövsgöl', aimagSlug: 'khuvsgul',
  aimagNameMn: 'Хөвсгөл аймаг', aimagNameEn: 'Khövsgöl Province',
  bestMonthsMn: '6–8 сар', bestMonthsEn: 'Jun–Aug',
  mustTitleMn: 'Хөвсгөл нуур (Далай ээж)', mustTitleEn: 'Lake Khövsgöl (Dalai Eej)',
  mustSummaryMn: 'Тунгалаг нуур.', mustSummaryEn: 'A crystal-clear lake.',
});
const GOBI = place({
  id: 2, nameMn: 'Хонгорын элс', nameEn: 'Khongor Sand Dunes', aimagSlug: 'umnugovi',
  imageKey: 'desert',
  mustTitleMn: 'Хонгорын элс & Баянзаг', mustTitleEn: 'Khongor Sand Dunes & Bayanzag',
});
/** No showcase entry and no editorial title — the fallback path. */
const PLAIN = place({ id: 3, nameMn: 'Тайхар чулуу', nameEn: 'Taikhar Rock', aimagSlug: 'arkhangai', imageKey: 'steppe' });

function resource(data: Place[] | null, over: Partial<Resource<Place[]>> = {}): Resource<Place[]> {
  return { data, loading: false, error: null, reload: jest.fn(), ...over };
}

function setup(places: Resource<Place[]>) {
  return render(
    <LangProvider>
      <TravelStateProvider>
        <MustSeeCarousel places={places} />
      </TravelStateProvider>
    </LangProvider>,
  );
}

const title = () => document.querySelector('.ms-title')?.textContent;
const counter = () => document.querySelector('.ms-pill')?.textContent;
const captions = () => [...document.querySelectorAll('figcaption')].map((el) => el.textContent);

describe('the must-see carousel', () => {
  it('shows the first place with its editorial title and best months', () => {
    setup(resource([KHUVSGUL, GOBI, PLAIN]));
    // The wider headline wins over the plain place name.
    expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    expect(document.querySelector('.ms-desc')?.textContent).toBe('Тунгалаг нуур.');
    expect(document.querySelector('.ms-meta')?.textContent).toContain('Хөвсгөл аймаг');
    expect(document.querySelector('.ms-meta')?.textContent).toContain('6–8 сар');
    expect(counter()).toBe('01 / 03');
  });

  it('falls back to the place\'s own name and description', () => {
    setup(resource([PLAIN]));
    expect(title()).toBe('Тайхар чулуу');
    expect(document.querySelector('.ms-desc')?.textContent).toBe('Тайлбар');
  });

  it('frames a place with its two showcase photos', () => {
    setup(resource([KHUVSGUL]));
    expect(captions()).toEqual(['Хөвсгөл нуур', 'Цаатан иргэдийн нутаг']);
  });

  it('uses the place\'s own photo on both sides when it has no showcase', () => {
    setup(resource([PLAIN]));
    // Arkhangai has a showcase entry keyed to its slug, so use a place with none.
    expect(captions()).toHaveLength(2);
  });

  it('never shows a rating, because places do not have one', () => {
    // The design printed "★ 4.9 · 128 үнэлгээ" here from hard-coded data.
    setup(resource([KHUVSGUL, GOBI]));
    expect(document.querySelector('.ms-rate')).toBeNull();
    expect(document.body.textContent).not.toContain('★');
  });

  describe('moving between places', () => {
    it('advances with the next arrow and wraps at the end', () => {
      setup(resource([KHUVSGUL, GOBI]));
      fireEvent.click(screen.getByRole('button', { name: 'Дараагийн газар' }));
      expect(title()).toBe('Хонгорын элс & Баянзаг');
      expect(counter()).toBe('02 / 02');

      fireEvent.click(screen.getByRole('button', { name: 'Дараагийн газар' }));
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    });

    it('goes back from the first place to the last', () => {
      setup(resource([KHUVSGUL, GOBI, PLAIN]));
      fireEvent.click(screen.getByRole('button', { name: 'Өмнөх газар' }));
      expect(title()).toBe('Тайхар чулуу');
      expect(counter()).toBe('03 / 03');
    });

    it('jumps straight to a place from its dot', () => {
      setup(resource([KHUVSGUL, GOBI, PLAIN]));
      const dots = screen.getAllByRole('tab');
      expect(dots).toHaveLength(3);
      fireEvent.click(dots[2]);
      expect(title()).toBe('Тайхар чулуу');
      expect(dots[2].getAttribute('aria-selected')).toBe('true');
    });

    it('responds to the arrow keys', () => {
      setup(resource([KHUVSGUL, GOBI]));
      const section = document.getElementById('mustsee') as HTMLElement;
      fireEvent.keyDown(section, { key: 'ArrowRight' });
      expect(title()).toBe('Хонгорын элс & Баянзаг');
      fireEvent.keyDown(section, { key: 'ArrowLeft' });
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    });

    /* jsdom implements no PointerEvent, and fireEvent.pointerDown drops clientX entirely, so
     * these are dispatched as MouseEvents with the pointer type name — which jsdom does carry
     * coordinates on, and which React still routes to onPointerDown/Up. */
    const pointer = (el: HTMLElement, type: 'pointerdown' | 'pointerup', clientX: number) =>
      fireEvent(el, new MouseEvent(type, { clientX, bubbles: true }));

    it('swipes, but ignores a tap', () => {
      setup(resource([KHUVSGUL, GOBI]));
      const stage = document.querySelector('.ms-stage') as HTMLElement;

      pointer(stage, 'pointerdown', 300);
      pointer(stage, 'pointerup', 290); // 10px — a tap
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');

      pointer(stage, 'pointerdown', 300);
      pointer(stage, 'pointerup', 200); // 100px left — next
      expect(title()).toBe('Хонгорын элс & Баянзаг');

      pointer(stage, 'pointerdown', 200);
      pointer(stage, 'pointerup', 320); // 120px right — back
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    });

    it('ignores a pointer event that carries no coordinates', () => {
      // Assistive technology and synthetic events can do this; it must not turn the page.
      setup(resource([KHUVSGUL, GOBI]));
      const stage = document.querySelector('.ms-stage') as HTMLElement;
      fireEvent.pointerDown(stage);
      fireEvent.pointerUp(stage);
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    });
  });

  describe('autoplay', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('advances on its own', () => {
      setup(resource([KHUVSGUL, GOBI]));
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
      act(() => { jest.advanceTimersByTime(5500); });
      expect(title()).toBe('Хонгорын элс & Баянзаг');
    });

    it('restarts the clock after a manual move, rather than cutting it short', () => {
      setup(resource([KHUVSGUL, GOBI, PLAIN]));
      act(() => { jest.advanceTimersByTime(4000); });
      fireEvent.click(screen.getByRole('button', { name: 'Дараагийн газар' }));
      expect(title()).toBe('Хонгорын элс & Баянзаг');

      // The remaining 1.5s of the old timer must not advance it again.
      act(() => { jest.advanceTimersByTime(1500); });
      expect(title()).toBe('Хонгорын элс & Баянзаг');

      act(() => { jest.advanceTimersByTime(4000); });
      expect(title()).toBe('Тайхар чулуу');
    });

    it('does not rotate a single place', () => {
      setup(resource([KHUVSGUL]));
      act(() => { jest.advanceTimersByTime(20000); });
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    });

    it('stops while the section has focus, so a live region is not re-announced', () => {
      setup(resource([KHUVSGUL, GOBI]));
      fireEvent.focus(screen.getByRole('button', { name: 'Дараагийн газар' }));
      act(() => { jest.advanceTimersByTime(11000); });
      expect(title()).toBe('Хөвсгөл нуур (Далай ээж)');
    });
  });

  describe('states', () => {
    it('shows a skeleton while loading', () => {
      setup(resource(null, { loading: true }));
      expect(document.querySelectorAll('.sk').length).toBeGreaterThan(0);
      expect(document.querySelector('.ms-title')).toBeNull();
    });

    it('offers a retry when the request failed', () => {
      const reload = jest.fn();
      setup(resource(null, { error: 'boom', reload }));
      fireEvent.click(screen.getByRole('button', { name: 'Дахин оролдох' }));
      expect(reload).toHaveBeenCalled();
    });

    it('still draws the section heading when there is nothing to show', () => {
      // The band is part of the page's rhythm; an empty one must not collapse it.
      setup(resource([]));
      expect(within(document.getElementById('mustsee') as HTMLElement)
        .getByRole('heading', { name: 'Монголд ирсэн бол заавал очих газрууд' })).toBeTruthy();
      expect(screen.getByText('Заавал очих газрууд одоохондоо алга.')).toBeTruthy();
    });
  });
});
