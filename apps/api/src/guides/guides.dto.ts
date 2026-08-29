import { ContentStatus, IndexabilityStatus } from '@ilham/database';
import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateGuideDto {
  @IsString() @Length(4, 180) title: string;
  @IsOptional() @IsString() @Length(4, 200) slug?: string;
  @IsString() @Length(10, 320) summary: string;
  @IsString() @Length(20, 60000) body: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsEnum(IndexabilityStatus) indexability?: IndexabilityStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  /** Public byline; defaults to the signed-in editor. Must be an editor profile. */
  @IsOptional() @IsUUID() authorId?: string;
}

export class UpdateGuideDto extends PartialType(CreateGuideDto) {}
