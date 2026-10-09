/* Every inline SVG from the design, path-for-path.
 *
 * The mockup kept these as HTML strings (an `ICON` object plus markup written inline) and
 * injected them with innerHTML. Here each is a component, so React owns the DOM and the
 * icons can take the `aria-hidden` / sizing the design gave them.
 *
 * Icons are decorative wherever a text label sits next to them, which is nearly always —
 * hence aria-hidden on most of these. The few that stand alone (the header's search and
 * menu buttons, the carousel arrows) get their label from the button that wraps them.
 */

type IconProps = { size?: number; className?: string };

/* ---------- Header ---------- */

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 40 26" fill="none" aria-hidden="true">
      <path
        d="M1 24 L13 8 L19 16 L25 5 L39 24"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M21.5 10.5 L25 5 L28.5 10" stroke="var(--green)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function MenuIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/* ---------- People and places ---------- */

export function GuidePersonIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7z" />
      <path d="M8.5 6.5c1-2 5-2.5 7 0" />
    </svg>
  );
}

export function StarSolidIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.8z" />
    </svg>
  );
}

/* ---------- Travel mode tabs ---------- */

export function CityTabIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 21V9l5-3v4l5-3v14zm12 0V4h6v17z" opacity=".9" />
    </svg>
  );
}

export function CountryTabIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 20 9 8l4 6 3-4 6 10z" />
      <circle cx="18" cy="6" r="2.4" />
    </svg>
  );
}

/* ---------- Checklist ---------- */

export function ChecklistCountIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="m3 6 2 2 3-3M3 13l2 2 3-3M11 7h10M11 14h10M11 20h10" />
    </svg>
  );
}

export function CameraIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 4 7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.2L15 4zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" />
    </svg>
  );
}

export function CheckIcon({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

/** The big tick in the dialog's success state and the city section's header. */
export function BigCheckIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

/* ---------- Guide and trip cards ---------- */

export function LanguageIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10h5M9.5 10v5M14 15l2-5 2 5M14.6 13.6h2.8" />
    </svg>
  );
}

export function CarIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 11 7 6h10l2 5h1a1 1 0 0 1 1 1v5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3v-5a1 1 0 0 1 1-1zm2.3 0h9.4l-1.2-3H8.5z" />
    </svg>
  );
}

export function ExperienceIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

export function RouteIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" />
    </svg>
  );
}

export function ClockIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.2 3.2-1.4 1.4L11 13.2V6h2z" />
    </svg>
  );
}

export function PinSmallIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

/* ---------- City section ---------- */

export function BuildingsIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 2 7v2h20V7zM4 10h2.5v8H4zm4.5 0H11v8H8.5zm4.5 0h2.5v8H13zm4.5 0H20v8h-2.5zM2 19h20v3H2z" />
    </svg>
  );
}

export function MuseumTileIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 2 7v2h20V7zM4 10h2.5v8H4zm4.5 0H11v8H8.5zm4.5 0h2.5v8H13zm4.5 0H20v8h-2.5zM2 19h20v3H2z" />
    </svg>
  );
}

export function FoodTileIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M7 2v8a2 2 0 0 0 4 0V2M9 10v12M17 2c-2 1-3 4-3 7h3v13" />
    </svg>
  );
}

export function CultureTileIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c-1.5 2-4 3-4 3v4h8V5s-2.5-1-4-3zM6 9h12l-1 3H7zM5 12h14v9H5zM10 21v-5h4v5" />
    </svg>
  );
}

export function NearbyTileIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20 9 7l4 7 3-4 6 10z" />
    </svg>
  );
}

/** The four city tiles, in the order static-data.ts lists them. */
export const CITY_TILE_ICONS = {
  museum: MuseumTileIcon,
  food: FoodTileIcon,
  culture: CultureTileIcon,
  nearby: NearbyTileIcon,
} as const;

/* ---------- Why us ---------- */

export function WhyChecklistIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="m3 6 2 2 3-3M3 13l2 2 3-3M3 20l2-1M11 7h10M11 14h10M11 20h10" />
    </svg>
  );
}

export function WhyVerifiedIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21c0-4 3-7 7-7 1.4 0 2.7.4 3.8 1" />
      <path d="m16 18 2 2 4-4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Carousels ---------- */

export function ChevronLeftIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/** The little arrow between an aimag name and its best months. */
export function MetaArrowIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" aria-hidden="true">
      <path d="M0 0l14 5-14 5 3-5z" />
    </svg>
  );
}

/* ---------- Hero wave ---------- */

export function HeroWave() {
  return (
    <svg className="hero-wave" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 40 C240 10 420 60 720 34 C1000 10 1200 56 1440 28 L1440 70 L0 70Z"
        fill="currentColor"
      />
    </svg>
  );
}
