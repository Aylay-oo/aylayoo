import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TeamMember } from '../../lib/api';
import { LangProvider, useLang } from '../../lib/i18n';
import type { Resource } from '../../lib/use-resource';
import { TeamSection } from './TeamSection';

/* The team comes from the API in both languages; only the portraits are local, keyed by name.
 * The case worth pinning is a member the portrait table has never heard of — someone added
 * later through the admin API must still get a drawing rather than an empty box. */

const member = (over: Partial<TeamMember> & Pick<TeamMember, 'id' | 'name'>): TeamMember => ({
  role: 'Хөгжүүлэгч', photoUrl: null, sortOrder: 1,
  nameEn: 'Member', roleEn: 'Developer',
  schoolMn: '6-р сургууль', schoolEn: 'School No. 6',
  descriptionMn: 'Тайлбар', descriptionEn: 'Description', ...over,
});

const BOLORMAA = member({
  id: 1, name: 'М. Болормаа', nameEn: 'M. Bolormaa',
  role: 'Багийн ахлагч, Full-Stack хөгжүүлэгч', roleEn: 'Team lead, Full-Stack developer',
});
/** The marketing role, which the design tinted differently. */
const KHULAN = member({
  id: 4, name: 'Б. Хулан', nameEn: 'B. Khulan',
  role: 'Маркетингийн менежер', roleEn: 'Marketing manager',
  schoolMn: 'Күнз сургууль', schoolEn: 'Confucius School',
});
/** Nobody the portrait table knows. */
const NEWCOMER = member({ id: 9, name: 'Шинэ Хүн', nameEn: 'New Person', schoolMn: null, schoolEn: null });

function resource(
  data: TeamMember[] | null,
  over: Partial<Resource<TeamMember[]>> = {},
): Resource<TeamMember[]> {
  return { data, loading: false, error: null, reload: jest.fn(), ...over };
}

function LangSwitch() {
  const { setLang } = useLang();
  return <button type="button" onClick={() => setLang('en')}>to-en</button>;
}

function setup(team: Resource<TeamMember[]>) {
  return render(
    <LangProvider>
      <LangSwitch />
      <TeamSection team={team} />
    </LangProvider>,
  );
}

const cards = () => [...document.querySelectorAll('.t-card')];

describe('the team', () => {
  it('shows each member with their school, role and description', () => {
    setup(resource([BOLORMAA, KHULAN]));
    expect(cards()).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'М. Болормаа' })).toBeTruthy();
    expect(screen.getByText('6-р сургууль')).toBeTruthy();
    expect(screen.getByText('Багийн ахлагч, Full-Stack хөгжүүлэгч')).toBeTruthy();
    expect(screen.getAllByText('Тайлбар').length).toBe(2);
  });

  it('draws a portrait for each of them', () => {
    setup(resource([BOLORMAA, KHULAN]));
    expect(document.querySelectorAll('.t-img svg')).toHaveLength(2);
  });

  it('tints the marketing role differently, as the design did', () => {
    setup(resource([BOLORMAA, KHULAN]));
    const roles = [...document.querySelectorAll('.role')];
    expect(roles[0].classList.contains('mk')).toBe(false);
    expect(roles[1].classList.contains('mk')).toBe(true);
  });

  it('still draws someone the portrait table has never heard of', () => {
    setup(resource([NEWCOMER]));
    expect(document.querySelectorAll('.t-img svg')).toHaveLength(1);
    // And with no school recorded, the design's fallback badge.
    expect(screen.getByText('Маркетинг')).toBeTruthy();
  });

  it('shows a photo instead when one has been uploaded', () => {
    setup(resource([member({ id: 2, name: 'Зурагтай', photoUrl: '/api/images/team/a.jpg' })]));
    const img = document.querySelector('.t-img img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toContain('/api/images/team/a.jpg');
    expect(document.querySelector('.t-img svg')).toBeNull();
  });

  it('switches to English, including the school and the role', () => {
    setup(resource([BOLORMAA]));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'to-en' })); });

    expect(screen.getByRole('heading', { name: 'M. Bolormaa' })).toBeTruthy();
    expect(screen.getByText('School No. 6')).toBeTruthy();
    expect(screen.getByText('Team lead, Full-Stack developer')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
  });

  describe('states', () => {
    it('shows four placeholders while loading', () => {
      setup(resource(null, { loading: true }));
      expect(cards()).toHaveLength(4);
      expect(document.querySelectorAll('.sk').length).toBeGreaterThan(0);
    });

    it('offers a retry on failure, keeping the heading', () => {
      const reload = jest.fn();
      setup(resource(null, { error: 'boom', reload }));
      expect(screen.getByRole('heading', { name: 'Манай баг' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Дахин оролдох' }));
      expect(reload).toHaveBeenCalled();
    });

    it('says so when the list comes back empty', () => {
      setup(resource([]));
      expect(screen.getByText('Багийн мэдээлэл одоохондоо алга.')).toBeTruthy();
    });
  });
});
