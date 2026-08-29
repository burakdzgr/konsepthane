import { RobotsDirective, SeoEntityType } from '@ilham/database';
import { IsEnum, IsObject, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class SeoEntityParamsDto {
  @IsEnum(SeoEntityType) entityType: SeoEntityType;
  @IsUUID() entityId: string;
}

export class RedirectQueryDto {
  /** Locale-less public path, e.g. `/konsept/eski-slug`. */
  @IsString() @Length(2, 500) @Matches(/^\/[^\s]*$/) path: string;
}

export class UpsertSeoMetadataDto {
  @IsString() @Length(10, 70) title: string;
  @IsString() @Length(50, 170) description: string;
  @IsOptional() @IsString() @Length(1, 2048) canonicalUrl?: string;
  @IsOptional() @IsEnum(RobotsDirective) robots?: RobotsDirective;
  @IsOptional() @IsObject() structuredData?: Record<string, unknown>;
}
