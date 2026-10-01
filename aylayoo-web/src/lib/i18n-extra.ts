/* Strings the design's dictionary does not have, because the mockup had no backend.
 *
 * Kept apart from i18n-dictionary.ts so that file stays a verbatim copy of the design's
 * I18N_EN and can be regenerated from it at any time. Everything here is new UI: loading
 * and error states, the guide registration form, and the dialog's success copy.
 */

export const I18N_EXTRA: Readonly<Record<string, string>> = {
  /* ---- navigation the design did not have ---- */
  'Үндсэн агуулга руу шилжих': 'Skip to main content',

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
  'Нэр': 'Name',
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

  /* ---- language names, for the guide cards and the registration form ---- */
  Монгол: 'Mongolian',
  Англи: 'English',
  Орос: 'Russian',
  Хятад: 'Chinese',
  Япон: 'Japanese',
  Солонгос: 'Korean',
  Франц: 'French',
  Герман: 'German',
  Испани: 'Spanish',
  Итали: 'Italian',
};
