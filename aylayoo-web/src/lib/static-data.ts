/* Data the design keeps as constants, not in the database.
 *
 * Map shapes, the Ulaanbaatar tiles and the nearby-trips list are drawing instructions and
 * editorial copy, not records anyone administers, so they stay here exactly as the mockup
 * had them. Everything that IS a record — aimags, places, guides, the team — comes from
 * the API.
 *
 * Generated from apps/aylayoo/design/aylayoo_3.html — do not edit by hand.
 */

/** The five regions, their labels and the CSS custom property holding each colour. */
export const REGION = {
  west: { name: 'Баруун бүс', color: 'var(--r-west)' },
  hangai: { name: 'Хангайн бүс', color: 'var(--r-hangai)' },
  center: { name: 'Төвийн бүс', color: 'var(--r-center)' },
  east: { name: 'Зүүн бүс', color: 'var(--r-east)' },
  cap: { name: 'Нийслэл', color: 'var(--r-cap)' },
} as const;

export type RegionKey = keyof typeof REGION;

/** aimags.region in the API uses longer names than the map's colour classes. */
export const REGION_OF_API: Record<string, RegionKey> = {
  western: 'west',
  khangai: 'hangai',
  central: 'center',
  eastern: 'east',
  capital: 'cap',
};

/** What each guide type is called. `individual` is the API's name for a private guide. */
export const TYPE_LABEL: Record<string, string> = {
  individual: 'Хувь хөтөч',
  driver: 'Аяллын жолооч',
  company: 'Аяллын компани',
};

/** The design's filter buttons use these names; `guide` means the API's `individual`. */
export const FILTER_TO_TYPE = { guide: 'individual', driver: 'driver', company: 'company' } as const;

/** ISO 3166-2:MN code → the API's aimag slug. */
export const ISO_TO_SLUG: Record<string, string> = {
  'MN-071': 'bayan-ulgii',
  'MN-043': 'khovd',
  'MN-046': 'uvs',
  'MN-057': 'zavkhan',
  'MN-065': 'govi-altai',
  'MN-041': 'khuvsgul',
  'MN-073': 'arkhangai',
  'MN-067': 'bulgan',
  'MN-055': 'uvurkhangai',
  'MN-069': 'bayankhongor',
  'MN-035': 'orkhon',
  'MN-047': 'tuv',
  'MN-049': 'selenge',
  'MN-037': 'darkhan-uul',
  'MN-064': 'govisumber',
  'MN-059': 'dundgovi',
  'MN-053': 'umnugovi',
  'MN-063': 'dornogovi',
  'MN-039': 'khentii',
  'MN-061': 'dornod',
  'MN-051': 'sukhbaatar',
  'MN-1': 'ulaanbaatar',
};

export const SLUG_TO_ISO: Record<string, string> = Object.fromEntries(
  Object.entries(ISO_TO_SLUG).map(([iso, slug]) => [slug, iso]),
);

/** Each aimag's outline and label anchor, straight from Natural Earth via the mockup. */
export type MapShape = { d: string; c: readonly [number, number] };

export const PATHS: Record<string, MapShape> = {
  'MN-061': { d: 'M899,236L906,230L922,229L923,218L928,216L933,219L948,207L963,206L966,201L983,205L994,203L1000,196L999,190L989,177L969,164L965,158L955,156L946,148L934,147L921,152L911,169L902,164L895,162L884,166L876,166L869,174L865,175L855,166L852,158L860,149L857,137L863,125L862,121L874,74L870,70L859,67L846,76L834,77L822,67L814,64L800,64L788,75L780,79L771,90L767,101L758,107L749,106L740,111L746,130L746,134L755,148L759,157L760,173L767,184L768,194L777,190L784,192L803,194L827,207L827,220L835,225L845,235L852,231L886,223L899,236Z', c: [851, 156] },
  'MN-071': { d: 'M76,69L64,72L64,81L51,82L47,88L38,89L24,84L18,84L15,93L5,96L0,106L0,112L7,117L3,122L19,137L19,143L31,156L47,157L52,168L61,166L61,172L68,180L70,186L70,195L75,210L81,217L82,226L97,231L108,233L108,228L98,216L100,206L95,196L96,189L90,164L87,160L87,150L89,147L89,137L99,134L107,135L107,128L101,121L97,105L91,103L91,98L82,90L78,72L76,69Z', c: [60, 136] },
  'MN-043': { d: 'M82,226L83,232L76,243L77,257L66,267L62,279L68,294L76,295L79,299L86,299L92,304L103,305L109,308L118,311L127,310L138,313L141,298L143,282L154,272L154,268L164,252L162,242L170,243L183,236L186,232L182,221L181,213L167,199L166,193L161,183L159,171L170,163L169,158L164,152L163,147L156,144L149,148L135,142L126,135L126,127L121,125L107,135L99,134L89,137L89,147L87,150L87,160L90,164L96,189L95,196L100,206L98,216L108,228L108,233L97,231L82,226Z', c: [124, 223] },
  'MN-051': { d: 'M899,236L886,223L852,231L845,235L835,225L827,220L827,207L803,194L784,192L777,190L768,194L767,184L752,191L749,200L750,206L742,206L738,209L734,218L733,230L729,240L728,247L731,255L729,263L741,267L748,280L749,294L758,304L759,313L774,313L781,318L797,322L815,322L822,313L828,311L838,297L840,288L847,285L853,287L866,284L876,280L886,267L891,265L891,255L894,246L899,236Z', c: [803, 254] },
  'MN-063': { d: 'M759,313L758,304L749,294L748,280L741,267L729,263L721,271L707,264L703,258L693,247L689,263L681,269L670,271L665,268L656,256L659,244L655,242L653,235L649,233L646,241L639,245L627,244L622,246L627,256L634,264L635,280L640,286L645,284L643,298L649,326L639,335L625,337L621,352L620,362L624,367L632,388L634,405L636,418L636,425L638,447L655,446L664,447L671,444L687,443L693,438L707,432L718,425L733,400L738,395L754,386L759,379L765,377L760,366L748,356L744,346L752,319L759,313Z', c: [688, 347] },
  'MN-065': { d: 'M138,313L152,317L158,321L165,332L173,333L177,340L185,345L188,350L199,355L210,354L207,367L213,369L221,397L223,406L235,420L236,429L240,430L265,429L287,434L287,409L293,395L296,375L296,356L304,351L306,345L308,329L311,325L316,308L314,290L307,280L303,278L294,267L293,253L286,250L280,253L272,252L268,238L263,235L255,237L249,220L228,203L216,202L210,195L202,195L185,189L174,193L166,193L167,199L181,213L182,221L186,232L183,236L170,243L162,242L164,252L154,268L154,272L143,282L141,298L138,313Z', c: [233, 308] },
  'MN-069': { d: 'M287,434L343,444L348,443L346,415L346,376L346,372L357,370L364,376L372,386L403,388L422,377L415,346L417,340L404,332L402,314L406,309L409,297L409,287L415,281L414,271L418,267L417,259L409,249L406,246L391,247L385,240L380,231L366,234L364,219L359,214L359,208L346,215L339,215L332,211L331,204L319,206L311,225L301,227L293,253L294,267L303,278L307,280L314,290L316,308L311,325L308,329L306,345L304,351L296,356L296,375L293,395L287,409L287,434Z', c: [350, 321] },
  'MN-053': { d: 'M348,443L362,440L403,448L417,449L431,464L467,473L489,484L516,479L516,488L530,489L535,491L543,483L564,472L594,457L638,447L636,425L636,418L634,405L632,388L624,367L620,362L621,352L611,354L606,353L588,361L579,366L565,369L556,364L547,347L521,344L504,341L501,337L500,325L489,325L485,333L473,341L462,365L464,373L452,372L435,373L422,377L403,388L372,386L364,376L357,370L346,372L346,376L346,415L348,443Z', c: [502, 413] },
  'MN-041': { d: 'M453,83L444,76L444,68L441,64L441,56L439,50L440,40L436,37L420,32L417,33L392,20L377,19L368,11L358,9L345,0L340,12L329,17L325,28L320,28L311,50L316,58L317,67L324,73L323,84L318,94L309,99L301,100L300,104L292,108L286,104L288,108L281,113L279,123L285,130L298,133L308,141L321,141L327,145L334,138L344,138L346,152L341,162L343,176L348,179L361,178L368,170L373,174L384,168L382,161L386,146L395,137L413,148L423,148L424,139L433,130L442,128L450,118L451,111L438,106L437,103L445,93L447,87L453,83Z', c: [372, 89] },
  'MN-067': { d: 'M453,83L447,87L445,93L437,103L438,106L451,111L450,118L442,128L433,130L424,139L423,148L432,158L437,157L441,172L448,182L453,183L458,191L459,198L471,208L477,218L485,225L486,229L500,227L498,219L512,210L519,209L517,196L508,194L504,187L512,174L511,165L511,157L506,152L495,148L498,142L510,142L516,115L510,108L510,94L504,88L500,93L488,93L482,95L453,83Z', c: [476, 151] },
  'MN-046': { d: 'M238,95L227,92L222,87L213,87L206,75L205,60L184,57L169,53L168,46L162,46L159,50L150,41L144,47L132,46L121,54L109,54L98,62L92,61L78,65L76,69L78,72L82,90L91,98L91,103L97,105L101,121L107,128L107,135L121,125L126,127L126,135L135,142L149,148L156,144L163,147L164,152L169,158L179,147L192,142L212,149L221,148L237,140L239,128L242,123L236,106L238,95Z', c: [161, 99] },
  'MN-049': { d: 'M633,127L623,118L616,116L613,100L591,98L583,89L573,84L561,86L553,81L533,78L504,88L510,94L510,108L516,115L510,142L512,148L506,152L511,157L511,165L526,170L541,163L539,158L551,153L555,153L562,160L574,167L590,162L595,165L607,160L609,153L603,145L607,141L614,140L620,142L627,137L632,136L633,127ZM566,121L570,117L579,123L580,139L574,141L566,137L558,142L550,140L552,123L556,117L566,121Z', c: [562, 124] },
  'MN-057': { d: 'M286,104L283,100L275,98L265,98L250,91L238,95L236,106L242,123L239,128L237,140L221,148L212,149L192,142L179,147L169,158L170,163L159,171L161,183L166,193L174,193L185,189L202,195L210,195L216,202L228,203L249,220L255,237L263,235L268,238L272,252L280,253L286,250L293,253L301,227L311,225L319,206L313,205L315,186L324,186L330,181L343,176L341,162L346,152L344,138L334,138L327,145L321,141L308,141L298,133L285,130L279,123L281,113L288,108L286,104Z', c: [261, 172] },
  'MN-039': { d: 'M633,127L632,136L640,143L644,150L651,171L647,184L635,192L635,209L645,230L649,233L653,235L655,242L659,244L656,256L665,268L670,271L681,269L689,263L693,247L703,258L707,264L721,271L729,263L731,255L728,247L729,240L733,230L734,218L738,209L742,206L750,206L749,200L752,191L767,184L760,173L759,157L755,148L746,134L746,130L740,111L717,117L700,130L688,126L683,130L669,127L662,128L655,124L633,127Z', c: [696, 188] },
  'MN-037': { d: 'M566,121L556,117L552,123L550,140L558,142L566,137L574,141L580,139L579,123L570,117L566,121Z', c: [565, 130] },
  'MN-047': { d: 'M635,209L628,206L627,201L631,192L635,192L647,184L651,171L644,150L640,143L632,136L627,137L620,142L614,140L607,141L603,145L609,153L607,160L595,165L590,162L574,167L562,160L555,153L551,153L539,158L541,163L526,170L511,165L512,174L504,187L508,194L517,196L519,209L512,210L498,219L500,227L502,234L506,239L503,247L509,256L510,263L516,267L527,259L541,266L549,253L552,252L565,258L583,258L589,260L596,265L609,262L619,254L622,246L627,244L639,245L646,241L649,233L645,230L635,209ZM585,183L591,181L600,192L607,194L606,206L598,207L593,204L579,205L574,204L568,180L585,183Z', c: [576, 207] },
  'MN-073': { d: 'M423,148L413,148L395,137L386,146L382,161L384,168L373,174L368,170L361,178L348,179L343,176L330,181L324,186L315,186L313,205L319,206L331,204L332,211L339,215L346,215L359,208L359,214L364,219L366,234L380,231L385,240L391,247L406,246L409,249L426,245L431,241L450,235L456,227L453,221L465,224L470,231L481,232L486,229L485,225L477,218L471,208L459,198L458,191L453,183L448,182L441,172L437,157L432,158L423,148Z', c: [402, 199] },
  'MN-035': { d: 'M510,142L498,142L495,148L506,152L512,148L510,142Z', c: [504, 146] },
  'MN-059': { d: 'M622,246L619,254L609,262L596,265L589,260L583,258L565,258L552,252L549,253L541,266L527,259L516,267L510,279L502,282L499,299L489,300L484,310L490,317L489,325L500,325L501,337L504,341L521,344L547,347L556,364L565,369L579,366L588,361L606,353L611,354L621,352L625,337L639,335L649,326L643,298L645,284L640,286L635,280L634,264L627,256L622,246Z', c: [571, 307] },
  'MN-055': { d: 'M500,227L486,229L481,232L470,231L465,224L453,221L456,227L450,235L431,241L426,245L409,249L417,259L418,267L414,271L415,281L409,287L409,297L406,309L402,314L404,332L417,340L415,346L422,377L435,373L452,372L464,373L462,365L473,341L485,333L489,325L490,317L484,310L489,300L499,299L502,282L510,279L516,267L510,263L509,256L503,247L506,239L502,234L500,227Z', c: [454, 295] },
  'MN-064': { d: 'M635,192L631,192L627,201L628,206L635,209L635,192Z', c: [632, 201] },
  'MN-1': { d: 'M585,183L568,180L574,204L579,205L593,204L598,207L606,206L607,194L600,192L591,181L585,183Z', c: [587, 194] },
};

/* Where a label would otherwise sit outside its shape or collide with a neighbour. */
export const LABEL_FIX: Record<string, readonly [number, number]> = {
  'MN-049': [603, 100],
  'MN-047': [548, 238],
  'MN-037': [565, 131],
  'MN-035': [503, 147],
  'MN-064': [650, 200],
  'MN-1': [587, 214],
  'MN-067': [468, 168],
};

/** Aimags too small to fit a full-size label. */
export const TINY = new Set(['MN-037', 'MN-035', 'MN-064', 'MN-1']);

/** An Ulaanbaatar tile: a themed tour with a hover slideshow. */
export type CityTile = {
  icon: 'museum' | 'food' | 'culture' | 'nearby';
  name: string;
  desc: string;
  slides: ReadonlyArray<readonly [photo: string, caption: string]>;
};

export const CITY: readonly CityTile[] = [
  {
    icon: 'museum',
    name: "Музейн аялал",
    desc: "Чойжин ламын сүм, Чингис хааны хөшөө",
    slides: [
      ['choijin', "Чойжин ламын сүм музей"],
      ['chinggis_statue', "Чингис хааны морьт хөшөө"],
      ['gov_night', "Төрийн ордон"],
    ],
  },
  {
    icon: 'food',
    name: "Хоолны аялал",
    desc: "Үндэсний & орчин үеийн",
    slides: [
      ['night_city', "Шөнийн Улаанбаатар"],
      ['ub_sign', "Хотын төв"],
      ['gov_square', "Төв талбай орчим"],
    ],
  },
  {
    icon: 'culture',
    name: "Соёлын аялал",
    desc: "Үндэсний бөх, морин урлаг, талбай",
    slides: [
      ['wrestlers', "Үндэсний бөх"],
      ['horse_rider', "Морин урлаг"],
      ['sukhbaatar', "Сүхбаатарын талбай"],
    ],
  },
  {
    icon: 'nearby',
    name: "Хотын ойролцоо",
    desc: "Хотын панорам, цэцэрлэгт хүрээлэн",
    slides: [
      ['ub_aerial', "Хотын панорам"],
      ['winter_park', "Цэцэрлэгт хүрээлэн"],
      ['night_ger', "Хотоос гадуурх гэр бааз"],
    ],
  },
];

/** A short trip out of Ulaanbaatar, grouped by how far it is. */
export type Trip = { name: string; desc: string; km: number; time: string; imageKey: string };

export const TRIP_RADII = [50, 100, 200] as const;
export type TripRadius = (typeof TRIP_RADII)[number];

export const TRIPS: Record<TripRadius, readonly Trip[]> = {
  50: [
    {
      name: "Зайсан толгой ба Богд хан уулын ам",
      desc: "Хотын панорам дэлгэгдэх дурсгалт толгой, хажууд нь Богд хан уулын ойн зам.",
      km: 10, time: "20 мин", imageKey: 'city',
    },
    {
      name: "Гачуурт",
      desc: "Туул голын хөндийд байрлах ойрын амралтын бүс. Морь унаж, явган аялж, завиар сэлүүрдэнэ.",
      km: 20, time: "30 мин", imageKey: 'lake',
    },
    {
      name: "Манзуширын хийд",
      desc: "Богд хан уулын өмнөд энгэрийн нарсан хөндийд орших хийдийн балгас.",
      km: 45, time: "1 цаг", imageKey: 'forest',
    },
    {
      name: "Цэцээгүн оргил (Богд хан уул)",
      desc: "Манзуширын хийдээс эхлэх явган аяллын зам. Оргил хүртэл 3–4 цаг өгсөнө.",
      km: 45, time: "1 цаг", imageKey: 'mountain',
    },
    {
      name: "Чингис хааны морьт хөшөө (Цонжин Болдог)",
      desc: "Дэлхийн хамгийн том морьт хөшөө, дор нь музейн цогцолбор. Хөшөөний орой нь Туулын хөндийг харах тавцан.",
      km: 54, time: "1 цаг", imageKey: 'monument',
    },
  ],
  100: [
    {
      name: "Мэлхий хад (Горхи-Тэрэлж)",
      desc: "Тэрэлжийн ойт уулсын бэлгэ тэмдэг болсон боржин хадны тогтоц. Эргэн тойронд морин болон явган замууд олон.",
      km: 65, time: "1.5 цаг", imageKey: 'mountain',
    },
    {
      name: "Арьяабалын хийд",
      desc: "Тэрэлжийн уулын энгэрт сууриласан бясалгалын сүм. Хүрэхийн тулд дүүжин гүүр, зуу гаруй шатаар өгсөнө.",
      km: 70, time: "1.5 цаг", imageKey: 'temple',
    },
    {
      name: "Тэрэлжийн гэр бааз ба морин аялал",
      desc: "Гэр баазад хонож, өглөө нь морьтой аялах хоёр өдрийн маршрут. Анх удаа морь унаж буй хүнд ч тохиромжтой.",
      km: 70, time: "1.5 цаг", imageKey: 'steppe',
    },
    {
      name: "Хустайн байгалийн цогцолбор газар",
      desc: "Зэрлэг тахийг байгальд нь харах боломжтой нөөц газар. Үдшийн усалгааны цагаар хамгийн ойр ирдэг.",
      km: 100, time: "2 цаг", imageKey: 'steppe',
    },
    {
      name: "13-р зууны цогцолбор",
      desc: "XIII зууны нүүдэлчдийн ахуйг сэргээсэн зургаан бааз. Хааны өргөө, цэрэг, урчуудын хороогоор дамжин үзнэ.",
      km: 100, time: "2 цаг", imageKey: 'steppe',
    },
  ],
  200: [
    {
      name: "Гүн-Галуутын байгалийн нөөц газар",
      desc: "Нуур, намгархаг нуга, аргаль хонь, олон зүйлийн шувуу. Улаанбаатарт хамгийн ойр шувуу ажиглах газар.",
      km: 130, time: "2.5 цаг", imageKey: 'lake',
    },
    {
      name: "Гүнжийн сүм",
      desc: "1740 онд босгож, ойн гүнд орхигдсон сүм. Зам байхгүй тул морьтой эсвэл хэд хоногийн явган аялалаар хүрнэ.",
      km: 140, time: "2 өдөр", imageKey: 'temple',
    },
    {
      name: "Зоргол хайрхан",
      desc: "Улаан боржин чулуутай тахилгат уул. Агуй, рашаан булаг, авирах олон зам бий.",
      km: 150, time: "3 цаг", imageKey: 'mountain',
    },
    {
      name: "Хагийн хар нуур",
      desc: "Уулсын дунд орших нуур. Намаг, гол гатлах хүндхэн замтай тул хэд хоногийн бэлтгэлтэй явна.",
      km: 180, time: "2–3 өдөр", imageKey: 'lake',
    },
    {
      name: "Дархан хот, Хар гол",
      desc: "Хойд зүгийн хоёр дахь том хот, хажууд нь Хар голын эргийн амралтын бүс.",
      km: 220, time: "3 цаг", imageKey: 'city',
    },
  ],
};

/* The must-see carousel frames each place with two photos and their captions. The place
 * itself — name, blurb, best months, which aimag — comes from the API; only this pairing is
 * presentation, so it lives here. Keyed by aimag slug, because the design's six must-see
 * places are each in a different aimag. A must-see place with no entry here still renders,
 * using its own imageKey for both sides. */
export type Showcase = {
  left: { photo: string; caption: string };
  right: { photo: string; caption: string };
};

export const MUST_SHOWCASE: Record<string, Showcase> = {
  'khuvsgul': {
    left: { photo: 'lake', caption: "Хөвсгөл нуур" },
    right: { photo: 'forest', caption: "Цаатан иргэдийн нутаг" },
  },
  'umnugovi': {
    left: { photo: 'desert', caption: "Хонгорын элс" },
    right: { photo: 'mountain', caption: "Ёлын ам" },
  },
  'arkhangai': {
    left: { photo: 'lake', caption: "Тэрхийн Цагаан нуур" },
    right: { photo: 'mountain', caption: "Хорго галт уул" },
  },
  'uvurkhangai': {
    left: { photo: 'temple', caption: "Эрдэнэ зуу хийд" },
    right: { photo: 'falls', caption: "Орхоны хүрхрээ" },
  },
  'bayan-ulgii': {
    left: { photo: 'mountain', caption: "Хүйтэн оргил" },
    right: { photo: 'steppe', caption: "Бүргэдийн баяр" },
  },
  'tuv': {
    left: { photo: 'melkhii', caption: "Мэлхий хад" },
    right: { photo: 'horse_rider', caption: "Морин аялал" },
  },
};

/* The illustrated avatars. The mockup drew each team member as an SVG with a few colour
 * knobs rather than shipping a photo, so the knobs are keyed by name here and the drawing
 * itself lives in components/TeamAvatar.tsx. Anyone the API returns who is not listed gets
 * the fallback palette. */
export type AvatarTraits = {
  hair: string;
  top: string;
  bg: string;
  collar?: string;
  tie?: boolean;
  /** The marketing role's white V-neck, and the warm accent on the role line. */
  mk?: boolean;
};

export const TEAM_AVATARS: Record<string, AvatarTraits> = {
  "М. Болормаа": { hair: '#3A2E3A', top: '#2E3A5C', bg: '#EEF3EC', tie: true },
  "Э. Оюундарь": { hair: '#2B2430', top: '#3B4466', bg: '#F1EFE8', tie: true },
  "С. Болорсайхан": { hair: '#2F2830', top: '#F4F5FA', bg: '#EAF0F6', collar: '#243559' },
  "Б. Хулан": { hair: '#4A3228', top: '#2D5A45', bg: '#F6EFE6', mk: true },
};

export const AVATAR_FALLBACK: AvatarTraits = { hair: '#2F2830', top: '#2E3A5C', bg: '#EEF3EC' };
