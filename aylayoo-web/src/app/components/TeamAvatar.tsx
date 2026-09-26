import { AVATAR_FALLBACK, TEAM_AVATARS, type AvatarTraits } from '../../lib/static-data';

/* The illustrated portrait, path-for-path from the design.
 *
 * The mockup drew each team member rather than photographing them — one SVG with a few colour
 * knobs for hair, top and background, plus three mutually exclusive details: a school tie, a
 * shirt collar, or the marketing role's white V-neck. Those knobs live in static-data.ts
 * keyed by name, because they describe a drawing, not a record.
 *
 * Anyone the API returns who is not in that table gets the fallback palette, so a fifth team
 * member added through the admin API still gets a portrait instead of an empty box.
 */

const SKIN = '#F7D3C4';

export function traitsFor(name: string): AvatarTraits {
  return TEAM_AVATARS[name] ?? AVATAR_FALLBACK;
}

export function TeamAvatar({ traits }: { traits: AvatarTraits }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <rect width="200" height="200" fill={traits.bg} />
      {/* shoulders */}
      <path d="M52 200 C52 162 72 146 100 146 C128 146 148 162 148 200Z" fill={traits.top} />

      {traits.collar && (
        <>
          <path d="M78 150 L100 166 L122 150 L118 146 L100 158 L82 146Z" fill={traits.collar} />
          <circle cx="100" cy="176" r="2.4" fill="#243559" />
          <circle cx="100" cy="188" r="2.4" fill="#243559" />
        </>
      )}

      {traits.tie && (
        <>
          <path d="M86 148 L100 162 L114 148Z" fill="#fff" />
          <path d="M97 158 h6 l3 30 -6 8 -6-8z" fill="#3C5A9A" />
          <path d="M97 166 l9 4 M96 176 l10 4" stroke="#C84B4B" strokeWidth="2.5" />
        </>
      )}

      {traits.mk && (
        <path d="M82 148 L100 170 L118 148" fill="none" stroke="#fff" strokeWidth="3" />
      )}

      {/* neck */}
      <rect x="91" y="128" width="18" height="22" rx="6" fill={SKIN} />
      {/* hair, behind the face */}
      <path
        d="M44 150 C38 90 56 48 100 46 C144 48 162 90 156 150 C146 142 140 120 140 110 L60 110 C60 120 54 142 44 150Z"
        fill={traits.hair}
      />
      <ellipse cx="100" cy="100" rx="38" ry="40" fill={SKIN} />
      {/* fringe */}
      <path
        d="M60 96 C62 62 82 52 102 54 C124 56 140 70 140 96 C126 82 112 72 96 70 C86 80 74 88 60 96Z"
        fill={traits.hair}
      />
      {/* eyes, with a catchlight each */}
      <ellipse cx="85" cy="104" rx="4" ry="5" fill="#2A2330" />
      <ellipse cx="115" cy="104" rx="4" ry="5" fill="#2A2330" />
      <circle cx="86.5" cy="102.5" r="1.3" fill="#fff" />
      <circle cx="116.5" cy="102.5" r="1.3" fill="#fff" />
      {/* cheeks */}
      <ellipse cx="76" cy="118" rx="8" ry="5" fill="#F2A09A" opacity=".75" />
      <ellipse cx="124" cy="118" rx="8" ry="5" fill="#F2A09A" opacity=".75" />
      {/* smile */}
      <path
        d="M93 121 Q100 127 107 121"
        stroke="#9E4B4B"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
