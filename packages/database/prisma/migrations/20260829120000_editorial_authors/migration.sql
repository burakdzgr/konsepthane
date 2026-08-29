-- Editorial authorship: editor profiles, public/inactive flags, created/updated attribution.

-- CreateEnum
CREATE TYPE "ProfileKind" AS ENUM ('MEMBER', 'EDITOR');

-- AlterTable: profiles
ALTER TABLE "profiles"
  ADD COLUMN "kind" "ProfileKind" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN "job_title" VARCHAR(120),
  ADD COLUMN "long_bio" TEXT,
  ADD COLUMN "expertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "social_links" JSONB,
  ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "editor_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "profiles_kind_editor_active_idx" ON "profiles"("kind", "editor_active");

-- AlterTable: concepts (who created / last edited the record; author stays the public byline)
ALTER TABLE "concepts"
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "concepts"
  ADD CONSTRAINT "concepts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "concepts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: guides
ALTER TABLE "guides"
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "guides"
  ADD CONSTRAINT "guides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "guides_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
