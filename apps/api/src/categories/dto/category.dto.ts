import { ContentStatus } from '@ilham/database';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @Length(2, 140) name: string;
  @IsString() @Length(2, 160) slug: string;
  @IsOptional() @IsString() @Length(0, 5000) description?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
}
