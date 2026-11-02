-- Phase 2 draft content for the Ulaanbaatar city section.
--
-- EVERY ROW HERE IS status = 'draft'. Nothing in this file is public the moment it lands;
-- it shows up in /admin → Хот for review, and somebody publishes it deliberately.
--
-- Safe to run twice, and safe to run on production: each insert is guarded on a natural key
-- with WHERE NOT EXISTS, so a second run changes nothing. Unlike seed/seed.sql, this file
-- deletes nothing, which is what makes it runnable with --remote at all.
--
--   bunx wrangler d1 execute aylayoo-db --local  --file=seed/prod-2026-11-02-city-drafts.sql
--   bunx wrangler d1 execute aylayoo-db --remote --file=seed/prod-2026-11-02-city-drafts.sql
--
-- What is NOT here: restaurants and events. A place to eat, what it charges, when it opens,
-- and whether an event is actually happening are facts about other people's businesses and
-- plans. Inventing them would put wrong information on the site about somebody else's
-- livelihood and send visitors across town for nothing, so city_food and city_events start
-- empty and the team fills them in from /admin.
--
-- Places are limited to the well-known public landmarks the brief named. Coordinates are
-- filled in only where the location is widely published; the Chinggis Khaan National Museum
-- is left without any rather than approximated, and its stop still renders in the ordered
-- list — which is exactly the fallback the route map is built around.


-- ---------- itineraries ----------

INSERT INTO city_itineraries (title_mn, title_en, days, summary_mn, summary_en, stops, status, sort_order)
SELECT 'Нэг өдрийн Улаанбаатар', 'One day in Ulaanbaatar', 1, 'Хотод нэг л өдөр байгаа бол: өглөө хийд, өдөр нь төв талбай ба музей, орой хотын панорам.', 'If you only have one day: a monastery in the morning, the central square and a museum at midday, and the city laid out below you in the evening.', '[{"placeMn": "Гандан хийд", "placeEn": "Gandan Monastery", "timeOfDay": "morning", "noteMn": "Өглөө эрт морилбол хурал уншиж байх үед таарна.", "noteEn": "Arrive early and you may catch the monks at prayer.", "lat": 47.9212, "lng": 106.8944}, {"placeMn": "Сүхбаатарын талбай", "placeEn": "Sukhbaatar Square", "timeOfDay": "midday", "noteMn": "Хотын төв. Эндээс явган аялал үргэлжлүүлэхэд хялбар.", "noteEn": "The centre of the city, and an easy place to carry on walking from.", "lat": 47.9185, "lng": 106.9175}, {"placeMn": "Чингис хааны үндэсний музей", "placeEn": "Chinggis Khaan National Museum", "timeOfDay": "afternoon", "noteMn": "Талбайн хажууд. Үзэхэд дор хаяж хоёр цаг тооцоорой.", "noteEn": "Beside the square. Allow at least two hours inside.", "lat": null, "lng": null}, {"placeMn": "Зайсан толгой", "placeEn": "Zaisan Memorial Hill", "timeOfDay": "evening", "noteMn": "Шатаар өгсөхөд хотын панорам нээгдэнэ. Нар шингэх үед хамгийн сайхан.", "noteEn": "Climb the steps for the whole city below. Best as the sun goes down.", "lat": 47.8866, "lng": 106.91}]', 'draft', 0
WHERE NOT EXISTS (SELECT 1 FROM city_itineraries WHERE title_mn = 'Нэг өдрийн Улаанбаатар');

INSERT INTO city_itineraries (title_mn, title_en, days, summary_mn, summary_en, stops, status, sort_order)
SELECT 'Хоёр өдрийн Улаанбаатар', 'Two days in Ulaanbaatar', 2, 'Нэг өдрийн маршрутыг хоёр хуваан, сүм хийд, музей, ордонд цаг гаргасан хувилбар.', 'The one-day route split in two, with proper time for the temples, the museums and the palace.', '[{"placeMn": "Сүхбаатарын талбай", "placeEn": "Sukhbaatar Square", "timeOfDay": "morning", "noteMn": null, "noteEn": null, "lat": 47.9185, "lng": 106.9175}, {"placeMn": "Чингис хааны үндэсний музей", "placeEn": "Chinggis Khaan National Museum", "timeOfDay": "midday", "noteMn": null, "noteEn": null, "lat": null, "lng": null}, {"placeMn": "Чойжин ламын сүмийн музей", "placeEn": "Choijin Lama Temple Museum", "timeOfDay": "afternoon", "noteMn": "Өндөр барилгуудын дунд үлдсэн сүмийн цогцолбор.", "noteEn": "A temple complex left standing among the office towers.", "lat": 47.9147, "lng": 106.9183}, {"placeMn": "Гандан хийд", "placeEn": "Gandan Monastery", "timeOfDay": "morning", "noteMn": null, "noteEn": null, "lat": 47.9212, "lng": 106.8944}, {"placeMn": "Богд хааны ордон музей", "placeEn": "Bogd Khan Winter Palace Museum", "timeOfDay": "midday", "noteMn": null, "noteEn": null, "lat": 47.8947, "lng": 106.9005}, {"placeMn": "Зайсан толгой", "placeEn": "Zaisan Memorial Hill", "timeOfDay": "evening", "noteMn": null, "noteEn": null, "lat": 47.8866, "lng": 106.91}]', 'draft', 1
WHERE NOT EXISTS (SELECT 1 FROM city_itineraries WHERE title_mn = 'Хоёр өдрийн Улаанбаатар');

INSERT INTO city_itineraries (title_mn, title_en, days, summary_mn, summary_en, stops, status, sort_order)
SELECT 'Гурван өдрийн Улаанбаатар', 'Three days in Ulaanbaatar', 3, 'Хоёр өдрийн маршрут, дээр нь гурав дахь өдөр нь амар тайван: хотоор явган, музейд дахин.', 'The two-day route, with a slower third day: the city on foot, and a second museum visit.', '[{"placeMn": "Сүхбаатарын талбай", "placeEn": "Sukhbaatar Square", "timeOfDay": "morning", "noteMn": null, "noteEn": null, "lat": 47.9185, "lng": 106.9175}, {"placeMn": "Чойжин ламын сүмийн музей", "placeEn": "Choijin Lama Temple Museum", "timeOfDay": "afternoon", "noteMn": null, "noteEn": null, "lat": 47.9147, "lng": 106.9183}, {"placeMn": "Гандан хийд", "placeEn": "Gandan Monastery", "timeOfDay": "morning", "noteMn": null, "noteEn": null, "lat": 47.9212, "lng": 106.8944}, {"placeMn": "Богд хааны ордон музей", "placeEn": "Bogd Khan Winter Palace Museum", "timeOfDay": "afternoon", "noteMn": null, "noteEn": null, "lat": 47.8947, "lng": 106.9005}, {"placeMn": "Чингис хааны үндэсний музей", "placeEn": "Chinggis Khaan National Museum", "timeOfDay": "morning", "noteMn": "Гурав дахь өдөр тайван үзэх боломж.", "noteEn": "A quieter visit on the third day.", "lat": null, "lng": null}, {"placeMn": "Зайсан толгой", "placeEn": "Zaisan Memorial Hill", "timeOfDay": "evening", "noteMn": null, "noteEn": null, "lat": 47.8866, "lng": 106.91}]', 'draft', 2
WHERE NOT EXISTS (SELECT 1 FROM city_itineraries WHERE title_mn = 'Гурван өдрийн Улаанбаатар');


-- ---------- walking routes ----------

INSERT INTO city_routes (title_mn, title_en, summary_mn, summary_en, stops, status, sort_order)
SELECT 'Буддын Улаанбаатар', 'Buddhist Ulaanbaatar', 'Хотод үлдсэн сүм хийдүүдээр: Гандангаас Чойжин ламын сүм, Богд хааны ордон хүртэл.', 'The temples the city still has, from Gandan to the Choijin Lama temple and the Bogd Khan palace.', '[{"placeMn": "Гандан хийд", "placeEn": "Gandan Monastery", "timeOfDay": null, "noteMn": "Маршрутын хамгийн том хийд. Эндээс эхлээрэй.", "noteEn": "The largest monastery on the route, and the place to start.", "lat": 47.9212, "lng": 106.8944}, {"placeMn": "Чойжин ламын сүмийн музей", "placeEn": "Choijin Lama Temple Museum", "timeOfDay": null, "noteMn": null, "noteEn": null, "lat": 47.9147, "lng": 106.9183}, {"placeMn": "Богд хааны ордон музей", "placeEn": "Bogd Khan Winter Palace Museum", "timeOfDay": null, "noteMn": null, "noteEn": null, "lat": 47.8947, "lng": 106.9005}]', 'draft', 0
WHERE NOT EXISTS (SELECT 1 FROM city_routes WHERE title_mn = 'Буддын Улаанбаатар');

INSERT INTO city_routes (title_mn, title_en, summary_mn, summary_en, stops, status, sort_order)
SELECT 'Социализмын үеийн Улаанбаатар', 'Soviet-era Ulaanbaatar', 'XX зууны хотын төлөвлөлт, өргөн талбай, дурсгалын барилгуудаар.', 'Twentieth-century town planning: the wide square and the monuments around it.', '[{"placeMn": "Сүхбаатарын талбай", "placeEn": "Sukhbaatar Square", "timeOfDay": null, "noteMn": "Талбайг хүрээлсэн барилгууд нь үеийнхээ архитектур.", "noteEn": "The buildings around the square are of their period.", "lat": 47.9185, "lng": 106.9175}, {"placeMn": "Зайсан толгой", "placeEn": "Zaisan Memorial Hill", "timeOfDay": null, "noteMn": "Хоёр улсын харилцааны дурсгалд зориулсан мозайк хүрээ.", "noteEn": "A mosaic ring built as a memorial to the two countries.", "lat": 47.8866, "lng": 106.91}]', 'draft', 1
WHERE NOT EXISTS (SELECT 1 FROM city_routes WHERE title_mn = 'Социализмын үеийн Улаанбаатар');

INSERT INTO city_routes (title_mn, title_en, summary_mn, summary_en, stops, status, sort_order)
SELECT 'Орчин цагийн Улаанбаатар', 'Modern Ulaanbaatar', 'Хотын төв ба шинэ музей: нэг өдрийн хагасыг явганаар.', 'The city centre and its newest museum, in half a day on foot.', '[{"placeMn": "Сүхбаатарын талбай", "placeEn": "Sukhbaatar Square", "timeOfDay": null, "noteMn": null, "noteEn": null, "lat": 47.9185, "lng": 106.9175}, {"placeMn": "Чингис хааны үндэсний музей", "placeEn": "Chinggis Khaan National Museum", "timeOfDay": null, "noteMn": "2022 онд нээгдсэн. Талбайгаас явган хэдэн минут.", "noteEn": "Opened in 2022, a few minutes on foot from the square.", "lat": null, "lng": null}]', 'draft', 2
WHERE NOT EXISTS (SELECT 1 FROM city_routes WHERE title_mn = 'Орчин цагийн Улаанбаатар');


-- ---------- practical guide ----------

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'transport', 'Автобусны карт', 'The bus card', 'Хотын автобусанд урьдчилж цэнэглэдэг картаар зорчино; бэлэн мөнгө авдаггүй. Картыг зогсоол дээрх лангуу, дэлгүүрээс авч цэнэглэнэ.', 'City buses are paid for with a prepaid card rather than cash. You buy and top one up at kiosks and shops by the stops.', 'draft', 0
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Автобусны карт' AND topic = 'transport');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'transport', 'Такси', 'Taxis', 'Тусгай таксинаас гадна дуудлагын апп өргөн хэрэглэдэг. Аппгүй бол машинд суухаасаа өмнө үнээ тохироорой.', 'Alongside marked taxis, ride-hailing apps are widely used. Without an app, agree the fare before you get in.', 'draft', 1
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Такси' AND topic = 'transport');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'money', 'Төгрөг, карт, бэлэн мөнгө', 'Tugrik, cards and cash', 'Хотын төвийн дэлгүүр, кафе, зочид буудал картаар ажилладаг. Зах, жижиг дэлгүүр, хөдөө явахад бэлэн мөнгө авч яваарай. Төвд АТМ хаа сайгүй бий.', 'Shops, cafes and hotels in the centre take cards. Carry cash for markets, small shops and anywhere outside the city. ATMs are easy to find in the centre.', 'draft', 2
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Төгрөг, карт, бэлэн мөнгө' AND topic = 'money');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'money', 'SIM карт', 'SIM cards', 'SIM картыг онгоцны буудал болон хотын төвийн салбаруудаас авна. Бүртгүүлэхэд пасспорт шаардана.', 'SIM cards are sold at the airport and in operator shops in the centre. You need your passport to register one.', 'draft', 3
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'SIM карт' AND topic = 'money');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'weather', 'Өвөл үнэхээр хүйтэн', 'The winter really is cold', '12–2 сард температур -20°C-аас доош байх нь хэвийн. Давхарлаж хувцаслаад, малгай, бээлий, дулаан гутал аваарай. Барилга дотор халаалт сайн тул авч тайлах давхарга хэрэгтэй.', 'From December to February, temperatures below -20°C are normal. Dress in layers and bring a hat, gloves and warm boots. Indoor heating is strong, so wear layers you can take off.', 'draft', 4
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Өвөл үнэхээр хүйтэн' AND topic = 'weather');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'weather', 'Зуны цаг агаар', 'Summer weather', 'Зуны өдөр дулаан ч орой нь хөрнө, бороо гэнэт шиврэх нь бий. 7 сард ч нэг давхарга, хөнгөн борооны хувцас авч яваарай.', 'Summer days are warm but the evenings cool off, and rain arrives suddenly. Even in July, bring a layer and a light raincoat.', 'draft', 5
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Зуны цаг агаар' AND topic = 'weather');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'etiquette', 'Авах, өгөх', 'Giving and receiving', 'Юм авахдаа баруун гараараа, эсвэл хоёр гараараа авна; баруун гарын тохойг зүүн гараараа хөнгөн тулж болно.', 'Receive something with your right hand, or with both hands — you can lightly support your right elbow with your left hand.', 'draft', 6
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Авах, өгөх' AND topic = 'etiquette');

INSERT INTO city_tips (topic, title_mn, title_en, body_mn, body_en, status, sort_order)
SELECT 'etiquette', 'Гэрт орохдоо', 'Entering a ger', 'Гэрийн босгон дээр гишгэхгүй. Дотогш нарны зүүгээр эргэнэ. Өгсөн цай, хоолыг амсах нь ёс.', 'Do not step on the threshold. Move clockwise once inside. It is polite to at least taste what you are offered.', 'draft', 7
WHERE NOT EXISTS (SELECT 1 FROM city_tips WHERE title_mn = 'Гэрт орохдоо' AND topic = 'etiquette');


-- ---------- phrasebook ----------

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Сайн байна уу?', 'Sain bain uu?', 'Hello', 'greetings', 'draft', 0
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Сайн байна уу?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Өглөөний мэнд', 'Oglooni mend', 'Good morning', 'greetings', 'draft', 1
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Өглөөний мэнд');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Баяртай', 'Bayartai', 'Goodbye', 'greetings', 'draft', 2
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Баяртай');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Тавтай морил', 'Tavtai moril', 'Welcome', 'greetings', 'draft', 3
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Тавтай морил');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Баярлалаа', 'Bayarlalaa', 'Thank you', 'basics', 'draft', 4
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Баярлалаа');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Уучлаарай', 'Uuchlaarai', 'Sorry / excuse me', 'basics', 'draft', 5
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Уучлаарай');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Тийм', 'Tiim', 'Yes', 'basics', 'draft', 6
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Тийм');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Үгүй', 'Ugui', 'No', 'basics', 'draft', 7
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Үгүй');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Би ойлгохгүй байна', 'Bi oilgokhgui baina', 'I do not understand', 'basics', 'draft', 8
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Би ойлгохгүй байна');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Та англиар мэдэх үү?', 'Ta angliar medekh uu?', 'Do you speak English?', 'basics', 'draft', 9
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Та англиар мэдэх үү?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Таны нэр хэн бэ?', 'Tany ner khen be?', 'What is your name?', 'basics', 'draft', 10
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Таны нэр хэн бэ?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Цэс авч болох уу?', 'Tses avch bolokh uu?', 'May I see the menu?', 'food', 'draft', 11
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Цэс авч болох уу?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Их амттай байна', 'Ikh amttai baina', 'It is very good', 'food', 'draft', 12
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Их амттай байна');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Би мах иддэггүй', 'Bi makh iddeggui', 'I do not eat meat', 'food', 'draft', 13
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Би мах иддэггүй');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Нэг цай, нэг кофе', 'Neg tsai, neg kofe', 'One tea and one coffee', 'food', 'draft', 14
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Нэг цай, нэг кофе');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Ус авч болох уу?', 'Us avch bolokh uu?', 'May I have some water?', 'food', 'draft', 15
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Ус авч болох уу?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Хаана байна?', 'Khaana baina?', 'Where is it?', 'directions', 'draft', 16
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Хаана байна?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Автобусны зогсоол хаана байна?', 'Avtobusny zogsool khaana baina?', 'Where is the bus stop?', 'directions', 'draft', 17
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Автобусны зогсоол хаана байна?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Зүүн тийш', 'Zuun tiish', 'To the left', 'directions', 'draft', 18
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Зүүн тийш');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Баруун тийш', 'Baruun tiish', 'To the right', 'directions', 'draft', 19
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Баруун тийш');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Хэд вэ?', 'Khed ve?', 'How much is it?', 'numbers', 'draft', 20
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Хэд вэ?');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Нэг, хоёр, гурав', 'Neg, khoyor, gurav', 'One, two, three', 'numbers', 'draft', 21
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Нэг, хоёр, гурав');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Туслаарай!', 'Tuslaarai!', 'Help!', 'emergency', 'draft', 22
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Туслаарай!');

INSERT INTO phrases (phrase_mn, pronunciation, meaning_en, category, status, sort_order)
SELECT 'Эмч дуудаарай', 'Emch duudaarai', 'Call a doctor', 'emergency', 'draft', 23
WHERE NOT EXISTS (SELECT 1 FROM phrases WHERE phrase_mn = 'Эмч дуудаарай');


-- ---------- city_food and city_events ----------
-- Deliberately nothing here. See the header of this file.
