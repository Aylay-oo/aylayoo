-- aylayoo seed data. Safe to run more than once (clears tables first).
DELETE FROM guide_aimags;
DELETE FROM guides;
DELETE FROM places;
DELETE FROM facts;
DELETE FROM team_members;
DELETE FROM aimags;

-- ============ 21 aimags + Ulaanbaatar ============
INSERT INTO aimags (slug, name_mn, name_en, region) VALUES
  ('ulaanbaatar',  'Улаанбаатар',  'Ulaanbaatar',  'capital'),
  ('arkhangai',    'Архангай',     'Arkhangai',    'khangai'),
  ('bayan-ulgii',  'Баян-Өлгий',   'Bayan-Ölgii',  'western'),
  ('bayankhongor', 'Баянхонгор',   'Bayankhongor', 'khangai'),
  ('bulgan',       'Булган',       'Bulgan',       'khangai'),
  ('govi-altai',   'Говь-Алтай',   'Govi-Altai',   'western'),
  ('govisumber',   'Говьсүмбэр',   'Govisümber',   'central'),
  ('darkhan-uul',  'Дархан-Уул',   'Darkhan-Uul',  'central'),
  ('dornogovi',    'Дорноговь',    'Dornogovi',    'central'),
  ('dornod',       'Дорнод',       'Dornod',       'eastern'),
  ('dundgovi',     'Дундговь',     'Dundgovi',     'central'),
  ('zavkhan',      'Завхан',       'Zavkhan',      'western'),
  ('orkhon',       'Орхон',        'Orkhon',       'khangai'),
  ('uvurkhangai',  'Өвөрхангай',   'Övörkhangai',  'khangai'),
  ('umnugovi',     'Өмнөговь',     'Ömnögovi',     'central'),
  ('sukhbaatar',   'Сүхбаатар',    'Sükhbaatar',   'eastern'),
  ('selenge',      'Сэлэнгэ',      'Selenge',      'central'),
  ('tuv',          'Төв',          'Töv',          'central'),
  ('uvs',          'Увс',          'Uvs',          'western'),
  ('khovd',        'Ховд',         'Khovd',        'western'),
  ('khuvsgul',     'Хөвсгөл',      'Khövsgöl',     'khangai'),
  ('khentii',      'Хэнтий',       'Khentii',      'eastern');

-- ============ Must-see places ============
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, lat, lng, is_must_see) VALUES
  ((SELECT id FROM aimags WHERE slug='khuvsgul'), 'Хөвсгөл нуур', 'Khövsgöl Lake',
   'Монголын хамгийн том цэнгэг устай нуур.', 'Mongolia''s largest freshwater lake, often called the Blue Pearl.', 'nature', 51.0, 100.5, 1),
  ((SELECT id FROM aimags WHERE slug='umnugovi'), 'Хонгорын элс', 'Khongoryn Els Sand Dunes',
   'Говийн хамгийн том элсэн манхан.', 'The largest sand dunes in the Mongolian Gobi.', 'nature', 43.78, 102.2, 1),
  ((SELECT id FROM aimags WHERE slug='umnugovi'), 'Ёлын ам', 'Yolyn Am',
   'Зуны улиралд ч мөс хадгалагддаг хавцал.', 'A deep gorge where ice can last into summer.', 'nature', 43.49, 104.07, 1),
  ((SELECT id FROM aimags WHERE slug='umnugovi'), 'Баянзаг', 'Bayanzag (Flaming Cliffs)',
   'Үлэг гүрвэлийн олдвороороо алдартай улаан хадат газар.', 'Red cliffs famous for dinosaur fossil discoveries.', 'historical', 44.14, 103.72, 1),
  ((SELECT id FROM aimags WHERE slug='uvurkhangai'), 'Улаан цутгалан хүрхрээ', 'Orkhon Waterfall',
   'Орхоны хөндийн үзэсгэлэнт хүрхрээ.', 'A beautiful waterfall in the Orkhon Valley.', 'nature', 46.79, 101.95, 1),
  ((SELECT id FROM aimags WHERE slug='uvurkhangai'), 'Эрдэнэ Зуу хийд', 'Erdene Zuu Monastery',
   'Хархорин дахь Монголын хамгийн эртний буддын хийдүүдийн нэг.', 'One of Mongolia''s oldest Buddhist monasteries, in Kharkhorin.', 'historical', 47.2, 102.84, 1),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Горхи-Тэрэлж', 'Gorkhi-Terelj National Park',
   'Улаанбаатараас ойрхон байгалийн цогцолбор газар.', 'A national park with rock formations, close to Ulaanbaatar.', 'nature', 47.98, 107.46, 1),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Чингис хааны морьт хөшөө', 'Chinggis Khaan Equestrian Statue',
   'Дэлхийн хамгийн том морьт хөшөөний нэг.', 'One of the largest equestrian statues in the world.', 'cultural', 47.81, 107.53, 1),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Хустайн байгалийн цогцолбор газар', 'Khustai National Park',
   'Тахь буюу Пржевальскийн морь нутагладаг газар.', 'Home of the takhi, the wild Przewalski''s horse.', 'nature', 47.75, 105.87, 1),
  ((SELECT id FROM aimags WHERE slug='arkhangai'), 'Тэрхийн Цагаан нуур', 'Terkhiin Tsagaan Lake',
   'Унтарсан галт уулын дэргэдэх цэнгэг устай нуур.', 'A freshwater lake next to an extinct volcano.', 'nature', 48.17, 99.72, 1),
  ((SELECT id FROM aimags WHERE slug='bayan-ulgii'), 'Алтай Таван Богд', 'Altai Tavan Bogd National Park',
   'Монголын хамгийн өндөр оргилтой мөсөн голт уулс.', 'Glaciers and Mongolia''s highest peaks.', 'nature', 49.15, 87.9, 1),
  ((SELECT id FROM aimags WHERE slug='ulaanbaatar'), 'Гандантэгчэнлин хийд', 'Gandan Monastery',
   'Улаанбаатарын төвд байрлах томоохон хийд.', 'The main Buddhist monastery in Ulaanbaatar.', 'cultural', 47.92, 106.89, 1);

-- ============ Sample guides (fake data for testing) ============
INSERT INTO guides (type, name, bio_mn, bio_en, languages, trip_types, phone, email, status) VALUES
  ('individual', 'Бат-Эрдэнэ (sample)', 'Хөвсгөлд 10 жил хөтөч хийсэн.', '10 years guiding around Khövsgöl.', '["mn","en"]', '["countryside"]', '+976 9911 0001', 'bat@example.com', 'approved'),
  ('company', 'Gobi Adventures (sample)', 'Говийн аялал зохион байгуулдаг компани.', 'Tour company specialising in Gobi trips.', '["mn","en","ko"]', '["countryside"]', '+976 7011 0002', 'info@gobi.example.com', 'approved'),
  ('individual', 'Сараа (sample)', 'Улаанбаатар хотын аялал.', 'City tours of Ulaanbaatar.', '["mn","en","ja"]', '["city"]', '+976 8811 0003', 'saraa@example.com', 'approved'),
  ('company', 'Steppe Travel (sample)', 'Төв болон Хангайн бүсийн аялал.', 'Trips across central Mongolia.', '["mn","en","ru","de"]', '["city","countryside"]', '+976 7722 0004', 'hello@steppe.example.com', 'approved'),
  ('individual', 'Тэмүүлэн (sample)', 'Алтайн уулын аялал.', 'Mountain trekking in the Altai.', '["mn","en"]', '["countryside"]', '+976 9922 0005', 'temuulen@example.com', 'pending');

INSERT INTO guide_aimags (guide_id, aimag_id)
  SELECT g.id, a.id FROM guides g, aimags a WHERE
    (g.email='bat@example.com'           AND a.slug='khuvsgul') OR
    (g.email='info@gobi.example.com'     AND a.slug IN ('umnugovi','dundgovi')) OR
    (g.email='saraa@example.com'         AND a.slug='ulaanbaatar') OR
    (g.email='hello@steppe.example.com'  AND a.slug IN ('tuv','uvurkhangai','arkhangai')) OR
    (g.email='temuulen@example.com'      AND a.slug='bayan-ulgii');

-- ============ Facts for travelers ============
INSERT INTO facts (title_mn, title_en, body_mn, body_en, icon, sort_order) VALUES
  ('Мөнгөн тэмдэгт', 'Currency', 'Монгол төгрөг (MNT). Хотод карт ихэвчлэн ажилладаг, хөдөө бэлэн мөнгө авч яваарай.', 'Mongolian tögrög (MNT). Cards work in the city; bring cash to the countryside.', 'wallet', 1),
  ('Цаг агаар', 'Weather', 'Зун дулаан, өвөл маш хүйтэн. Аялахад хамгийн тохиромжтой нь 6-9 сар.', 'Warm summers, very cold winters. June to September is the best time to travel.', 'sun', 2),
  ('Цахилгаан', 'Electricity', '230V. C болон E төрлийн залгуур.', '230V, plug types C and E.', 'plug', 3),
  ('Яаралтай тусламж', 'Emergency', 'Цагдаа 102, түргэн тусламж 103.', 'Police 102, ambulance 103.', 'phone', 4),
  ('Виз', 'Visa', 'Олон улсын иргэд визгүй зорчих боломжтой. Явахаасаа өмнө шалгаарай.', 'Many nationalities can visit visa-free. Check the latest rules before you travel.', 'passport', 5);

-- ============ Team (edit with your real names) ============
INSERT INTO team_members (name, role, sort_order) VALUES
  ('Member 1', 'Backend developer', 1),
  ('Member 2', 'Frontend developer', 2),
  ('Member 3', 'Designer', 3);
