import { UserStatus } from '@ilham/database';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const USERNAME = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;

export class ProfileInputDto {
  @IsOptional() @IsString() @Length(2, 120) displayName?: string;
  /** Public slug (`/uye/<username>`, `/editor/<username>`): lowercase, digits, dashes. */
  @IsOptional() @IsString() @Matches(USERNAME) username?: string;
  @IsOptional() @IsString() @Length(0, 500) bio?: string;
  @IsOptional() @IsString() @Length(0, 8000) longBio?: string;
  @IsOptional() @IsString() @Length(0, 120) jobTitle?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) expertise?: string[];
  @IsOptional() @IsObject() socialLinks?: Record<string, string>;
  @IsOptional() @IsString() @Length(0, 2048) avatarUrl?: string;
  @IsOptional() @IsString() @Length(0, 100) city?: string;
  @IsOptional() @IsString() @Length(0, 2048) websiteUrl?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsBoolean() editorActive?: boolean;
}

export class CreateUserDto extends ProfileInputDto {
  @IsEmail() email: string;
  @IsString() @Length(12, 128) password: string;
  @IsString() @Length(2, 120) declare displayName: string;
  /** Role keys; anything beyond `member` requires the `role.manage` permission. */
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) roles?: string[];
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class UpdateUserDto extends ProfileInputDto {
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsString() @Length(12, 128) password?: string;
}

export class SetRolesDto {
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) roles: string[];
}

export class UserListQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) pageSize = 50;
  @IsOptional() @IsString() @Length(1, 64) role?: string;
  @IsOptional() @IsString() @Length(1, 120) q?: string;
  @IsOptional() @IsIn(['MEMBER', 'EDITOR']) kind?: 'MEMBER' | 'EDITOR';
}
