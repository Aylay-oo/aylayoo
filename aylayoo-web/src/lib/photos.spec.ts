import { PHOTO_KEYS, photoKey, photoUrl } from './photos';

/* The expectations below are the design's own output, produced by running its photoKey()
 * over the same inputs. They are here because a drifting photo lookup is invisible: the
 * page still renders, just with the wrong picture for a place. */

describe('photoUrl', () => {
  it('points at the extracted file', () => {
    expect(photoUrl('khuvsgul')).toBe('/images/khuvsgul.jpg');
  });
});

describe('photoKey', () => {
  it('has all 41 photos from the design', () => {
    expect(PHOTO_KEYS).toHaveLength(41);
    expect(new Set(PHOTO_KEYS).size).toBe(41);
  });

  describe('a pinned name wins over the image type', () => {
    // Each of these is the reason BY_NAME exists: the type alone would pick a generic
    // photo, but the design pinned a specific one.
    it.each([
      ['Хөвсгөл нуур (Далай ээж)', 'lake', 'khuvsgul'],
      ['Цаатан иргэдийн ахуй', 'forest', 'tsaatan'],
      ['Хонгорын элс', 'desert', 'khongor'],
      ['Баянзаг', 'desert', 'flaming_cliffs'],
      ['Ёлын ам', 'mountain', 'yol'],
      ['Хорго галт уул', 'mountain', 'khorgo'],
      ['Тэрхийн Цагаан нуур', 'lake', 'larch_lake'],
      ['Эрдэнэ зуу хийд', 'temple', 'erdene_zuu'],
      ['Орхоны хүрхрээ', 'falls', 'orkhon_falls'],
      ['Алтай Таван Богд', 'mountain', 'khuiten'],
      ['Хүйтэн оргил', 'mountain', 'khuiten'],
      ['Потанины мөсөн гол', 'mountain', 'glacier_riders'],
      ['Бүргэдийн баяр', 'steppe', 'eagle'],
      ['Горхи-Тэрэлж', 'mountain', 'melkhii'],
      ['Мэлхий хад', 'mountain', 'melkhii'],
      ['Хустайн нуруу', 'steppe', 'horses'],
      ['Цонжин Болдог', 'monument', 'chinggis_statue'],
      ['Амарбаясгалант хийд', 'temple', 'amarbayasgalant'],
      ['Зайсан толгой', 'city', 'ub_aerial'],
    ])('%s → %s', (name, type, expected) => {
      expect(photoKey(type, name)).toBe(expected);
    });

    it('matches on a substring, as the design\'s regexes did', () => {
      // "Хөвсгөл нуур (Далай ээж)" and "Хөвсгөл нуурын зүүн эрэг" both contain the pattern.
      expect(photoKey('steppe', 'Хөвсгөл нуурын зүүн эрэг')).toBe('khuvsgul');
    });

    // The must-see titles name two places at once, so two patterns match and the earlier
    // entry has to win. Getting the order wrong swaps the photo on the carousel's largest
    // image, which is why these cases are pinned.
    it.each([
      ['Тэрхийн Цагаан нуур & Хорго', 'lake', 'khorgo'],
      ['Хонгорын элс & Баянзаг', 'desert', 'khongor'],
      ['Эрдэнэ зуу & Хархорум', 'temple', 'erdene_zuu'],
    ])('takes the first matching pattern for %s', (name, type, expected) => {
      expect(photoKey(type, name)).toBe(expected);
    });
  });

  it('uses the image type directly when it is itself a photo', () => {
    // The city tiles and the Terelj showcase pass photo keys as the type.
    expect(photoKey('melkhii')).toBe('melkhii');
    expect(photoKey('horse_rider')).toBe('horse_rider');
    expect(photoKey('choijin', 'Чойжин ламын сүм музей')).toBe('choijin');
  });

  describe('otherwise it hashes into the type pool', () => {
    it.each([
      ['lake', 'Толбо нуур', 'larch_lake'],
      ['lake', 'Орог нуур', 'cattle_lake'],
      ['mountain', 'Цамбагарав уул', 'valley_ger'],
      ['mountain', 'Их Богд уул', 'snow_gers'],
      ['desert', 'Молцог элс', 'camels'],
      ['steppe', 'Тайхар чулуу', 'herder_goats'],
      ['temple', 'Хамарын хийд', 'choijin'],
      ['city', 'Дархан хотын музей', 'gov_square'],
      ['monument', 'Халх голын дурсгал', 'chinggis_statue'],
      ['cave', 'Цагаан агуй', 'flaming_cliffs'],
    ])('%s / %s → %s', (type, name, expected) => {
      expect(photoKey(type, name)).toBe(expected);
    });

    it('is stable: the same place always gets the same photo', () => {
      const first = photoKey('lake', 'Хяргас нуур');
      expect(photoKey('lake', 'Хяргас нуур')).toBe(first);
      expect(photoKey('lake', 'Хяргас нуур')).toBe(first);
    });

    it('spreads a pool across different names rather than always picking the first', () => {
      const chosen = new Set(
        ['Увс нуур', 'Толбо нуур', 'Хяргас нуур', 'Тэлмэн нуур', 'Орог нуур', 'Хөх нуур']
          .map((name) => photoKey('lake', name)),
      );
      expect(chosen.size).toBeGreaterThan(1);
    });

    it('falls back to the steppe pool for an unknown type', () => {
      // "sand" is not a pool the design defined.
      expect(photoKey('sand', 'Говийн элс')).toBe('sheep_sunset');
      expect(photoKey('sand', 'Говийн элс')).toBe(photoKey('steppe', 'Говийн элс'));
    });

    it('still returns a photo with nothing to go on', () => {
      expect(PHOTO_KEYS).toContain(photoKey(null));
      expect(PHOTO_KEYS).toContain(photoKey(undefined, null));
      expect(PHOTO_KEYS).toContain(photoKey('', ''));
    });
  });
});
