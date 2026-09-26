-- aylayoo PRODUCTION data import — review before running.
-- Generated from apps/aylayoo/design/aylayoo_3.html + its I18N_EN dictionary.
--
-- Run only AFTER migration 0001 is applied, and only after a backup:
--   bunx wrangler d1 export aylayoo-db --remote --output=backups/pre-0001.sql
--   bunx wrangler d1 migrations apply aylayoo-db --remote
--   bunx wrangler d1 execute aylayoo-db --remote --file=seed/prod-2026-09-26-design-import.sql
--
-- What this does NOT do: it never DELETEs a place, an aimag or a real guide, and it never
-- writes a rating. Every INSERT is guarded so a second run cannot duplicate rows.
--
-- Contents:
--   1. backfill iso_code / center / area on the 22 existing aimags
--   2. update the 12 existing places to the design's names and text
--   3. insert the 55 design places that are not in the database yet
--   4. clear is_must_see on everything, then set it on exactly the design's 6
--   5. replace the 3 placeholder team members with the 4 real ones
--   6. delete the 5 "(sample)" guides seeded before launch

-- ---------- 1. Aimags: iso_code, centre town and area ----------
UPDATE aimags SET iso_code='MN-071', center_mn='Өлгий', center_en='Ölgii', area_km2=45.7 WHERE slug='bayan-ulgii';
UPDATE aimags SET iso_code='MN-043', center_mn='Ховд', center_en='Khovd', area_km2=76.1 WHERE slug='khovd';
UPDATE aimags SET iso_code='MN-046', center_mn='Улаангом', center_en='Ulaangom', area_km2=69.6 WHERE slug='uvs';
UPDATE aimags SET iso_code='MN-057', center_mn='Улиастай', center_en='Uliastai', area_km2=82.5 WHERE slug='zavkhan';
UPDATE aimags SET iso_code='MN-065', center_mn='Алтай', center_en='Altai', area_km2=141.4 WHERE slug='govi-altai';
UPDATE aimags SET iso_code='MN-041', center_mn='Мөрөн', center_en='Mörön', area_km2=100.6 WHERE slug='khuvsgul';
UPDATE aimags SET iso_code='MN-073', center_mn='Цэцэрлэг', center_en='Tsetserleg', area_km2=55.3 WHERE slug='arkhangai';
UPDATE aimags SET iso_code='MN-067', center_mn='Булган', center_en='Bulgan', area_km2=48.7 WHERE slug='bulgan';
UPDATE aimags SET iso_code='MN-055', center_mn='Арвайхээр', center_en='Arvaikheer', area_km2=62.9 WHERE slug='uvurkhangai';
UPDATE aimags SET iso_code='MN-069', center_mn='Баянхонгор', center_en='Bayankhongor', area_km2=116.0 WHERE slug='bayankhongor';
UPDATE aimags SET iso_code='MN-035', center_mn='Эрдэнэт', center_en='Erdenet', area_km2=0.8 WHERE slug='orkhon';
UPDATE aimags SET iso_code='MN-047', center_mn='Зуунмод', center_en='Zuunmod', area_km2=74.0 WHERE slug='tuv';
UPDATE aimags SET iso_code='MN-049', center_mn='Сүхбаатар', center_en='Sükhbaatar', area_km2=41.2 WHERE slug='selenge';
UPDATE aimags SET iso_code='MN-037', center_mn='Дархан', center_en='Darkhan', area_km2=3.3 WHERE slug='darkhan-uul';
UPDATE aimags SET iso_code='MN-064', center_mn='Чойр', center_en='Choir', area_km2=5.5 WHERE slug='govisumber';
UPDATE aimags SET iso_code='MN-059', center_mn='Мандалговь', center_en='Mandalgovi', area_km2=74.7 WHERE slug='dundgovi';
UPDATE aimags SET iso_code='MN-053', center_mn='Даланзадгад', center_en='Dalanzadgad', area_km2=165.4 WHERE slug='umnugovi';
UPDATE aimags SET iso_code='MN-063', center_mn='Сайншанд', center_en='Sainshand', area_km2=109.5 WHERE slug='dornogovi';
UPDATE aimags SET iso_code='MN-039', center_mn='Чингис', center_en='Chinggis', area_km2=80.3 WHERE slug='khentii';
UPDATE aimags SET iso_code='MN-061', center_mn='Чойбалсан', center_en='Choibalsan', area_km2=123.6 WHERE slug='dornod';
UPDATE aimags SET iso_code='MN-051', center_mn='Баруун-Урт', center_en='Baruun-Urt', area_km2=82.3 WHERE slug='sukhbaatar';
UPDATE aimags SET iso_code='MN-1', center_mn='Улаанбаатар', center_en='Ulaanbaatar', area_km2=4.7 WHERE slug='ulaanbaatar';

-- ---------- 2. The 12 places already in production ----------
-- Matched on aimag + current name. `category`, `lat` and `lng` are deliberately
-- left alone: those rows were curated by hand and have real coordinates.
UPDATE places SET name_mn='Хөвсгөл нуур (Далай ээж)', name_en='Lake Khövsgöl (Dalai Eej)', description_mn='Цэнгэг уст нуур', description_en='Freshwater lake', image_key='lake', best_months_mn='6–8 сар', best_months_en='Jun–Aug', must_title_mn='Хөвсгөл нуур (Далай ээж)', must_title_en='Lake Khövsgöl (Dalai Eej)', must_summary_mn='Монгол улсын цэнгэг усны 70%-ийг бүрдүүлдэг, «Хөх сувд» хэмээн алдаршсан тунгалаг нуур.', must_summary_en='A crystal-clear lake holding 70% of Mongolia''s fresh water, known as the Blue Pearl.'   -- renamed from «Хөвсгөл нуур»
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='khuvsgul') AND name_mn='Хөвсгөл нуур';
UPDATE places SET name_mn='Хонгорын элс', name_en='Khongor Sand Dunes', description_mn='Дуулдаг элсэн манхан', description_en='The singing sand dunes', image_key='desert', best_months_mn='5–10 сар', best_months_en='May–Oct', must_title_mn='Хонгорын элс & Баянзаг', must_title_en='Khongor Sand Dunes & Bayanzag', must_summary_mn='Үлэг гүрвэлийн өндөг олдсон Баянзаг болон дуулдаг элс хэмээгддэг Хонгорын элс.', must_summary_en='Bayanzag, where dinosaur eggs were found, and the singing dunes of Khongor.'
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='umnugovi') AND name_mn='Хонгорын элс';
UPDATE places SET name_mn='Ёлын ам', name_en='Yolyn Am gorge', description_mn='Зуны дундуур мөстэй хавцал', description_en='A gorge with ice even in midsummer', image_key='mountain', best_months_mn=NULL, best_months_en=NULL, must_title_mn=NULL, must_title_en=NULL, must_summary_mn=NULL, must_summary_en=NULL
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='umnugovi') AND name_mn='Ёлын ам';
UPDATE places SET name_mn='Баянзаг', name_en='Bayanzag', description_mn='Үлэг гүрвэлийн өндөг олдсон улаан хад', description_en='Red cliffs where dinosaur eggs were found', image_key='desert', best_months_mn=NULL, best_months_en=NULL, must_title_mn=NULL, must_title_en=NULL, must_summary_mn=NULL, must_summary_en=NULL
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='umnugovi') AND name_mn='Баянзаг';
UPDATE places SET name_mn='Орхоны хүрхрээ', name_en='Orkhon Waterfall', description_mn='Галт уулын хад дундах хүрхрээ', description_en='A waterfall among volcanic rocks', image_key='falls', best_months_mn=NULL, best_months_en=NULL, must_title_mn=NULL, must_title_en=NULL, must_summary_mn=NULL, must_summary_en=NULL   -- renamed from «Улаан цутгалан хүрхрээ»
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='uvurkhangai') AND name_mn='Улаан цутгалан хүрхрээ';
UPDATE places SET name_mn='Эрдэнэ зуу хийд', name_en='Erdene Zuu Monastery', description_mn='Хархорум, эртний нийслэлийн өв', description_en='Karakorum, the ancient capital', image_key='temple', best_months_mn='5–9 сар', best_months_en='May–Sep', must_title_mn='Эрдэнэ зуу & Хархорум', must_title_en='Erdene Zuu & Karakorum', must_summary_mn='Их Монгол Улсын нийслэл байсан Хархорумын туурь, Монголын анхны буддын хийд.', must_summary_en='The ruins of Karakorum, capital of the Mongol Empire, and Mongolia''s first Buddhist monastery.'   -- renamed from «Эрдэнэ Зуу хийд»
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='uvurkhangai') AND name_mn='Эрдэнэ Зуу хийд';
UPDATE places SET name_mn='Горхи-Тэрэлж', name_en='Gorkhi-Terelj', description_mn='Мэлхий хад, Ариябалын хийд', description_en='Turtle Rock, Aryapala Temple', image_key='mountain', best_months_mn='Жилийн турш', best_months_en='All year', must_title_mn='Горхи-Тэрэлж', must_title_en='Gorkhi-Terelj', must_summary_mn='Нийслэлээс 1.5 цагийн зайтай, хадат уулс, ой, голтой амралтын бүс.', must_summary_en='A getaway 1.5 hours from the capital with rocky hills, forests and rivers.'
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='tuv') AND name_mn='Горхи-Тэрэлж';
UPDATE places SET name_mn='Цонжин Болдог', name_en='Tsonjin Boldog', description_mn='Чингис хааны морьт хөшөө', description_en='Chinggis Khaan Equestrian Statue', image_key='monument', best_months_mn=NULL, best_months_en=NULL, must_title_mn=NULL, must_title_en=NULL, must_summary_mn=NULL, must_summary_en=NULL   -- renamed from «Чингис хааны морьт хөшөө»
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='tuv') AND name_mn='Чингис хааны морьт хөшөө';
UPDATE places SET name_mn='Хустайн нуруу', name_en='Khustai National Park', description_mn='Зэрлэг адуу тахь', description_en='Wild Przewalski''s horses', image_key='steppe', best_months_mn=NULL, best_months_en=NULL, must_title_mn=NULL, must_title_en=NULL, must_summary_mn=NULL, must_summary_en=NULL   -- renamed from «Хустайн байгалийн цогцолбор газар»
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='tuv') AND name_mn='Хустайн байгалийн цогцолбор газар';
UPDATE places SET name_mn='Тэрхийн Цагаан нуур', name_en='Terkhiin Tsagaan Lake', description_mn='Галт уулын тогоо, Хорго уул', description_en='Volcanic crater and Khorgo Mountain', image_key='lake', best_months_mn='6–9 сар', best_months_en='Jun–Sep', must_title_mn='Тэрхийн Цагаан нуур & Хорго', must_title_en='Terkhiin Tsagaan Lake & Khorgo', must_summary_mn='Сөнөсөн галт уул болон түүний хажууд орших, галт уулын далангаас үүссэн үзэсгэлэнт нуур.', must_summary_en='An extinct volcano and the beautiful lake formed beside it by a lava dam.'
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='arkhangai') AND name_mn='Тэрхийн Цагаан нуур';
UPDATE places SET name_mn='Алтай Таван Богд', name_en='Altai Tavan Bogd', description_mn='Монголын хамгийн өндөр Хүйтэн оргил (4374 м)', description_en='Khüiten, Mongolia''s highest peak (4,374 m)', image_key='mountain', best_months_mn='7–9 сар', best_months_en='Jul–Sep', must_title_mn='Алтай Таван Богд', must_title_en='Altai Tavan Bogd', must_summary_mn='Мөнх цаст оргилууд, мөсөн гол, казах бүргэдчдийн уламжлал бүхий баруун хязгаар.', must_summary_en='The far west: snow-capped peaks, glaciers and Kazakh eagle-hunting traditions.'
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='bayan-ulgii') AND name_mn='Алтай Таван Богд';
UPDATE places SET name_mn='Гандантэгчэнлин хийд', name_en='Gandantegchinlen Monastery', description_mn='Мэгжид Жанрайсиг сүм', description_en='Migjid Janraisig Temple', image_key='temple', best_months_mn=NULL, best_months_en=NULL, must_title_mn=NULL, must_title_en=NULL, must_summary_mn=NULL, must_summary_en=NULL
  WHERE aimag_id=(SELECT id FROM aimags WHERE slug='ulaanbaatar') AND name_mn='Гандантэгчэнлин хийд';

-- ---------- 3. The 55 places not in production yet ----------
-- Each INSERT ... SELECT ... WHERE NOT EXISTS is a no-op if the row is already there.
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Потанины мөсөн гол', 'Potanin Glacier', 'Монголын хамгийн том мөсөн гол', 'Mongolia''s largest glacier', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayan-ulgii'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Потанины мөсөн гол');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Толбо нуур', 'Tolbo Lake', 'Өндөр уулын цэнгэг нуур', 'High-mountain freshwater lake', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayan-ulgii'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Толбо нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Бүргэдийн баяр', 'Golden Eagle Festival', 'Казах бүргэдчдийн намрын уламжлалт наадам', 'Autumn festival of Kazakh eagle hunters', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayan-ulgii'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Бүргэдийн баяр');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хар-Ус нуур', 'Khar-Us Lake', 'Нүүдлийн шувуудын диваажин', 'A haven for migratory birds', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khovd'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хар-Ус нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цамбагарав уул', 'Tsambagarav Mountain', 'Мөнх цаст сүрлэг уул', 'Majestic snow-capped mountain', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khovd'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цамбагарав уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цэнхэрийн агуй', 'Tsenkher Cave', 'Эртний хадны зурагтай агуй', 'Cave with ancient rock paintings', 'nature', 'cave', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khovd'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цэнхэрийн агуй');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Увс нуур', 'Uvs Lake', 'Монголын хамгийн том нуур, ЮНЕСКО-ийн өв', 'Mongolia''s largest lake, a UNESCO site', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='uvs'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Увс нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хяргас нуур', 'Khyargas Lake', 'Давстай нуур, халуун рашаан', 'Salt lake with hot springs', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='uvs'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хяргас нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Алтан элс', 'Altan Els dunes', 'Хойд зүгийн элсэн манхан', 'Northern sand dunes', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='uvs'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Алтан элс');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Отгонтэнгэр уул', 'Otgontenger Mountain', 'Хангайн хамгийн өндөр, тахилгат оргил', 'The highest and most sacred peak of the Khangai', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='zavkhan'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Отгонтэнгэр уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Мөнгөн морьт элс', 'Möngön Morit dunes', 'Нуурын дэргэдэх элсэн манхан', 'Sand dunes beside a lake', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='zavkhan'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Мөнгөн морьт элс');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Тэлмэн нуур', 'Telmen Lake', 'Давстай өндөрлөг нуур', 'High-altitude salt lake', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='zavkhan'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Тэлмэн нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Эж хайрхан', 'Ej Khairkhan', 'Хадан хавцалтай тахилгат уул', 'Sacred mountain with rocky gorges', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='govi-altai'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Эж хайрхан');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Сутай уул', 'Sutai Mountain', 'Говь-Алтайн мөнх цаст оргил', 'Snow-capped peak of the Gobi-Altai', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='govi-altai'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Сутай уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Шаргын говь', 'Shargyn Gobi', 'Тахь, хавтгай бүхий хамгаалалтын бүс', 'Protected area with wild horses and wild camels', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='govi-altai'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Шаргын говь');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цаатан иргэдийн ахуй', 'Tsaatan reindeer herders', 'Тайгын цаатан ахуйтай танилцах', 'Meet the reindeer herders of the taiga', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khuvsgul'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цаатан иргэдийн ахуй');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хорьдол сарьдагийн нуруу', 'Khoridol Saridag range', 'Бартаат замаар явган аялал', 'Trekking on rugged trails', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khuvsgul'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хорьдол сарьдагийн нуруу');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Уушгийн өвөр буган хөшөө', 'Uushigiin Övör deer stones', 'Хүрэл зэвсгийн үеийн дурсгал', 'Bronze Age monuments', 'historical', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khuvsgul'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Уушгийн өвөр буган хөшөө');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Тайхар чулуу', 'Taikhar Rock', 'Домогт аварга хад', 'A giant rock of legend', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='arkhangai'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Тайхар чулуу');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цэнхэрийн халуун рашаан', 'Tsenkher Hot Springs', 'Байгалийн халуун рашаан', 'Natural hot springs', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='arkhangai'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цэнхэрийн халуун рашаан');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хөгнө хан уул', 'Khögnö Khan Mountain', 'Элсэн тасархай, Өвгөн хийд', 'Elsen Tasarkhai dunes and Övgön Monastery', 'cultural', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bulgan'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хөгнө хан уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Уран тогоо', 'Uran Togoo', 'Унтарсан галт уулын тогоо', 'Extinct volcanic crater', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bulgan'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Уран тогоо');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хар бух балгас', 'Khar Bukh Balgas', 'Хятан үеийн хотын туурь', 'Ruins of a Khitan-era city', 'historical', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bulgan'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хар бух балгас');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Төвхөн хийд', 'Tövkhön Monastery', 'Уулын оройн дахь Занабазарын хийд', 'Zanabazar''s hilltop monastery', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='uvurkhangai'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Төвхөн хийд');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Ихбогд уул', 'Ikh Bogd Mountain', 'Говь-Алтайн нурууны хамгийн өндөр оргил (3957 м)', 'Highest peak of the Gobi-Altai range (3,957 m)', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayankhongor'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Ихбогд уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цагаан агуй', 'Tsagaan Cave', 'Чулуун зэвсгийн үеийн хүний ул мөр', 'Traces of Stone Age people', 'nature', 'cave', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayankhongor'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цагаан агуй');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Шаргалжуутын рашаан', 'Shargaljuut Hot Springs', 'Хэдэн зуун халуун, хүйтэн булаг', 'Hundreds of hot and cold springs', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayankhongor'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Шаргалжуутын рашаан');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Орог нуур', 'Orog Lake', 'Говийн бэлчир нуур', 'Gobi delta lake', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='bayankhongor'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Орог нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Эрдэнэтийн уурхайн үзэх цэг', 'Erdenet mine viewpoint', 'Азийн томоохон зэсийн уурхай', 'One of Asia''s largest copper mines', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='orkhon'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Эрдэнэтийн уурхайн үзэх цэг');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Найрамдлын хөшөө', 'Friendship Monument', 'Хотын дурсгалт газар', 'City landmark', 'historical', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='orkhon'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Найрамдлын хөшөө');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Манзуширын хийд', 'Manzushir Monastery', 'Богд хан уулын өвөр дэх хийдийн туурь', 'Monastery ruins on Bogd Khan Mountain', 'historical', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='tuv'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Манзуширын хийд');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Амарбаясгалант хийд', 'Amarbayasgalant Monastery', 'Монголын хамгийн үзэсгэлэнтэй хийдийн нэг', 'One of Mongolia''s most beautiful monasteries', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='selenge'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Амарбаясгалант хийд');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Сэлэнгэ мөрөн', 'Selenge River', 'Монголын хамгийн их устай гол', 'Mongolia''s largest river by volume', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='selenge'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Сэлэнгэ мөрөн');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Шаамарын ой', 'Shaamar forest', 'Хойд нутгийн нарсан ой', 'Northern pine forest', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='selenge'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Шаамарын ой');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хар гол', 'Khar River', 'Голын эрэг дагуух амралт', 'Riverside relaxation', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='darkhan-uul'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хар гол');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Дархан хотын музей', 'Darkhan City Museum', 'Хотын түүх, соёл', 'City history and culture', 'city', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='darkhan-uul'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Дархан хотын музей');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Чойрын Богд уул', 'Choir Bogd Mountain', 'Хадат уулс, дархан цаазат газар', 'Rocky mountains, strictly protected area', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='govisumber'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Чойрын Богд уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Бага газрын чулуу', 'Baga Gazryn Chuluu', 'Боржин хад, хийдийн туурь', 'Granite rocks and monastery ruins', 'historical', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dundgovi'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Бага газрын чулуу');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цагаан суварга', 'Tsagaan Suvarga', 'Олон өнгийн шохойн цавчим', 'Multicoloured limestone cliffs', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dundgovi'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цагаан суварга');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Их газрын чулуу', 'Ikh Gazryn Chuluu', 'Хадат уулс, байгалийн цогцолбор', 'Rocky hills, nature reserve', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dundgovi'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Их газрын чулуу');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хамарын хийд', 'Khamar Monastery', 'Говийн энергийн төв', 'The Gobi''s energy centre', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dornogovi'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хамарын хийд');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Цонжийн чулуу', 'Tsonjiin Chuluu', 'Байгалийн хадан баганууд', 'Natural stone columns', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dornogovi'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Цонжийн чулуу');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Сүйхэнт', 'Süikhent', 'Чулуужсан модны цогцолбор', 'Petrified forest', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dornogovi'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Сүйхэнт');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Бурхан Халдун', 'Burkhan Khaldun', 'Чингис хааны тахилгат уул', 'Chinggis Khaan''s sacred mountain', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khentii'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Бурхан Халдун');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Хөх нуур', 'Khökh Lake', 'Тэмүжин хаан өргөмжлөгдсөн газар', 'Where Temüjin was proclaimed khan', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khentii'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Хөх нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Дэлүүн болдог', 'Delüün Boldog', 'Чингис хааны төрсөн газар гэх домогтой', 'Legendary birthplace of Chinggis Khaan', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='khentii'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Дэлүүн болдог');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Буйр нуур', 'Buir Lake', 'Зүүн бүсийн хамгийн том нуур', 'The largest lake in the east', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dornod'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Буйр нуур');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Халх голын дурсгал', 'Khalkhyn Gol memorials', '1939 оны тулалдааны дурсгалт газрууд', 'Sites of the 1939 battle', 'historical', 'monument', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dornod'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Халх голын дурсгал');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Монгол дагуурын тал', 'Mongol Daguur steppe', 'Цагаан зээрийн нүүдэл', 'Migration of Mongolian gazelles', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='dornod'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Монгол дагуурын тал');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Шилийн богд уул', 'Shiliin Bogd Mountain', 'Нар угтах тахилгат уул', 'Sacred mountain for greeting the sunrise', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='sukhbaatar'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Шилийн богд уул');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Дарьганга', 'Dariganga', 'Хүн чулуу, Ганга нуур', 'Stone statues and Ganga Lake', 'historical', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='sukhbaatar'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Дарьганга');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Молцог элс', 'Moltsog dunes', 'Талын дундах элсэн манхан', 'Sand dunes in the middle of the steppe', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='sukhbaatar'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Молцог элс');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Чингис хаан музей', 'Chinggis Khaan Museum', 'Монголын түүхийн шинэ музей', 'Mongolia''s new history museum', 'city', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='ulaanbaatar'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Чингис хаан музей');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Богд хааны ордон музей', 'Bogd Khan Palace Museum', 'Сүүлчийн хааны өвөлжөө', 'Winter palace of the last khan', 'city', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='ulaanbaatar'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Богд хааны ордон музей');
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en)
  SELECT a.id, 'Зайсан толгой', 'Zaisan Hill', 'Хотын панорам', 'City panorama', 'city', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL FROM aimags a WHERE a.slug='ulaanbaatar'
  AND NOT EXISTS (SELECT 1 FROM places p WHERE p.aimag_id=a.id AND p.name_mn='Зайсан толгой');

-- ---------- 4. Must-see: exactly the design's 6 ----------
-- Production seeded all 12 places as must-see; the carousel shows 6.
UPDATE places SET is_must_see=0;
UPDATE places SET is_must_see=1 WHERE aimag_id=(SELECT id FROM aimags WHERE slug='khuvsgul') AND name_mn='Хөвсгөл нуур (Далай ээж)';
UPDATE places SET is_must_see=1 WHERE aimag_id=(SELECT id FROM aimags WHERE slug='umnugovi') AND name_mn='Хонгорын элс';
UPDATE places SET is_must_see=1 WHERE aimag_id=(SELECT id FROM aimags WHERE slug='arkhangai') AND name_mn='Тэрхийн Цагаан нуур';
UPDATE places SET is_must_see=1 WHERE aimag_id=(SELECT id FROM aimags WHERE slug='uvurkhangai') AND name_mn='Эрдэнэ зуу хийд';
UPDATE places SET is_must_see=1 WHERE aimag_id=(SELECT id FROM aimags WHERE slug='bayan-ulgii') AND name_mn='Алтай Таван Богд';
UPDATE places SET is_must_see=1 WHERE aimag_id=(SELECT id FROM aimags WHERE slug='tuv') AND name_mn='Горхи-Тэрэлж';

-- ---------- 5. The real team ----------
-- The 3 rows being removed are the 'Member 1/2/3' placeholders from the first seed.
DELETE FROM team_members;
INSERT INTO team_members (name, name_en, role, role_en, school_mn, school_en, description_mn, description_en, sort_order) VALUES
  ('М. Болормаа', 'M. Bolormaa', 'Багийн ахлагч, Full-Stack хөгжүүлэгч', 'Team lead, Full-Stack developer', '6-р сургууль', 'School No. 6', 'Багийн зохион байгуулалт, үүрэг хуваарилалт, frontend хөгжүүлэлт, UI/UX болон сайтын ерөнхий бүтцийг гаргасан.', 'Led team organisation and task planning, frontend development, UI/UX and the overall site structure.', 1),
  ('Э. Оюундарь', 'E. Oyundari', 'Full-Stack хөгжүүлэгч', 'Full-Stack developer', '38-р сургууль', 'School No. 38', 'Frontend ба backend хөгжүүлэлт, шинэ боломжуудыг нэмэх, багийн хамтын ажиллагаа.', 'Frontend and backend development, new features and team collaboration.', 2),
  ('С. Болорсайхан', 'S. Bolorsaikhan', 'Full-Stack хөгжүүлэгч', 'Full-Stack developer', 'Олонлог төв сургууль', 'Olonlog Center School', 'Frontend ба backend хөгжүүлэлт, голлон backend талын хөгжүүлэлт, нэвтрүүлэлт.', 'Frontend and backend development, focusing on backend and deployment.', 3),
  ('Б. Хулан', 'B. Khulan', 'Маркетингийн менежер', 'Marketing manager', 'Күнз сургууль', 'Confucius School', 'Сайтын маркетинг, сошиал хуудас болон аялагчдад хүрэх контентыг хариуцна.', 'Handles site marketing, social media and content that reaches travellers.', 4);

-- ---------- 6. Remove the pre-launch sample guides ----------
-- All five were seeded with '(sample)' in the name and example.com addresses.
-- guide_aimags rows go too (ON DELETE cascade, plus an explicit delete for safety).
DELETE FROM guide_aimags WHERE guide_id IN (SELECT id FROM guides WHERE name LIKE '%(sample)%');
DELETE FROM guides WHERE name LIKE '%(sample)%';
