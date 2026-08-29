import { ContentStatus, IndexabilityStatus } from '@ilham/database';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Public list: `/v1/blog/posts?page&pageSize&category&tag&q&featured` */
export class BlogListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(50) pageSize = 12;
  /** Blog category slug. */
  @IsOptional() @IsString() @MaxLength(160) category?: string;
  /** Tag text or tag slug (matched case-insensitively against the stored tags). */
  @IsOptional() @IsString() @MaxLength(40) tag?: string;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional()
  @Transform(({ value }) => value === '1' || value === 'true')
  @IsBoolean()
  featured?: boolean;
}

/** Admin list: `/v1/blog/admin/posts?page&pageSize&status&q` */
export class BlogAdminListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}

export class CreateBlogPostDto {
  @IsString() @Length(4, 180) title: string;
  @IsOptional() @IsString() @Length(2, 200) slug?: string;
  @IsString() @Length(10, 320) excerpt: string;
  /** Markdown. */
  @IsString() @Length(20, 120000) body: string;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) coverImageUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(220) coverImageAlt?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  tags?: string[];
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(IndexabilityStatus) indexability?: IndexabilityStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(170) seoDescription?: string | null;
  /** ISO date; a future value schedules the post. `null` clears it. */
  @IsOptional() @IsISO8601() publishedAt?: string | null;
  /** Public byline; defaults to the signed-in editor. Must be an editor profile. */
  @IsOptional() @IsUUID() authorId?: string;
}

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {}

export class CreateBlogCategoryDto {
  @IsString() @Length(2, 140) name: string;
  @IsOptional() @IsString() @Length(2, 160) slug?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string | null;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsInt() @Min(0) @Max(9999) sortOrder?: number;
}

export class UpdateBlogCategoryDto extends PartialType(CreateBlogCategoryDto) {}
