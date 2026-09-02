-- ContentOS publishing bridge (Publishing API v1 contract):
-- content-addressed media mapping + the durable idempotent publication record.
CREATE TABLE "contentos_media_assets" (
  "id" UUID NOT NULL,
  "content_sha256" VARCHAR(64) NOT NULL,
  "media_asset_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contentos_media_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contentos_media_assets_content_sha256_key"
  ON "contentos_media_assets"("content_sha256");
CREATE UNIQUE INDEX "contentos_media_assets_media_asset_id_key"
  ON "contentos_media_assets"("media_asset_id");
ALTER TABLE "contentos_media_assets"
  ADD CONSTRAINT "contentos_media_assets_media_asset_id_fkey"
  FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "contentos_publications" (
  "id" UUID NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "work_item_id" UUID NOT NULL,
  "package_schema_version" VARCHAR(50) NOT NULL,
  "package_hash" VARCHAR(64),
  "guide_id" UUID NOT NULL,
  "publication_ref" VARCHAR(160) NOT NULL,
  "canonical_url" VARCHAR(500) NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contentos_publications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contentos_publications_idempotency_key_key"
  ON "contentos_publications"("idempotency_key");
CREATE UNIQUE INDEX "contentos_publications_guide_id_key"
  ON "contentos_publications"("guide_id");
CREATE UNIQUE INDEX "contentos_publications_publication_ref_key"
  ON "contentos_publications"("publication_ref");
CREATE INDEX "contentos_publications_work_item_id_idx"
  ON "contentos_publications"("work_item_id");
ALTER TABLE "contentos_publications"
  ADD CONSTRAINT "contentos_publications_guide_id_fkey"
  FOREIGN KEY ("guide_id") REFERENCES "guides"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
