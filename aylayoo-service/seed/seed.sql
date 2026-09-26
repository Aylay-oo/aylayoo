-- aylayoo LOCAL development seed — generated from apps/aylayoo/design/aylayoo_3.html.
--
-- ⚠️  LOCAL ONLY. This file DELETEs every row first, so it must never be run with
--     --remote. Production changes go through seed/prod-*.sql instead.
--
--     bunx wrangler d1 execute aylayoo-db --local --file=seed/seed.sql
--
-- English text is the design's own I18N_EN dictionary, never a fresh translation.
-- The 10 guides below are the design's demo guides, including their made-up ratings:
-- they exist so the local front end looks like the mockup. They are NOT in production.

DELETE FROM guide_aimags;
DELETE FROM guides;
DELETE FROM places;
DELETE FROM facts;
DELETE FROM team_members;
DELETE FROM aimags;

-- ============ 21 aimags + Ulaanbaatar ============
INSERT INTO aimags (slug, name_mn, name_en, region, iso_code, center_mn, center_en, area_km2) VALUES
  ('bayan-ulgii', 'Баян-Өлгий', 'Bayan-Ölgii', 'western', 'MN-071', 'Өлгий', 'Ölgii', 45.7),
  ('khovd', 'Ховд', 'Khovd', 'western', 'MN-043', 'Ховд', 'Khovd', 76.1),
  ('uvs', 'Увс', 'Uvs', 'western', 'MN-046', 'Улаангом', 'Ulaangom', 69.6),
  ('zavkhan', 'Завхан', 'Zavkhan', 'western', 'MN-057', 'Улиастай', 'Uliastai', 82.5),
  ('govi-altai', 'Говь-Алтай', 'Govi-Altai', 'western', 'MN-065', 'Алтай', 'Altai', 141.4),
  ('khuvsgul', 'Хөвсгөл', 'Khövsgöl', 'khangai', 'MN-041', 'Мөрөн', 'Mörön', 100.6),
  ('arkhangai', 'Архангай', 'Arkhangai', 'khangai', 'MN-073', 'Цэцэрлэг', 'Tsetserleg', 55.3),
  ('bulgan', 'Булган', 'Bulgan', 'khangai', 'MN-067', 'Булган', 'Bulgan', 48.7),
  ('uvurkhangai', 'Өвөрхангай', 'Övörkhangai', 'khangai', 'MN-055', 'Арвайхээр', 'Arvaikheer', 62.9),
  ('bayankhongor', 'Баянхонгор', 'Bayankhongor', 'khangai', 'MN-069', 'Баянхонгор', 'Bayankhongor', 116.0),
  ('orkhon', 'Орхон', 'Orkhon', 'khangai', 'MN-035', 'Эрдэнэт', 'Erdenet', 0.8),
  ('tuv', 'Төв', 'Töv', 'central', 'MN-047', 'Зуунмод', 'Zuunmod', 74.0),
  ('selenge', 'Сэлэнгэ', 'Selenge', 'central', 'MN-049', 'Сүхбаатар', 'Sükhbaatar', 41.2),
  ('darkhan-uul', 'Дархан-Уул', 'Darkhan-Uul', 'central', 'MN-037', 'Дархан', 'Darkhan', 3.3),
  ('govisumber', 'Говьсүмбэр', 'Govisümber', 'central', 'MN-064', 'Чойр', 'Choir', 5.5),
  ('dundgovi', 'Дундговь', 'Dundgovi', 'central', 'MN-059', 'Мандалговь', 'Mandalgovi', 74.7),
  ('umnugovi', 'Өмнөговь', 'Ömnögovi', 'central', 'MN-053', 'Даланзадгад', 'Dalanzadgad', 165.4),
  ('dornogovi', 'Дорноговь', 'Dornogovi', 'central', 'MN-063', 'Сайншанд', 'Sainshand', 109.5),
  ('khentii', 'Хэнтий', 'Khentii', 'eastern', 'MN-039', 'Чингис', 'Chinggis', 80.3),
  ('dornod', 'Дорнод', 'Dornod', 'eastern', 'MN-061', 'Чойбалсан', 'Choibalsan', 123.6),
  ('sukhbaatar', 'Сүхбаатар', 'Sükhbaatar', 'eastern', 'MN-051', 'Баруун-Урт', 'Baruun-Urt', 82.3),
  ('ulaanbaatar', 'Улаанбаатар', 'Ulaanbaatar', 'capital', 'MN-1', 'Улаанбаатар', 'Ulaanbaatar', 4.7);

-- ============ 67 places from the design's aimag lists (6 must-see) ============
-- lat/lng stay NULL: the design has no coordinates and the map is drawn from
-- aimag shapes, so nothing is invented here.
INSERT INTO places (aimag_id, name_mn, name_en, description_mn, description_en, category, image_key, is_must_see, best_months_mn, best_months_en, must_title_mn, must_title_en, must_summary_mn, must_summary_en) VALUES
  ((SELECT id FROM aimags WHERE slug='bayan-ulgii'), 'Алтай Таван Богд', 'Altai Tavan Bogd', 'Монголын хамгийн өндөр Хүйтэн оргил (4374 м)', 'Khüiten, Mongolia''s highest peak (4,374 m)', 'nature', 'mountain', 1, '7–9 сар', 'Jul–Sep', 'Алтай Таван Богд', 'Altai Tavan Bogd', 'Мөнх цаст оргилууд, мөсөн гол, казах бүргэдчдийн уламжлал бүхий баруун хязгаар.', 'The far west: snow-capped peaks, glaciers and Kazakh eagle-hunting traditions.'),
  ((SELECT id FROM aimags WHERE slug='bayan-ulgii'), 'Потанины мөсөн гол', 'Potanin Glacier', 'Монголын хамгийн том мөсөн гол', 'Mongolia''s largest glacier', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bayan-ulgii'), 'Толбо нуур', 'Tolbo Lake', 'Өндөр уулын цэнгэг нуур', 'High-mountain freshwater lake', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bayan-ulgii'), 'Бүргэдийн баяр', 'Golden Eagle Festival', 'Казах бүргэдчдийн намрын уламжлалт наадам', 'Autumn festival of Kazakh eagle hunters', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khovd'), 'Хар-Ус нуур', 'Khar-Us Lake', 'Нүүдлийн шувуудын диваажин', 'A haven for migratory birds', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khovd'), 'Цамбагарав уул', 'Tsambagarav Mountain', 'Мөнх цаст сүрлэг уул', 'Majestic snow-capped mountain', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khovd'), 'Цэнхэрийн агуй', 'Tsenkher Cave', 'Эртний хадны зурагтай агуй', 'Cave with ancient rock paintings', 'nature', 'cave', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='uvs'), 'Увс нуур', 'Uvs Lake', 'Монголын хамгийн том нуур, ЮНЕСКО-ийн өв', 'Mongolia''s largest lake, a UNESCO site', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='uvs'), 'Хяргас нуур', 'Khyargas Lake', 'Давстай нуур, халуун рашаан', 'Salt lake with hot springs', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='uvs'), 'Алтан элс', 'Altan Els dunes', 'Хойд зүгийн элсэн манхан', 'Northern sand dunes', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='zavkhan'), 'Отгонтэнгэр уул', 'Otgontenger Mountain', 'Хангайн хамгийн өндөр, тахилгат оргил', 'The highest and most sacred peak of the Khangai', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='zavkhan'), 'Мөнгөн морьт элс', 'Möngön Morit dunes', 'Нуурын дэргэдэх элсэн манхан', 'Sand dunes beside a lake', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='zavkhan'), 'Тэлмэн нуур', 'Telmen Lake', 'Давстай өндөрлөг нуур', 'High-altitude salt lake', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='govi-altai'), 'Эж хайрхан', 'Ej Khairkhan', 'Хадан хавцалтай тахилгат уул', 'Sacred mountain with rocky gorges', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='govi-altai'), 'Сутай уул', 'Sutai Mountain', 'Говь-Алтайн мөнх цаст оргил', 'Snow-capped peak of the Gobi-Altai', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='govi-altai'), 'Шаргын говь', 'Shargyn Gobi', 'Тахь, хавтгай бүхий хамгаалалтын бүс', 'Protected area with wild horses and wild camels', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khuvsgul'), 'Хөвсгөл нуур (Далай ээж)', 'Lake Khövsgöl (Dalai Eej)', 'Цэнгэг уст нуур', 'Freshwater lake', 'nature', 'lake', 1, '6–8 сар', 'Jun–Aug', 'Хөвсгөл нуур (Далай ээж)', 'Lake Khövsgöl (Dalai Eej)', 'Монгол улсын цэнгэг усны 70%-ийг бүрдүүлдэг, «Хөх сувд» хэмээн алдаршсан тунгалаг нуур.', 'A crystal-clear lake holding 70% of Mongolia''s fresh water, known as the Blue Pearl.'),
  ((SELECT id FROM aimags WHERE slug='khuvsgul'), 'Цаатан иргэдийн ахуй', 'Tsaatan reindeer herders', 'Тайгын цаатан ахуйтай танилцах', 'Meet the reindeer herders of the taiga', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khuvsgul'), 'Хорьдол сарьдагийн нуруу', 'Khoridol Saridag range', 'Бартаат замаар явган аялал', 'Trekking on rugged trails', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khuvsgul'), 'Уушгийн өвөр буган хөшөө', 'Uushigiin Övör deer stones', 'Хүрэл зэвсгийн үеийн дурсгал', 'Bronze Age monuments', 'historical', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='arkhangai'), 'Тэрхийн Цагаан нуур', 'Terkhiin Tsagaan Lake', 'Галт уулын тогоо, Хорго уул', 'Volcanic crater and Khorgo Mountain', 'nature', 'lake', 1, '6–9 сар', 'Jun–Sep', 'Тэрхийн Цагаан нуур & Хорго', 'Terkhiin Tsagaan Lake & Khorgo', 'Сөнөсөн галт уул болон түүний хажууд орших, галт уулын далангаас үүссэн үзэсгэлэнт нуур.', 'An extinct volcano and the beautiful lake formed beside it by a lava dam.'),
  ((SELECT id FROM aimags WHERE slug='arkhangai'), 'Тайхар чулуу', 'Taikhar Rock', 'Домогт аварга хад', 'A giant rock of legend', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='arkhangai'), 'Цэнхэрийн халуун рашаан', 'Tsenkher Hot Springs', 'Байгалийн халуун рашаан', 'Natural hot springs', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bulgan'), 'Хөгнө хан уул', 'Khögnö Khan Mountain', 'Элсэн тасархай, Өвгөн хийд', 'Elsen Tasarkhai dunes and Övgön Monastery', 'cultural', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bulgan'), 'Уран тогоо', 'Uran Togoo', 'Унтарсан галт уулын тогоо', 'Extinct volcanic crater', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bulgan'), 'Хар бух балгас', 'Khar Bukh Balgas', 'Хятан үеийн хотын туурь', 'Ruins of a Khitan-era city', 'historical', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='uvurkhangai'), 'Эрдэнэ зуу хийд', 'Erdene Zuu Monastery', 'Хархорум, эртний нийслэлийн өв', 'Karakorum, the ancient capital', 'cultural', 'temple', 1, '5–9 сар', 'May–Sep', 'Эрдэнэ зуу & Хархорум', 'Erdene Zuu & Karakorum', 'Их Монгол Улсын нийслэл байсан Хархорумын туурь, Монголын анхны буддын хийд.', 'The ruins of Karakorum, capital of the Mongol Empire, and Mongolia''s first Buddhist monastery.'),
  ((SELECT id FROM aimags WHERE slug='uvurkhangai'), 'Орхоны хүрхрээ', 'Orkhon Waterfall', 'Галт уулын хад дундах хүрхрээ', 'A waterfall among volcanic rocks', 'nature', 'falls', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='uvurkhangai'), 'Төвхөн хийд', 'Tövkhön Monastery', 'Уулын оройн дахь Занабазарын хийд', 'Zanabazar''s hilltop monastery', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bayankhongor'), 'Ихбогд уул', 'Ikh Bogd Mountain', 'Говь-Алтайн нурууны хамгийн өндөр оргил (3957 м)', 'Highest peak of the Gobi-Altai range (3,957 m)', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bayankhongor'), 'Цагаан агуй', 'Tsagaan Cave', 'Чулуун зэвсгийн үеийн хүний ул мөр', 'Traces of Stone Age people', 'nature', 'cave', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bayankhongor'), 'Шаргалжуутын рашаан', 'Shargaljuut Hot Springs', 'Хэдэн зуун халуун, хүйтэн булаг', 'Hundreds of hot and cold springs', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='bayankhongor'), 'Орог нуур', 'Orog Lake', 'Говийн бэлчир нуур', 'Gobi delta lake', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='orkhon'), 'Эрдэнэтийн уурхайн үзэх цэг', 'Erdenet mine viewpoint', 'Азийн томоохон зэсийн уурхай', 'One of Asia''s largest copper mines', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='orkhon'), 'Найрамдлын хөшөө', 'Friendship Monument', 'Хотын дурсгалт газар', 'City landmark', 'historical', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Горхи-Тэрэлж', 'Gorkhi-Terelj', 'Мэлхий хад, Ариябалын хийд', 'Turtle Rock, Aryapala Temple', 'cultural', 'mountain', 1, 'Жилийн турш', 'All year', 'Горхи-Тэрэлж', 'Gorkhi-Terelj', 'Нийслэлээс 1.5 цагийн зайтай, хадат уулс, ой, голтой амралтын бүс.', 'A getaway 1.5 hours from the capital with rocky hills, forests and rivers.'),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Хустайн нуруу', 'Khustai National Park', 'Зэрлэг адуу тахь', 'Wild Przewalski''s horses', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Цонжин Болдог', 'Tsonjin Boldog', 'Чингис хааны морьт хөшөө', 'Chinggis Khaan Equestrian Statue', 'historical', 'monument', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='tuv'), 'Манзуширын хийд', 'Manzushir Monastery', 'Богд хан уулын өвөр дэх хийдийн туурь', 'Monastery ruins on Bogd Khan Mountain', 'historical', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='selenge'), 'Амарбаясгалант хийд', 'Amarbayasgalant Monastery', 'Монголын хамгийн үзэсгэлэнтэй хийдийн нэг', 'One of Mongolia''s most beautiful monasteries', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='selenge'), 'Сэлэнгэ мөрөн', 'Selenge River', 'Монголын хамгийн их устай гол', 'Mongolia''s largest river by volume', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='selenge'), 'Шаамарын ой', 'Shaamar forest', 'Хойд нутгийн нарсан ой', 'Northern pine forest', 'nature', 'forest', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='darkhan-uul'), 'Хар гол', 'Khar River', 'Голын эрэг дагуух амралт', 'Riverside relaxation', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='darkhan-uul'), 'Дархан хотын музей', 'Darkhan City Museum', 'Хотын түүх, соёл', 'City history and culture', 'city', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='govisumber'), 'Чойрын Богд уул', 'Choir Bogd Mountain', 'Хадат уулс, дархан цаазат газар', 'Rocky mountains, strictly protected area', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dundgovi'), 'Бага газрын чулуу', 'Baga Gazryn Chuluu', 'Боржин хад, хийдийн туурь', 'Granite rocks and monastery ruins', 'historical', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dundgovi'), 'Цагаан суварга', 'Tsagaan Suvarga', 'Олон өнгийн шохойн цавчим', 'Multicoloured limestone cliffs', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dundgovi'), 'Их газрын чулуу', 'Ikh Gazryn Chuluu', 'Хадат уулс, байгалийн цогцолбор', 'Rocky hills, nature reserve', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='umnugovi'), 'Хонгорын элс', 'Khongor Sand Dunes', 'Дуулдаг элсэн манхан', 'The singing sand dunes', 'nature', 'desert', 1, '5–10 сар', 'May–Oct', 'Хонгорын элс & Баянзаг', 'Khongor Sand Dunes & Bayanzag', 'Үлэг гүрвэлийн өндөг олдсон Баянзаг болон дуулдаг элс хэмээгддэг Хонгорын элс.', 'Bayanzag, where dinosaur eggs were found, and the singing dunes of Khongor.'),
  ((SELECT id FROM aimags WHERE slug='umnugovi'), 'Баянзаг', 'Bayanzag', 'Үлэг гүрвэлийн өндөг олдсон улаан хад', 'Red cliffs where dinosaur eggs were found', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='umnugovi'), 'Ёлын ам', 'Yolyn Am gorge', 'Зуны дундуур мөстэй хавцал', 'A gorge with ice even in midsummer', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dornogovi'), 'Хамарын хийд', 'Khamar Monastery', 'Говийн энергийн төв', 'The Gobi''s energy centre', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dornogovi'), 'Цонжийн чулуу', 'Tsonjiin Chuluu', 'Байгалийн хадан баганууд', 'Natural stone columns', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dornogovi'), 'Сүйхэнт', 'Süikhent', 'Чулуужсан модны цогцолбор', 'Petrified forest', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khentii'), 'Бурхан Халдун', 'Burkhan Khaldun', 'Чингис хааны тахилгат уул', 'Chinggis Khaan''s sacred mountain', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khentii'), 'Хөх нуур', 'Khökh Lake', 'Тэмүжин хаан өргөмжлөгдсөн газар', 'Where Temüjin was proclaimed khan', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='khentii'), 'Дэлүүн болдог', 'Delüün Boldog', 'Чингис хааны төрсөн газар гэх домогтой', 'Legendary birthplace of Chinggis Khaan', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dornod'), 'Буйр нуур', 'Buir Lake', 'Зүүн бүсийн хамгийн том нуур', 'The largest lake in the east', 'nature', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dornod'), 'Халх голын дурсгал', 'Khalkhyn Gol memorials', '1939 оны тулалдааны дурсгалт газрууд', 'Sites of the 1939 battle', 'historical', 'monument', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='dornod'), 'Монгол дагуурын тал', 'Mongol Daguur steppe', 'Цагаан зээрийн нүүдэл', 'Migration of Mongolian gazelles', 'nature', 'steppe', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='sukhbaatar'), 'Шилийн богд уул', 'Shiliin Bogd Mountain', 'Нар угтах тахилгат уул', 'Sacred mountain for greeting the sunrise', 'nature', 'mountain', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='sukhbaatar'), 'Дарьганга', 'Dariganga', 'Хүн чулуу, Ганга нуур', 'Stone statues and Ganga Lake', 'historical', 'lake', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='sukhbaatar'), 'Молцог элс', 'Moltsog dunes', 'Талын дундах элсэн манхан', 'Sand dunes in the middle of the steppe', 'nature', 'desert', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='ulaanbaatar'), 'Гандантэгчэнлин хийд', 'Gandantegchinlen Monastery', 'Мэгжид Жанрайсиг сүм', 'Migjid Janraisig Temple', 'cultural', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='ulaanbaatar'), 'Чингис хаан музей', 'Chinggis Khaan Museum', 'Монголын түүхийн шинэ музей', 'Mongolia''s new history museum', 'city', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='ulaanbaatar'), 'Богд хааны ордон музей', 'Bogd Khan Palace Museum', 'Сүүлчийн хааны өвөлжөө', 'Winter palace of the last khan', 'city', 'temple', 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ((SELECT id FROM aimags WHERE slug='ulaanbaatar'), 'Зайсан толгой', 'Zaisan Hill', 'Хотын панорам', 'City panorama', 'city', 'city', 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- ============ Demo guides (design mockup data — local only) ============
INSERT INTO guides (type, name, bio_mn, bio_en, languages, trip_types, phone, email, status, experience_years, route_mn, route_en, car, rating, review_count) VALUES
  ('individual', 'Б. Болормаа', NULL, NULL, '["en", "ko"]', '["countryside"]', '+976 9900 0001', 'demo1@example.com', 'approved', 6, 'Хөвсгөл, Архангай, Булган', 'Khövsgöl, Arkhangai, Bulgan', NULL, 5.0, 42),
  ('company', 'Blue Pearl Tours', NULL, NULL, '["en", "ja"]', '["city", "countryside"]', '+976 9900 0002', 'demo2@example.com', 'approved', 9, 'Хөвсгөл, Хархорин, Говь', 'Khövsgöl, Kharkhorin, Gobi', NULL, 4.9, 88),
  ('individual', 'Г. Батзориг', NULL, NULL, '["ru"]', '["countryside"]', '+976 9900 0003', 'demo3@example.com', 'approved', 4, 'Хөвсгөл, Сэлэнгэ, Дархан', 'Khövsgöl, Selenge, Darkhan', NULL, 4.8, 19),
  ('company', 'Говь Хангай Экспедишн', NULL, NULL, '["mn", "en"]', '["countryside"]', '+976 9900 0004', 'demo4@example.com', 'approved', 11, 'Говь, Баянхонгор, Дундговь', 'Gobi, Bayankhongor, Dundgovi', NULL, 4.6, 34),
  ('individual', 'Баатар Болд', NULL, NULL, '["en", "mn", "ru"]', '["countryside"]', '+976 9900 0005', 'demo5@example.com', 'approved', 7, 'Говь, Хангай', 'Gobi, Khangai', NULL, 4.9, 42),
  ('driver', 'Төмөр Мөнх', NULL, NULL, '["mn"]', '["countryside"]', '+976 9900 0006', 'demo6@example.com', 'approved', 12, 'Алтай Таван Богд, Говь', 'Altai Tavan Bogd, Gobi', 'Land Cruiser 200 / Delica', 5.0, 68),
  ('individual', 'Сарнай Саран', NULL, NULL, '["fr", "en", "mn"]', '["city", "countryside"]', '+976 9900 0007', 'demo7@example.com', 'approved', 5, 'Соёлын аялал, Улаанбаатар', 'Culture tour, Ulaanbaatar', NULL, 4.8, 29),
  ('driver', 'Ганзориг Бат', NULL, NULL, '["mn"]', '["city", "countryside"]', '+976 9900 0008', 'demo8@example.com', 'approved', 10, 'Төв, Сэлэнгэ, Дархан', 'Töv, Selenge, Darkhan', 'Hyundai H1 / Starex', 4.9, 53),
  ('company', 'Хэрлэн Трэвел', NULL, NULL, '["mn", "en", "zh"]', '["countryside"]', '+976 9900 0009', 'demo9@example.com', 'approved', 8, 'Хэнтий, Дорнод, Сүхбаатар', 'Khentii, Dornod, Sükhbaatar', NULL, 4.7, 31),
  ('individual', 'Д. Отгонбаяр', NULL, NULL, '["en", "de"]', '["countryside"]', '+976 9900 0010', 'demo10@example.com', 'approved', 9, 'Завхан, Увс, Говь-Алтай', 'Zavkhan, Uvs, Govi-Altai', NULL, 4.8, 22);

-- Which aimags each demo guide covers (from the design's `areas`).
INSERT INTO guide_aimags (guide_id, aimag_id)
  SELECT g.id, a.id FROM guides g, aimags a WHERE
    (g.email='demo1@example.com' AND a.slug IN ('khuvsgul', 'arkhangai', 'bulgan')) OR
    (g.email='demo2@example.com' AND a.slug IN ('khuvsgul', 'uvurkhangai', 'umnugovi', 'tuv', 'ulaanbaatar')) OR
    (g.email='demo3@example.com' AND a.slug IN ('khuvsgul', 'selenge', 'darkhan-uul')) OR
    (g.email='demo4@example.com' AND a.slug IN ('bayankhongor', 'umnugovi', 'dundgovi', 'govi-altai')) OR
    (g.email='demo5@example.com' AND a.slug IN ('umnugovi', 'dundgovi', 'uvurkhangai', 'arkhangai', 'bayankhongor')) OR
    (g.email='demo6@example.com' AND a.slug IN ('bayan-ulgii', 'khovd', 'uvs', 'umnugovi')) OR
    (g.email='demo7@example.com' AND a.slug IN ('ulaanbaatar', 'tuv', 'uvurkhangai')) OR
    (g.email='demo8@example.com' AND a.slug IN ('tuv', 'selenge', 'darkhan-uul', 'govisumber', 'ulaanbaatar')) OR
    (g.email='demo9@example.com' AND a.slug IN ('khentii', 'dornod', 'sukhbaatar', 'dornogovi')) OR
    (g.email='demo10@example.com' AND a.slug IN ('zavkhan', 'uvs', 'govi-altai', 'orkhon'));

-- ============ Facts for travellers ============
INSERT INTO facts (title_mn, title_en, body_mn, body_en, icon, sort_order) VALUES
  ('Мөнгөн тэмдэгт', 'Currency', 'Монгол төгрөг (MNT). Хотод карт ихэвчлэн ажилладаг, хөдөө бэлэн мөнгө авч яваарай.', 'Mongolian tögrög (MNT). Cards work in the city; bring cash to the countryside.', 'wallet', 1),
  ('Цаг агаар', 'Weather', 'Зун дулаан, өвөл маш хүйтэн. Аялахад хамгийн тохиромжтой нь 6-9 сар.', 'Warm summers, very cold winters. June to September is the best time to travel.', 'sun', 2),
  ('Цахилгаан', 'Electricity', '230V. C болон E төрлийн залгуур.', '230V, plug types C and E.', 'plug', 3),
  ('Яаралтай тусламж', 'Emergency', 'Цагдаа 102, түргэн тусламж 103.', 'Police 102, ambulance 103.', 'phone', 4),
  ('Виз', 'Visa', 'Олон улсын иргэд визгүй зорчих боломжтой. Явахаасаа өмнө шалгаарай.', 'Many nationalities can visit visa-free. Check the latest rules before you travel.', 'passport', 5);

-- ============ The 4 real team members ============
INSERT INTO team_members (name, name_en, role, role_en, school_mn, school_en, description_mn, description_en, sort_order) VALUES
  ('М. Болормаа', 'M. Bolormaa', 'Багийн ахлагч, Full-Stack хөгжүүлэгч', 'Team lead, Full-Stack developer', '6-р сургууль', 'School No. 6', 'Багийн зохион байгуулалт, үүрэг хуваарилалт, frontend хөгжүүлэлт, UI/UX болон сайтын ерөнхий бүтцийг гаргасан.', 'Led team organisation and task planning, frontend development, UI/UX and the overall site structure.', 1),
  ('Э. Оюундарь', 'E. Oyundari', 'Full-Stack хөгжүүлэгч', 'Full-Stack developer', '38-р сургууль', 'School No. 38', 'Frontend ба backend хөгжүүлэлт, шинэ боломжуудыг нэмэх, багийн хамтын ажиллагаа.', 'Frontend and backend development, new features and team collaboration.', 2),
  ('С. Болорсайхан', 'S. Bolorsaikhan', 'Full-Stack хөгжүүлэгч', 'Full-Stack developer', 'Олонлог төв сургууль', 'Olonlog Center School', 'Frontend ба backend хөгжүүлэлт, голлон backend талын хөгжүүлэлт, нэвтрүүлэлт.', 'Frontend and backend development, focusing on backend and deployment.', 3),
  ('Б. Хулан', 'B. Khulan', 'Маркетингийн менежер', 'Marketing manager', 'Күнз сургууль', 'Confucius School', 'Сайтын маркетинг, сошиал хуудас болон аялагчдад хүрэх контентыг хариуцна.', 'Handles site marketing, social media and content that reaches travellers.', 4);
