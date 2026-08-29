-- Evolve the existing event story aggregate in place so published data is preserved.
ALTER TYPE "EventStoryStatus" RENAME TO "ExperienceStatus";
ALTER TYPE "SeoEntityType" ADD VALUE IF NOT EXISTS 'EXPERIENCE';

ALTER TABLE "event_stories" RENAME TO "experiences";
ALTER TABLE "experiences" RENAME COLUMN "description" TO "body";

ALTER TABLE "concepts"
  ADD COLUMN "experience_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "question_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "introduction" TEXT,
  ADD COLUMN "color_palette" JSONB,
  ADD COLUMN "decoration_ideas" TEXT,
  ADD COLUMN "table_setup" TEXT,
  ADD COLUMN "balloon_ideas" TEXT,
  ADD COLUMN "cake_ideas" TEXT,
  ADD COLUMN "venue_suggestions" TEXT,
  ADD COLUMN "practical_tips" TEXT,
  ADD COLUMN "alternatives" TEXT,
  ADD COLUMN "faq" JSONB;

ALTER TABLE "experiences"
  ADD COLUMN "concept_id" UUID,
  ADD COLUMN "event_type_id" UUID,
  ADD COLUMN "venue_type" VARCHAR(100),
  ADD COLUMN "theme_variation" VARCHAR(160),
  ADD COLUMN "colors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "tips" TEXT,
  ADD COLUMN "what_worked" TEXT,
  ADD COLUMN "what_would_change" TEXT;

ALTER TABLE "questions"
  ADD COLUMN "concept_id" UUID,
  ADD COLUMN "event_type_id" UUID;

CREATE TABLE "experience_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "experience_id" UUID NOT NULL,
  "media_asset_id" UUID,
  "url" VARCHAR(2048) NOT NULL,
  "alt_text" VARCHAR(220) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "experience_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question_id" UUID NOT NULL,
  "media_asset_id" UUID,
  "url" VARCHAR(2048) NOT NULL,
  "alt_text" VARCHAR(220) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "experiences_concept_id_status_created_at_idx" ON "experiences"("concept_id", "status", "created_at");
CREATE INDEX "experiences_event_type_id_status_created_at_idx" ON "experiences"("event_type_id", "status", "created_at");
CREATE INDEX "questions_concept_id_moderation_status_created_at_idx" ON "questions"("concept_id", "moderation_status", "created_at");
CREATE INDEX "experience_images_experience_id_sort_order_idx" ON "experience_images"("experience_id", "sort_order");
CREATE INDEX "question_images_question_id_sort_order_idx" ON "question_images"("question_id", "sort_order");

ALTER TABLE "experiences" ADD CONSTRAINT "experiences_concept_id_fkey"
  FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_event_type_id_fkey"
  FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_concept_id_fkey"
  FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_event_type_id_fkey"
  FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "experience_images" ADD CONSTRAINT "experience_images_experience_id_fkey"
  FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experience_images" ADD CONSTRAINT "experience_images_media_asset_id_fkey"
  FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_media_asset_id_fkey"
  FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing demo experience becomes contextual and receives a required gallery row.
UPDATE "experiences"
SET "concept_id" = (SELECT "id" FROM "concepts" WHERE "slug" = '3-yas-kiz-cocuk-safari-dogum-gunu' LIMIT 1),
    "event_type_id" = (SELECT "id" FROM "event_types" WHERE "slug" = 'dogum-gunu' LIMIT 1),
    "venue_type" = 'Evde',
    "theme_variation" = 'Sade safari',
    "colors" = ARRAY['Bej', 'Adaçayı', 'Krem'],
    "tips" = 'Kurulumu bir gün önce prova edin ve çocukların hareket alanını boş bırakın.',
    "what_worked" = 'Tekrar kullanılabilir kumaş süsler ve erken pasta saati.',
    "what_would_change" = 'Serbest oyun bölümünü on dakika daha kısa tutardım.'
WHERE "slug" = 'salonda-sade-5-yas-dogum-gunu-deneyimi';

INSERT INTO "experience_images" ("experience_id", "url", "alt_text", "sort_order")
SELECT "id", COALESCE("hero_image_url", '/placeholders/home-birthday.svg'),
       'Gerçek kutlama deneyiminden masa ve dekorasyon görünümü', 0
FROM "experiences"
WHERE NOT EXISTS (
  SELECT 1 FROM "experience_images" WHERE "experience_id" = "experiences"."id"
);

UPDATE "concepts" c
SET "experience_count" = (
      SELECT COUNT(*)::INTEGER FROM "experiences" e
      WHERE e."concept_id" = c."id" AND e."status" = 'APPROVED'
    ),
    "question_count" = (
      SELECT COUNT(*)::INTEGER FROM "questions" q
      WHERE q."concept_id" = c."id" AND q."moderation_status" = 'APPROVED'
    );
