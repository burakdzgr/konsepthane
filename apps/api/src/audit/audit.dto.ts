import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class AuditListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize = 50;
  @IsOptional() @IsString() @Length(1, 120) q?: string;
  @IsOptional() @IsString() @Length(1, 80) entityType?: string;
}
