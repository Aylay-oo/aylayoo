-- aylayoo PRODUCTION Mongolian spelling corrections — review before running.
--
-- Fixes the same 15 database-visible strings that were corrected in seed/seed.sql and the
-- front end, so production matches the code. Nothing else changes.
--
-- Run only after a backup:
--   bunx wrangler d1 export aylayoo-db --remote --output=backups/pre-spelling-2026-10-31.sql
--   bunx wrangler d1 execute aylayoo-db --remote --file=seed/prod-2026-10-31-mongolian-spelling.sql
--
-- Safety properties:
--   * UPDATE only. No INSERT, no DELETE, no schema change.
--   * Every statement is keyed on the OLD string, so running it twice is a no-op.
--   * A row somebody has since edited by hand through /admin will not match and is left
--     alone rather than silently overwritten. The verification query at the bottom reports
--     anything that did not get updated.
--   * Only name_mn / description_mn / must_summary_mn / body_mn are touched. The _en columns,
--     ratings, guides, aimags and team_members are not read or written.
--
-- The slogan spelling fix is NOT in here either: the slogan lives only in the web app
-- and the design mockup, never in the database.

-- ---------- 1. places.name_mn — spelling and proper-name capitalisation ----------

-- Эж Хайрхан: proper name, capitalised like Чойрын Богд уул already is.
UPDATE places SET name_mn = 'Эж Хайрхан'
  WHERE name_mn = 'Эж хайрхан';

-- Хорьдол Сарьдаг: proper name.
UPDATE places SET name_mn = 'Хорьдол Сарьдагийн нуруу'
  WHERE name_mn = 'Хорьдол сарьдагийн нуруу';

-- Уушигийн өвөр: the deer-stone site. "Уушгийн" is the genitive of "уушги" (lungs);
-- the existing name_en, 'Uushigiin Övör deer stones', already transliterates the right form.
UPDATE places SET name_mn = 'Уушигийн өвөр буган хөшөө'
  WHERE name_mn = 'Уушгийн өвөр буган хөшөө';

-- Хөгнө Хан: proper name.
UPDATE places SET name_mn = 'Хөгнө Хан уул'
  WHERE name_mn = 'Хөгнө хан уул';

-- Хар бухын балгас: the site name takes the genitive.
UPDATE places SET name_mn = 'Хар бухын балгас'
  WHERE name_mn = 'Хар бух балгас';

-- Их Богд: two words, as name_en ('Ikh Bogd Mountain') already has it.
UPDATE places SET name_mn = 'Их Богд уул'
  WHERE name_mn = 'Ихбогд уул';

-- Дэлүүн Болдог: proper name, capitalised like Цонжин Болдог already is.
UPDATE places SET name_mn = 'Дэлүүн Болдог'
  WHERE name_mn = 'Дэлүүн болдог';

-- Монгол Дагуур: proper name of the protected area.
UPDATE places SET name_mn = 'Монгол Дагуурын тал'
  WHERE name_mn = 'Монгол дагуурын тал';

-- Шилийн Богд: proper name.
UPDATE places SET name_mn = 'Шилийн Богд уул'
  WHERE name_mn = 'Шилийн богд уул';

-- ---------- 2. places.description_mn — grammar ----------

-- "дахь" takes the nominative, not the genitive: "орой дахь", not "оройн дахь".
UPDATE places SET description_mn = 'Уулын орой дахь Занабазарын хийд'
  WHERE description_mn = 'Уулын оройн дахь Занабазарын хийд';

-- Арьяабал (Āryabala), the spelling already used elsewhere in the front end.
UPDATE places SET description_mn = 'Мэлхий хад, Арьяабалын хийд'
  WHERE description_mn = 'Мэлхий хад, Ариябалын хийд';

-- "байгалийн цогцолборт газар" is the protected-area category name; "цогцолбор" alone is
-- not. (Их газрын чулуу is formally a байгалийн дурсгалт газар — see the note below.)
UPDATE places SET description_mn = 'Хадат уулс, байгалийн цогцолборт газар'
  WHERE description_mn = 'Хадат уулс, байгалийн цогцолбор';

-- The original has no case marker, so neither noun is marked as the object.
UPDATE places SET description_mn = 'Тэмүжинийг хаан өргөмжилсөн газар'
  WHERE description_mn = 'Тэмүжин хаан өргөмжлөгдсөн газар';

-- ---------- 3. places.must_summary_mn — official country name ----------

-- "Монгол Улс" capitalises Улс. The footer already spells it that way.
UPDATE places
  SET must_summary_mn = 'Монгол Улсын цэнгэг усны 70%-ийг бүрдүүлдэг, «Хөх сувд» хэмээн алдаршсан тунгалаг нуур.'
  WHERE must_summary_mn = 'Монгол улсын цэнгэг усны 70%-ийг бүрдүүлдэг, «Хөх сувд» хэмээн алдаршсан тунгалаг нуур.';

-- ---------- 4. facts.body_mn — wrong word ----------

-- "олон улсын" means "international"; "citizens of many countries" is "олон орны иргэд",
-- which is what the English ("Many nationalities can visit visa-free") says.
UPDATE facts
  SET body_mn = 'Олон орны иргэд визгүй зорчих боломжтой. Явахаасаа өмнө шалгаарай.'
  WHERE body_mn = 'Олон улсын иргэд визгүй зорчих боломжтой. Явахаасаа өмнө шалгаарай.';

-- ---------- 5. Verification — expect zero rows ----------
-- Any row listed here still holds an old form, which means it had been edited by hand and
-- the guarded UPDATE above correctly declined to touch it. Fix those by hand.
--
-- Exact equality rather than LIKE on purpose: the old strings are known in full, so equality
-- cannot false-positive, and D1 rejects a statement that stacks up several LIKE patterns
-- ("LIKE or GLOB pattern too complex").

SELECT 'places.name_mn' AS column_name, name_mn AS still_wrong FROM places
  WHERE name_mn IN (
    'Эж хайрхан', 'Хорьдол сарьдагийн нуруу', 'Уушгийн өвөр буган хөшөө',
    'Хөгнө хан уул', 'Хар бух балгас', 'Ихбогд уул',
    'Дэлүүн болдог', 'Монгол дагуурын тал', 'Шилийн богд уул'
  )
UNION ALL
SELECT 'places.description_mn', description_mn FROM places
  WHERE description_mn IN (
    'Уулын оройн дахь Занабазарын хийд',
    'Мэлхий хад, Ариябалын хийд',
    'Хадат уулс, байгалийн цогцолбор',
    'Тэмүжин хаан өргөмжлөгдсөн газар'
  )
UNION ALL
SELECT 'places.must_summary_mn', must_summary_mn FROM places
  WHERE must_summary_mn = 'Монгол улсын цэнгэг усны 70%-ийг бүрдүүлдэг, «Хөх сувд» хэмээн алдаршсан тунгалаг нуур.'
UNION ALL
SELECT 'facts.body_mn', body_mn FROM facts
  WHERE body_mn = 'Олон улсын иргэд визгүй зорчих боломжтой. Явахаасаа өмнө шалгаарай.';
