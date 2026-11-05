/* Strings the design's dictionary does not have, because the mockup had no backend.
 *
 * Kept apart from i18n-dictionary.ts so that file stays a verbatim copy of the design's
 * I18N_EN and can be regenerated from it at any time. Everything here is new UI: loading
 * and error states, the guide registration form, and the dialog's success copy.
 */

export const I18N_EXTRA: Readonly<Record<string, string>> = {
  /* ---- navigation the design did not have ---- */
  'Үндсэн агуулга руу шилжих': 'Skip to main content',

  /* ---- hero headline ----
   * The design's dictionary has the whole line, because the mockup showed it whole. The
   * headline now cycles one phrase at a time, so each phrase needs its own entry; the
   * romanisation is the one the full line already uses. */
  'Аялъя өө': 'Aylay oo',
  'Уулзъя өө': 'Uulzay oo',
  'Амаръя өө': 'Amray oo',

  /* ---- day trips from Ulaanbaatar ----
   * Names and blurbs for the trip cards. They reach t() as `t(trip.name)` rather than as
   * literals, so i18n-coverage.spec.ts cannot see them — trips.spec.ts checks them instead.
   * A few names the design already had keep their entry in i18n-dictionary.ts. */
  'Зайсан толгой ба Богд хан уулын ам': 'Zaisan Hill & the Bogd Khan foothills',
  'Хотын панорам дэлгэгдэх дурсгалт толгой, хажууд нь Богд хан уулын ойн зам.':
    'A memorial hill with the whole city laid out below it, and the forest paths of Bogd Khan mountain alongside.',
  'Гачуурт': 'Gachuurt',
  'Туул голын хөндийд байрлах ойрын амралтын бүс. Морь унаж, явган аялж, завиар сэлүүрдэнэ.':
    'A riverside escape in the Tuul valley. Horse riding, walking trails and canoeing on the river.',
  'Богд хан уулын өмнөд энгэрийн нарсан хөндийд орших хийдийн балгас.':
    'The ruins of a monastery in a pine valley on the southern side of Bogd Khan mountain.',
  'Цэцээгүн оргил (Богд хан уул)': 'Tsetseegun Peak (Bogd Khan mountain)',
  'Манзуширын хийдээс эхлэх явган аяллын зам. Оргил хүртэл 3–4 цаг өгсөнө.':
    'A hiking route starting at Manzushir Monastery. It is a three to four hour climb to the summit.',
  'Чингис хааны морьт хөшөө (Цонжин Болдог)': 'Chinggis Khaan Equestrian Statue (Tsonjin Boldog)',
  'Дэлхийн хамгийн том морьт хөшөө, дор нь музейн цогцолбор. Хөшөөний орой нь Туулын хөндийг харах тавцан.':
    "The largest equestrian statue in the world, with a museum beneath it. The horse's head is a viewing deck over the Tuul valley.",
  'Мэлхий хад (Горхи-Тэрэлж)': 'Turtle Rock (Gorkhi-Terelj)',
  'Тэрэлжийн ойт уулсын бэлгэ тэмдэг болсон боржин хадны тогтоц. Эргэн тойронд морин болон явган замууд олон.':
    "The granite formation that became the symbol of Terelj's wooded hills, with horse and walking trails all around it.",
  'Арьяабалын хийд': 'Aryabal Meditation Temple',
  'Тэрэлжийн уулын энгэрт суурилсан бясалгалын сүм. Хүрэхийн тулд дүүжин гүүр, зуу гаруй шатаар өгсөнө.':
    'A meditation temple set into a Terelj hillside. Getting there means a suspension bridge and a climb of over a hundred steps.',
  'Тэрэлжийн гэр бааз ба морин аялал': 'Terelj ger camp & horse trek',
  'Гэр баазад хонож, өглөө нь морьтой аялах хоёр өдрийн маршрут. Анх удаа морь унаж буй хүнд ч тохиромжтой.':
    'A two-day route: a night in a ger camp, then a morning on horseback. Suitable for first-time riders.',
  'Хустайн байгалийн цогцолборт газар': 'Khustai National Park',
  'Зэрлэг тахийг байгальд нь харах боломжтой нөөц газар. Үдшийн усалгааны цагаар хамгийн ойр ирдэг.':
    "A reserve where the wild takhi — Przewalski's horse — can be seen in the open. They come closest when they water in the evening.",
  '13-р зууны цогцолбор': 'Thirteenth Century Complex',
  'XIII зууны нүүдэлчдийн ахуйг сэргээсэн зургаан бааз. Хааны өргөө, цэрэг, урчуудын хороогоор дамжин үзнэ.':
    "Six camps recreating nomadic life in the thirteenth century, from the khan's court to the soldiers' and craftsmen's quarters.",
  'Гүн-Галуутын байгалийн нөөц газар': 'Gun-Galuut Nature Reserve',
  'Нуур, намгархаг нуга, аргаль хонь, олон зүйлийн шувуу. Улаанбаатарт хамгийн ойр шувуу ажиглах газар.':
    'Lakes, wetlands, argali sheep and a long bird list — the best birdwatching within easy reach of the city.',
  '1740 онд босгож, ойн гүнд орхигдсон сүм. Зам байхгүй тул морьтой эсвэл хэд хоногийн явган аялалаар хүрнэ.':
    'A temple raised in 1740 and left to the forest. There is no road: it is reached on horseback, or on a hike of several days.',
  'Зоргол Хайрхан': 'Zorgol Khairkhan',
  'Улаан боржин чулуутай тахилгат уул. Агуй, рашаан булаг, авирах олон зам бий.':
    'A sacred mountain of red granite, with caves, spring water and plenty of climbing routes.',
  'Хагийн Хар нуур': 'Khagiin Khar Lake',
  'Уулсын дунд орших нуур. Намаг, гол гатлах хүндхэн замтай тул хэд хоногийн бэлтгэлтэй явна.':
    'A lake among the mountains. The way in crosses marsh and rivers, so it takes several days and some preparation.',
  'Хойд зүгийн хоёр дахь том хот, хажууд нь Хар голын эргийн амралтын бүс.':
    'The second-largest city in the north, with the riverside resorts of the Kharaa alongside it.',

  /* ---- loading and errors ---- */
  'Ачаалж байна…': 'Loading…',
  'Дахин оролдох': 'Try again',
  'Мэдээлэл ачаалахад алдаа гарлаа': 'Something went wrong loading this',
  'Сервертэй холбогдож чадсангүй': 'Could not reach the server',
  'Газрын зургийн мэдээлэл ачаалахад алдаа гарлаа': 'Could not load the map data',
  'Хөтчийн мэдээлэл ачаалахад алдаа гарлаа': 'Could not load the guides',
  'Багийн мэдээлэл ачаалахад алдаа гарлаа': 'Could not load the team',
  'Заавал очих газрууд ачаалахад алдаа гарлаа': 'Could not load the must-see places',
  'Дахин ачаална уу': 'Please reload',
  /* Empty states for content the design always had, but a real database might not.
   * The guides one matters most: the site launches with an empty guides table, because the
   * pre-launch sample guides are deleted and real ones arrive by registration. */
  'Энэ аймагт бүртгэлтэй газар одоохондоо алга.': 'No places are listed for this province yet.',
  'Заавал очих газрууд одоохондоо алга.': 'No must-see places are listed yet.',
  'Хөтчүүд удахгүй нэмэгдэнэ': 'Guides are coming soon',
  'Одоогоор баталгаажсан хөтөч бүртгэгдээгүй байна. Та хөтөч, жолооч эсвэл аяллын компани бол өөрийгөө бүртгүүлээрэй — бид шалгаад сайт дээр нэмнэ.':
    'No verified guides are registered yet. If you are a guide, a driver or a tour company, register yourself — we will review it and add you to the site.',
  'Энэ төрлийн хөтөч одоохондоо алга.': 'No guides of this kind yet.',
  'Бүгдийг харах': 'Show all',
  'Багийн мэдээлэл одоохондоо алга.': 'No team members are listed yet.',
  // The badge a team member gets when no school is recorded. The design showed it too, but
  // its dictionary never needed an entry because all four members had a school.
  Маркетинг: 'Marketing',

  /* ---- contact and booking dialog ---- */
  'Утас эсвэл имэйлээ бүтэн бичнэ үү': 'Enter a full phone number or email address',
  'Аяллын талаар хэдэн үг бичнэ үү': 'Please write a few words about your trip',
  'Илгээж байна…': 'Sending…',
  'Хүсэлт илгээхэд алдаа гарлаа': 'Could not send your request',

  /* ---- guide registration ---- */
  'Хөтчөөр бүртгүүлэх хүсэлт илгээгдлээ': 'Your registration has been sent',
  'Бид шалгаад 24 цагийн дотор тантай холбогдоно.': 'We will review it and contact you within 24 hours.',
  'Та хэн бэ?': 'Who are you?',
  'Аяллын хөтөч': 'Tour guide',
  'Байгууллагын нэр': 'Company name',
  'Утас': 'Phone',
  'Имэйл': 'Email',
  'Вэб сайт': 'Website',
  'Туршлага (жил)': 'Experience (years)',
  'Ажилладаг аймгууд': 'Provinces you work in',
  'Хэлүүд': 'Languages',
  'Аяллын төрөл': 'Trip type',
  'Хотын аялал': 'City trips',
  'Хөдөөгийн аялал': 'Countryside trips',
  'Байнга явдаг чиглэл': 'Routes you usually travel',
  'Машин': 'Vehicle',
  'Жишээ нь: Land Cruiser 200': 'e.g. Land Cruiser 200',
  /* A whole-string entry, like the design's own "Жишээ нь: …" placeholder. The generic
   * "X: Y" rule would look up "Жишээ нь" without its colon, which is not a key, and leave
   * the prefix in Mongolian next to translated aimag names. */
  'Жишээ нь: Хөвсгөл, Архангай': 'e.g. Khövsgöl, Arkhangai',
  'Танилцуулга': 'About you',
  'Зураг (сонголтоор)': 'Photo (optional)',
  'Бүртгүүлэх хүсэлт илгээхэд алдаа гарлаа': 'Could not send your registration',
  'Дор хаяж нэг аймаг сонгоно уу': 'Choose at least one province',
  'Дор хаяж нэг хэл сонгоно уу': 'Choose at least one language',
  'Дор хаяж нэг аяллын төрөл сонгоно уу': 'Choose at least one trip type',
  'Жолооч бол машинаа бичнэ үү': 'Drivers must say which car they drive',

  /* ---- experience, as the tourism association records it ----
   * Bands rather than numbers, because that is what the roster holds; turning "4-6 жил" into
   * 5 would be inventing a fact about a real person. */
  'Анхны жил': 'First year',
  '1-3 жил': '1–3 years',
  '4-6 жил': '4–6 years',
  '7-9 жил': '7–9 years',
  '10+ жил': '10+ years',

  /* ---- language names ----
   * Only the two the design's dictionary lacks. The other eight (Монгол, Англи, Орос, Хятад,
   * Япон, Солонгос, Франц, Герман) are already in I18N_EN with identical values, and
   * repeating them here made the bundler fold both objects into one literal with duplicate
   * keys — harmless, since I18N_EN wins either way, but noise in the build and two places to
   * change one string. */
  Испани: 'Spanish',
  Итали: 'Italian',

  /* ---- the detail pages ----
   * /guides/[id], /aimags/[slug] and /places/[id], plus the shared chrome and the 404. Most of
   * what those pages print was already in the design's dictionary — "Төв:", "Талбай:", "Хэл:",
   * "Аялж болох газрууд" — because the home page's info card says the same things. These are
   * what is genuinely new. */
  'Хуудасны зам': 'Breadcrumb',
  'Нүүр хуудас руу буцах': 'Back to the home page',
  'Дэлгэрэнгүй': 'Details',
  'Аймгийн хуудас': 'Province page',
  'Аймаг:': 'Province:',
  'Төрөл:': 'Category:',
  'Хамгийн таатай цаг:': 'Best time:',

  /* The four place categories the API stores. Held in Mongolian so they reach t() as literals
   * like every other label, rather than being translated by a second mechanism. */
  'Байгаль': 'Nature',
  'Түүх': 'History',
  'Хот': 'City',
  'Соёл': 'Culture',

  /* ---- not found ---- */
  'Хуудас олдсонгүй': 'Page not found',
  'Хайсан хуудас байхгүй, эсвэл хаяг нь өөрчлөгдсөн байна.':
    'That page does not exist, or its address has changed.',

  /* ---- Phase 2: the Ulaanbaatar city section ----
   * The tab labels, the loading announcements and the empty states for /ulaanbaatar. The row
   * content itself needs nothing here: every city table carries both languages, so it goes
   * through pick() rather than t(). What is left is the furniture.
   *
   * The grouping headings (time of day, tip topic, phrase category, price level) live in
   * lib/city-labels.ts and reach t() as variables, so i18n-coverage.spec.ts cannot see them —
   * city-labels.spec.ts checks those instead. */
  'Нийслэл хот': 'The capital',
  'Хөтөлбөр, явган маршрут, хоолны газар, хэрэгтэй мэдээлэл, хэллэг, арга хэмжээ — нэг хуудсанд.':
    'Itineraries, walking routes, places to eat, practical advice, a phrasebook and what is on — on one page.',
  'Хэсэг': 'Section',
  'Улаанбаатарын хөтөлбөр, маршрут, хэллэг': 'Ulaanbaatar itineraries, routes and phrases',

  /* tabs */
  'Аяллын хөтөлбөр': 'Itineraries',
  'Явган маршрут': 'Walking route',
  'Хоол, ресторан': 'Food & restaurants',
  'Хэрэгтэй мэдээлэл': 'Practical guide',
  'Хэллэг': 'Phrasebook',
  'Арга хэмжээ': 'What is on',

  /* itineraries */
  'Хоногийн тоо': 'Number of days',
  'Хөтөлбөрүүд ачаалагдлаа': 'Itineraries loaded',
  'Одоохондоо хөтөлбөр нийтлээгүй байна.': 'No itineraries have been published yet.',
  'Бусад хөтөлбөр харах': 'See the other itineraries',

  /* walking routes */
  'Маршрутууд ачаалагдлаа': 'Routes loaded',
  'Одоохондоо явган маршрут нийтлээгүй байна.': 'No walking routes have been published yet.',
  'Бусад маршрут харах': 'See the other routes',

  /* stops, and the projected route map */
  'Зогсоолуудын байршил': 'Where the stops are',
  'Зогсоол бүртгэгдээгүй байна.': 'No stops have been added yet.',

  /* food — empty until the team adds rows, so this copy is read more than most */
  'Хоолны газрууд ачаалагдлаа': 'Places to eat loaded',
  'Хоолны газруудыг бэлтгэж байна.': 'We are still putting the food guide together.',
  'Манай баг шалгаж, тодорхой мэдээлэлтэйгээр нэмэх хүртэл энэ хэсэг хоосон байна.':
    'This section stays empty until our team has checked each place and can add it with real detail.',
  'Хямд': 'Inexpensive',
  'Дундаж': 'Mid-range',
  'Үнэтэй': 'Expensive',

  /* practical guide */
  'Хэрэгтэй мэдээлэл ачаалагдлаа': 'Practical guide loaded',
  'Одоохондоо хэрэгтэй мэдээлэл нийтлээгүй байна.': 'No practical advice has been published yet.',
  'Бусад': 'Other',
  'Хотоор зорчих': 'Getting around',
  'Сим карт ба төлбөр': 'SIM cards & paying',
  'Цаг агаар ба хувцас': 'Weather & what to wear',
  'Зан заншил': 'Etiquette',

  /* phrasebook */
  'Хэллэгүүд ачаалагдлаа': 'Phrases loaded',
  'Одоохондоо хэллэг нийтлээгүй байна.': 'No phrases have been published yet.',
  'Уншлага': 'Pronunciation',
  'Мэндчилгээ': 'Greetings',
  'Хэрэгтэй үгс': 'Essentials',
  'Хоол, ундаа': 'Food & drink',
  'Зам чиглэл': 'Directions',
  'Тоо, үнэ': 'Numbers & prices',
  'Онцгой тохиолдол': 'Emergencies',

  /* times of day, on an itinerary's stops */
  'Өглөө': 'Morning',
  'Өдөр': 'Midday',
  'Үдээс хойш': 'Afternoon',
  'Орой': 'Evening',

  /* events — also empty until the team adds rows */
  'Арга хэмжээнүүд ачаалагдлаа': 'Events loaded',
  'Энэ долоо хоногт': 'On this week',
  'Дараагийн арга хэмжээнүүд': 'Coming up',
  'Энэ долоо хоногт нийтэлсэн арга хэмжээ байхгүй.': 'There are no published events this week.',
  'Манай баг баталгаажсан арга хэмжээг тогтмол нэмж байна.':
    'Our team adds events here once they are confirmed.',
  'Дэлгэрэнгүй мэдээлэл': 'More information',

  /* ---- Phase 3: the privacy notice on traveller forms ----
   * On the form itself rather than behind a link. Every claim here is enforced in
   * aylayoo-service — see the header of PrivacyNotice.tsx for which test holds which one. */
  'Таны мэдээллийн талаар': 'About your information',
  'Бидэнд: таны нэр, холбоо барих хаяг, хүсэлтийн тайлбар, хүний тоо, хүссэн өдрүүд.':
    'We collect: your name, your contact details, what you wrote, how many of you there are, and your preferred dates.',
  'Бидэнд: таны сонгосон нэр, үнэлгээ, сэтгэгдэл.':
    'We collect: the name you choose to show, your rating and your review.',
  'Үүнийг манай баг харна. Хөтөч таны нэр, тайлбар, өдрүүдийг хүсэлтийг хүлээн авахаас нь өмнө, холбоо барих хаягийг зөвхөн хүлээн авсны дараа харна.':
    'Our team sees this. The guide sees your name, your message and your dates before they accept — your contact details only once they have.',
  'Сэтгэгдлийг манай баг уншиж, нийтлэхээс өмнө шалгана. Нийтлэгдсэний дараа сонгосон нэр, үнэлгээ, сэтгэгдэл нь олон нийтэд харагдана.':
    'Our team reads every review before it is published. Once published, the name you chose, your rating and your review are public.',
  'Холбоо барих хаягийг аяллын өдрөөс эсвэл хүсэлт хаагдсанаас 90 хоногийн дараа устгана. Хүсэлтийг 24 сарын дараа бүрэн устгана.':
    'Your contact details are deleted 90 days after your trip dates, or after the request is closed — whichever is later. The whole request is deleted after 24 months.',
  'Нийтэлсэн сэтгэгдлийг хугацаагүй хадгална. Сэтгэгдэлд холбоо барих хаяг байдаггүй.':
    'A published review is kept indefinitely. A review never holds contact details.',
  'Устгуулахыг хүсвэл хүсэлт илгээсний дараа гарах дугаараа хэлж бидэнтэй холбогдоно уу.':
    'To have it deleted, contact us with the reference you are given after sending this.',
};
