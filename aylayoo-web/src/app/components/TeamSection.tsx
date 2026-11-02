'use client';

import Image from 'next/image';
import { imageUrl, type TeamMember } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import type { Resource } from '../../lib/use-resource';
import { Notice } from './SectionState';
import { TeamAvatar, traitsFor } from './TeamAvatar';

/* The people who built it. Names, roles, schools and descriptions come from GET /api/team in
 * both languages; only the portraits are local, since they are artwork keyed by name.
 */

/* The portraits the team made of themselves, keyed by name exactly as /api/team spells it.
 * They sit in public/ rather than the database for the same reason the drawings they replace
 * did: they are artwork chosen per person, not a record anyone administers. Anyone without
 * one — a fifth member added through the admin API — still falls back to the drawing. */
const TEAM_PHOTOS: Record<string, string> = {
  'М. Болормаа': '/images/team/bolormaa.png',
  'Э. Оюундарь': '/images/team/oyundari.png',
  'С. Болорсайхан': '/images/team/bolorsaikhan.png',
  'Б. Хулан': '/images/team/khulan.jpg',
};

export function TeamSection({ team }: { team: Resource<TeamMember[]> }) {
  const { t, pick } = useLang();
  const members = team.data ?? [];

  return (
    <section className="block" id="team" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <div className="s-head">
          <h2>{t('Манай баг')}</h2>
          <p>{t('Аялал жуулчлал, технологийг холбох зорилготой сурагчдын баг.')}</p>
        </div>

        {team.loading && (
          <div className="team-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <article className="t-card" key={i} aria-hidden="true">
                <div className="t-img sk" />
                <div className="sk sk-line short" style={{ margin: '14px 8px 8px' }} />
                <div className="sk sk-line mid" style={{ margin: '0 8px 8px' }} />
                <div className="sk sk-line" style={{ margin: '0 8px' }} />
              </article>
            ))}
          </div>
        )}

        {!team.loading && team.error && (
          <Notice message="Багийн мэдээлэл ачаалахад алдаа гарлаа" onRetry={team.reload} />
        )}

        {!team.loading && !team.error && members.length > 0 && (
          <div className="team-grid" id="teamGrid">
            {members.map((member) => {
              const traits = traitsFor(member.name);
              const photo = imageUrl(member.photoUrl) ?? TEAM_PHOTOS[member.name] ?? null;
              const name = pick(member.name, member.nameEn);

              return (
                <article className="t-card" key={member.id}>
                  <div className="t-img">
                    {/* A photo uploaded through the admin API wins, then the team's own
                        portrait, then the design's illustration. */}
                    {photo ? (
                      <Image
                        src={photo}
                        alt={name}
                        width={300}
                        height={300}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        unoptimized
                      />
                    ) : (
                      <TeamAvatar traits={traits} />
                    )}
                  </div>
                  {/* The design always showed a badge here, falling back to "Маркетинг" for
                      the member with no school listed. */}
                  <span className="school">
                    {member.schoolMn ? t(pick(member.schoolMn, member.schoolEn)) : t('Маркетинг')}
                  </span>
                  <h3>{name}</h3>
                  <div className={traits.mk ? 'role mk' : 'role'}>
                    {t(pick(member.role, member.roleEn))}
                  </div>
                  <p>{pick(member.descriptionMn, member.descriptionEn)}</p>
                </article>
              );
            })}
          </div>
        )}

        {!team.loading && !team.error && members.length === 0 && (
          <Notice message="Багийн мэдээлэл одоохондоо алга." />
        )}
      </div>
    </section>
  );
}
