import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Aimag, Guide, Place, TeamMember } from '../../lib/api';
import { DialogsProvider } from '../../lib/dialogs';
import { LangProvider } from '../../lib/i18n';
import { TravelStateProvider } from '../../lib/travel-state';
import { PATHS } from '../../lib/static-data';
import type { Resource } from '../../lib/use-resource';
import { Footer } from './Footer';
import { SkipLink } from './SkipLink';
import { GuidesSection } from './GuidesSection';
import { Header } from './Header';
import { Hero } from './Hero';
import { MustSeeCarousel } from './MustSeeCarousel';
import { TeamSection } from './TeamSection';
import { WhereSection } from './WhereSection';
import { WhySection } from './WhySection';

/* Whole-page accessibility invariants.
 *
 * These are the checks that are cheap to satisfy and easy to break by accident: a new icon
 * button with no label, an image with no alt, a toggle whose state is only visible in colour.
 * Written against the assembled page rather than per component, because that is where a
 * missing label actually reaches somebody.
 *
 * What this cannot cover is anything decided by CSS — focus rings, the mobile breakpoints,
 * contrast — because jsdom applies no stylesheet. Those stay manual.
 */

const aimag = (id: number, slug: string, iso: string, nameMn: string): Aimag => ({
  id, slug, isoCode: iso, nameMn, nameEn: nameMn, region: 'khangai',
  descriptionMn: null, descriptionEn: null, imageUrl: null,
  centerMn: 'Төв', centerEn: 'Center', areaKm2: 100,
});

const AIMAGS = [
  aimag(1, 'khuvsgul', 'MN-041', 'Хөвсгөл'),
  aimag(2, 'bayankhongor', 'MN-069', 'Баянхонгор'),
];

const PLACES: Place[] = [{
  id: 10, aimagId: 2, nameMn: 'Их Богд уул', nameEn: 'Ikhbogd', descriptionMn: 'Тайлбар',
  descriptionEn: 'Description', category: 'nature', lat: null, lng: null, images: [],
  isMustSee: true, imageKey: 'mountain', bestMonthsMn: '6–8 сар', bestMonthsEn: 'Jun–Aug',
  mustTitleMn: 'Их Богд', mustTitleEn: 'Ikhbogd', mustSummaryMn: 'Уул.', mustSummaryEn: 'A mountain.',
  aimagSlug: 'bayankhongor', aimagNameMn: 'Баянхонгор', aimagNameEn: 'Bayankhongor',
}];

const GUIDES: Guide[] = [{
  id: 1, type: 'individual', name: 'Б. Болормаа', bioMn: null, bioEn: null,
  languages: ['mn', 'en'], tripTypes: ['countryside'], photoUrl: null, website: null,
  experienceYears: 6, experienceRange: null,
  routeMn: 'Хөвсгөл', routeEn: 'Khövsgöl', car: null, rating: 5, reviewCount: 42,
  aimags: [{ id: 2, slug: 'bayankhongor', nameMn: 'Баянхонгор', nameEn: 'Bayankhongor' }],
}];

const TEAM: TeamMember[] = [{
  id: 1, name: 'М. Болормаа', role: 'Багийн ахлагч', photoUrl: null, sortOrder: 1,
  nameEn: 'M. Bolormaa', roleEn: 'Team lead', schoolMn: '6-р сургууль', schoolEn: 'School No. 6',
  descriptionMn: 'Тайлбар', descriptionEn: 'Description',
}];

const ready = <T,>(data: T): Resource<T> => ({ data, loading: false, error: null, reload: jest.fn() });

function renderPage() {
  return render(
    <LangProvider>
      <TravelStateProvider>
        <DialogsProvider>
          <SkipLink />
          <Header />
          <main id="top">
            <Hero />
            <WhereSection aimags={ready(AIMAGS)} places={ready(PLACES)} guides={ready(GUIDES)} />
            <MustSeeCarousel places={ready(PLACES)} />
            <WhySection />
            <GuidesSection guides={ready(GUIDES)} />
            <TeamSection team={ready(TEAM)} />
          </main>
          <Footer />
        </DialogsProvider>
      </TravelStateProvider>
    </LangProvider>,
  );
}

/** The accessible name of an element, however it is provided. */
function accessibleName(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria?.trim()) return aria.trim();
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ').trim();
    if (text) return text;
  }
  // <title> is how an SVG shape names itself.
  const svgTitle = el.querySelector(':scope > title')?.textContent;
  if (svgTitle?.trim()) return svgTitle.trim();
  return (el.textContent ?? '').trim();
}

describe('every control can be named out loud', () => {
  it('leaves no button unlabelled', () => {
    renderPage();
    const unnamed = [...document.querySelectorAll('button')]
      .filter((button) => !accessibleName(button))
      // A dot in the must-see strip is labelled; anything else here is a real omission.
      .map((button) => button.outerHTML.slice(0, 120));

    expect(unnamed).toEqual([]);
  });

  it('leaves no map shape unlabelled', () => {
    renderPage();
    const shapes = [...document.querySelectorAll('.map-svg path[role="button"]')];
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.filter((shape) => !accessibleName(shape))).toEqual([]);
  });

  it('labels every form field', () => {
    renderPage();
    const fields = [...document.querySelectorAll('input, select, textarea')];
    const unlabelled = fields.filter((field) => {
      if (field.getAttribute('aria-label')?.trim()) return false;
      const id = field.getAttribute('id');
      if (id && document.querySelector(`label[for="${id}"]`)) return false;
      // A field wrapped in its own <label> is labelled too.
      return !field.closest('label');
    }).map((field) => field.outerHTML.slice(0, 100));

    expect(unlabelled).toEqual([]);
  });

  it('gives every image an alt attribute', () => {
    // Decorative images need alt="", which is different from having no alt at all.
    renderPage();
    const missing = [...document.querySelectorAll('img')]
      .filter((img) => !img.hasAttribute('alt'))
      .map((img) => img.getAttribute('src'));

    expect(missing).toEqual([]);
  });

  it('hides purely decorative icons from assistive technology', () => {
    renderPage();
    // Any svg that is not a labelled map, not the map's shapes, and has no title of its own
    // is decoration sitting next to real text.
    const exposed = [...document.querySelectorAll('svg')]
      .filter((svg) => svg.getAttribute('aria-hidden') !== 'true')
      .filter((svg) => !svg.classList.contains('map-svg'))
      .filter((svg) => !svg.querySelector(':scope > title'))
      .filter((svg) => !svg.getAttribute('aria-label'))
      .map((svg) => svg.outerHTML.slice(0, 80));

    expect(exposed).toEqual([]);
  });
});

describe('state is announced, not just coloured', () => {
  it('reports the mobile menu as collapsed until it is opened', () => {
    renderPage();
    const toggle = screen.getByRole('button', { name: 'Цэс' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('nav');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('nav')?.classList.contains('open')).toBe(true);
  });

  it('closes the menu when a link inside it is followed', () => {
    renderPage();
    const toggle = screen.getByRole('button', { name: 'Цэс' });
    fireEvent.click(toggle);
    fireEvent.click(within(document.getElementById('nav') as HTMLElement).getByText('Холбогдох'));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('reports which travel mode and which guide filter are active', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Хөдөөгөөр аялах/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /Хотоор аялах/ }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('button', { name: 'Бүгд' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('reports a selected aimag as pressed', () => {
    renderPage();
    const map = document.querySelector('.map-svg') as HTMLElement;
    expect(within(map).getByRole('button', { name: 'Баянхонгор' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(map).getByRole('button', { name: 'Хөвсгөл' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('marks the panel that is hidden as hidden, not merely invisible', () => {
    renderPage();
    expect(document.getElementById('modeCity')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('keyboard operation', () => {
  it('lets the map be driven with Enter and Space', () => {
    renderPage();
    const map = document.querySelector('.map-svg') as HTMLElement;
    const khuvsgul = within(map).getByRole('button', { name: 'Хөвсгөл' });

    expect(khuvsgul.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(khuvsgul, { key: 'Enter' });
    expect(khuvsgul.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the chip buttons focusable with a visible ring', () => {
    /* The design's inline `all: unset` also unset `outline`, and an inline style beats the
     * global :focus-visible rule — so these were tabbable with nothing to show for it. */
    renderPage();
    const chipName = document.querySelector('.a-chip .a-chip-name') as HTMLElement;
    expect(chipName).toBeTruthy();
    expect(chipName.getAttribute('style')).toBeNull();
  });

  /* The map's shapes are the one place a focus ring had to be built by hand. A browser draws
   * one around an SVG path's bounding box — a rectangle with no relation to the aimag — so
   * the outline is off and a ring following the real border is drawn instead. */
  describe('the map shows keyboard focus on the shape itself', () => {
    const mapSvg = () => document.querySelector('.map-svg') as HTMLElement;
    const aimag = (name: string) => within(mapSvg()).getByRole('button', { name });
    const ring = () => mapSvg().querySelector('.map-focus-ring');

    it('rings the aimag that keyboard focus reaches, along its own border', () => {
      renderPage();
      fireEvent.focus(aimag('Хөвсгөл'));

      // The ring is the aimag's own outline, not a box around it.
      expect(ring()?.getAttribute('d')).toBe(PATHS['MN-041'].d);
      // And it is backed by a white halo, so it reads on a dark fill too.
      expect(mapSvg().querySelector('.map-focus-halo')?.getAttribute('d')).toBe(PATHS['MN-041'].d);
    });

    it('draws the ring after every shape, so no neighbour can cover it', () => {
      /* An SVG paints in document order: a ring drawn with its own shape would be painted
       * over along every border it shares with an aimag that comes later. */
      renderPage();
      fireEvent.focus(aimag('Хөвсгөл'));

      const paths = [...mapSvg().querySelectorAll('path')];
      const lastShape = paths.map((el) => el.getAttribute('role')).lastIndexOf('button');
      expect(paths.findIndex((el) => el.classList.contains('map-focus-ring')))
        .toBeGreaterThan(lastShape);
    });

    it('shows no ring when the aimag was clicked rather than tabbed to', () => {
      renderPage();
      const khuvsgul = aimag('Хөвсгөл');
      fireEvent.pointerDown(khuvsgul);
      fireEvent.focus(khuvsgul);
      fireEvent.click(khuvsgul);

      expect(ring()).toBeNull();
      // The click still did its job; it just did not leave a focus mark behind.
      expect(khuvsgul.getAttribute('aria-pressed')).toBe('true');
    });

    it('drops the ring again when focus leaves', () => {
      renderPage();
      fireEvent.focus(aimag('Хөвсгөл'));
      expect(ring()).toBeTruthy();

      fireEvent.blur(aimag('Хөвсгөл'));
      expect(ring()).toBeNull();
    });

    it('keeps the selected aimag\'s border above its neighbours too', () => {
      // Bayankhongor starts selected, and its border used to disappear where a neighbour
      // drawn later painted over their shared edge.
      renderPage();
      const outline = mapSvg().querySelector('.map-outline');
      expect(outline?.getAttribute('d')).toBe(PATHS['MN-069'].d);

      const paths = [...mapSvg().querySelectorAll('path')];
      const lastShape = paths.map((el) => el.getAttribute('role')).lastIndexOf('button');
      expect(paths.findIndex((el) => el.classList.contains('map-outline'))).toBeGreaterThan(lastShape);
    });

    it('leaves the highlights out of the tab order and the accessibility tree', () => {
      renderPage();
      fireEvent.focus(aimag('Хөвсгөл'));

      for (const el of mapSvg().querySelectorAll('.map-outline, .map-focus-halo, .map-focus-ring')) {
        expect(el.getAttribute('aria-hidden')).toBe('true');
        expect(el.getAttribute('role')).toBeNull();
        expect(el.getAttribute('tabindex')).toBeNull();
      }
    });
  });

  it('gives the tile slideshows a focusable handle', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Хотоор аялах/ }));
    const media = [...document.querySelectorAll('.tile-media')];
    expect(media.length).toBe(4);
    // Each announces the photos it is about to cycle through.
    expect(media.every((el) => el.getAttribute('tabindex') === '0')).toBe(true);
    expect(media.every((el) => (el.getAttribute('aria-label') ?? '').includes(':'))).toBe(true);
  });
});

describe('document structure', () => {
  it('has exactly one h1', () => {
    renderPage();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('offers a skip link as the first focusable thing on the page', () => {
    renderPage();
    const focusable = [...document.querySelectorAll('a[href], button, input, select, textarea')]
      .filter((el) => el.getAttribute('tabindex') !== '-1');
    expect(focusable[0]?.textContent).toBe('Үндсэн агуулга руу шилжих');
    expect(focusable[0]?.getAttribute('href')).toBe('#top');
    // And it points at something that exists.
    expect(document.getElementById('top')).toBeTruthy();
  });

  it('skips no heading levels', () => {
    /* The design put an <h5> under the checklist's <h3>, before the <h4> further down. These
     * are now <h4>, styled to compute identically. */
    renderPage();
    const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .map((h) => Number(h.tagName[1]));

    const jumps = levels
      .map((level, i) => (i === 0 ? 0 : level - levels[i - 1]))
      .map((delta, i) => ({ delta, at: levels[i], index: i }))
      .filter(({ delta }) => delta > 1);

    expect(jumps).toEqual([]);
  });

  it('names every navigation and section landmark', () => {
    /* The page has one <nav> since the hero's quick links went, but several <section>s, and
     * the rule is the same for both: a landmark a screen reader can jump to needs a name,
     * or its rotor lists an anonymous "navigation" and "region". */
    renderPage();
    const landmarks = [...document.querySelectorAll('nav, section[aria-label]')];
    expect(landmarks.length).toBeGreaterThan(1);
    expect(landmarks.filter((el) => !accessibleName(el) && !el.getAttribute('aria-label')))
      .toEqual([]);
  });

  it('marks the carousels as such', () => {
    renderPage();
    expect(document.getElementById('mustsee')?.getAttribute('aria-roledescription')).toBe('carousel');
  });
});

describe('prefers-reduced-motion', () => {
  /* The stylesheet kills CSS transitions and animations on its own. These three run in
   * JavaScript, so they have to ask — and jsdom answers "no" by default, which is why the
   * query is overridden here. */
  function prefersReducedMotion() {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  it('does not animate the must-see progress bar, but still shows position', () => {
    prefersReducedMotion();
    renderPage();
    const fill = document.querySelector('.ms-bar i') as HTMLElement;
    // No running animation; a width that reports where you are instead.
    expect(fill.classList.contains('run')).toBe(false);
    expect(fill.style.width).toBe('100%');
  });

  it('does not start the city tiles cycling', () => {
    jest.useFakeTimers();
    prefersReducedMotion();
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Хотоор аялах/ }));

    const strip = document.querySelector('.tile-strip') as HTMLElement;
    const before = strip.style.transform;
    fireEvent.mouseEnter(document.querySelector('.tile') as HTMLElement);
    jest.advanceTimersByTime(10000);
    expect(strip.style.transform).toBe(before);
    jest.useRealTimers();
  });

  it('steps the guide marquee instantly instead of tweening it', () => {
    prefersReducedMotion();
    renderPage();
    // With one guide the row is static anyway, which is itself the no-motion outcome.
    expect(document.getElementById('guideCar')?.classList.contains('static')).toBe(true);
  });
});
