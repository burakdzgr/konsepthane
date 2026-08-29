-- Blog package: categories + Markdown posts with scheduling, cover image, tags and SEO overrides.
CREATE TABLE "blog_categories" (
  "id" UUID NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");
CREATE INDEX "blog_categories_status_sort_order_idx" ON "blog_categories"("status", "sort_order");

CREATE TABLE "blog_posts" (
  "id" UUID NOT NULL,
  "category_id" UUID,
  "author_id" UUID,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "title" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(200) NOT NULL,
  "excerpt" VARCHAR(320) NOT NULL,
  "body" TEXT NOT NULL,
  "cover_image_url" VARCHAR(2048),
  "cover_image_alt" VARCHAR(220),
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "indexability" "IndexabilityStatus" NOT NULL DEFAULT 'INDEX',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "seo_title" VARCHAR(70),
  "seo_description" VARCHAR(170),
  "reading_minutes" INTEGER NOT NULL DEFAULT 1,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "published_at" TIMESTAMP(3),
  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");
CREATE INDEX "blog_posts_category_id_status_published_at_idx" ON "blog_posts"("category_id", "status", "published_at");
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
