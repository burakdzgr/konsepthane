import { ContentStatus, IndexabilityStatus } from '@ilham/database';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class ConceptPaletteEntry {
  name: string;
  hex: string;
}

export class ConceptFaqEntry {
  question: string;
  answer: string;
}

export class ConceptImageInput {
  url: string;
  altText: string;
}

export class CreateConceptDto {
  @IsUUID() categoryId: string;
  @IsString() @Length(4, 180) title: string;
  @IsString() @Length(4, 200) slug: string;
  @IsString() @Length(10, 320) summary: string;
  @IsString() @Length(20, 30000) description: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() @Length(0, 2048) heroImageUrl?: string;
  @IsOptional() @IsString() @Length(0, 220) heroImageAlt?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100000000) budgetMin?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100000000) budgetMax?: number;
  @IsOptional() @IsString() @Length(0, 5000) introduction?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) colorPalette?: ConceptPaletteEntry[];
  @IsOptional() @IsString() @Length(0, 20000) decorationIdeas?: string;
  @IsOptional() @IsString() @Length(0, 20000) tableSetup?: string;
  @IsOptional() @IsString() @Length(0, 20000) balloonIdeas?: string;
  @IsOptional() @IsString() @Length(0, 20000) cakeIdeas?: string;
  @IsOptional() @IsString() @Length(0, 20000) venueSuggestions?: string;
  @IsOptional() @IsString() @Length(0, 20000) practicalTips?: string;
  @IsOptional() @IsString() @Length(0, 20000) alternatives?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) faq?: ConceptFaqEntry[];
  @IsOptional() @IsArray() @ArrayMaxSize(12) images?: ConceptImageInput[];
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsEnum(IndexabilityStatus) indexability?: IndexabilityStatus;
  /** Public byline (an active editor). Defaults to the signed-in editor; empty for admin accounts. */
  @IsOptional() @IsUUID() authorId?: string;
}

export class UpdateConceptDto extends PartialType(CreateConceptDto) {}

export class ConceptListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsIn(['popular', 'new', 'saved']) sort?: 'popular' | 'new' | 'saved';
  @IsOptional() @IsString() @Length(1, 160) category?: string;
  @IsOptional() @IsString() @Length(1, 180) q?: string;
}
