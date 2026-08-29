import {
  CollectionVisibility,
  CommunityContentType,
  CommunityVisibility,
  ExperienceStatus,
  IndexabilityStatus,
  ModerationActionType,
  ModerationStatus,
  PollStatus,
  QuestionStatus,
  ReactionType,
  ReportReason,
  ReportStatus,
} from '@ilham/database';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  Equals,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CommunityListDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @IsString() @Length(1, 30) tab = 'personalized';
  @IsOptional() @IsString() @Length(1, 140) topic?: string;
  @IsOptional() @IsString() @Length(1, 180) q?: string;
  @IsOptional() @IsString() @Length(1, 140) eventType?: string;
  @IsOptional() @IsString() @Length(1, 100) venue?: string;
  @IsOptional() @IsString() @Length(1, 200) concept?: string;
  @IsOptional() @IsIn(['popular', 'new']) sort?: 'popular' | 'new';
}

export class InteractionStateDto {
  @IsEnum(CommunityContentType) contentType: CommunityContentType;
  @IsUUID() contentId: string;
}

export class ModerateQuestionDto {
  @IsOptional() @IsEnum(ModerationStatus) moderationStatus?: ModerationStatus;
  @IsOptional() @IsEnum(CommunityVisibility) visibility?: CommunityVisibility;
  @IsOptional() @IsEnum(IndexabilityStatus) indexability?: IndexabilityStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsEnum(QuestionStatus) status?: QuestionStatus;
}

export class ModerateCommentDto {
  @IsOptional() @IsEnum(ModerationStatus) moderationStatus?: ModerationStatus;
  @IsOptional() @IsEnum(CommunityVisibility) visibility?: CommunityVisibility;
}

export class UpdateCollectionDto {
  @IsOptional() @IsString() @Length(2, 160) title?: string;
  @IsOptional() @IsString() @Length(0, 500) description?: string;
  @IsOptional() @IsEnum(CollectionVisibility) visibility?: CollectionVisibility;
}

export class CreateQuestionDto {
  @IsString() @Length(10, 180) title: string;
  @IsString() @Length(20, 10000) body: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsUUID('4', { each: true }) topicIds?: string[];
  @IsOptional() @IsUUID() conceptId?: string;
  @IsOptional() @IsUUID() eventTypeId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) imageUrls?: string[];
}

export class CreateConceptSuggestionDto {
  @IsUUID() categoryId: string;
  @IsString() @Length(10, 180) title: string;
  @IsString() @Length(40, 320) summary: string;
  @IsString() @Length(100, 15000) body: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) imageUrls?: string[];
  @IsBoolean() @Equals(true) rightsConfirmed: boolean;
}

export class CreateExperienceDto {
  @IsString() @Length(10, 180) title: string;
  @IsString() @Length(40, 15000) body: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsString({ each: true }) imageUrls: string[];
  @IsOptional() @IsUUID() conceptId?: string;
  @IsOptional() @IsUUID() eventTypeId?: string;
  @IsOptional() @IsString() @Length(0, 100) city?: string;
  @IsOptional() @IsString() @Length(0, 100) venueType?: string;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10000)
  guestCount?: number;
  @IsOptional() @IsString() @Length(0, 60) ageLabel?: string;
  @IsOptional() @IsString() @Length(0, 80) budgetLabel?: string;
  @IsOptional() @IsString() @Length(0, 160) themeVariation?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) colors?: string[];
  @IsOptional() @IsString() @Length(0, 3000) tips?: string;
  @IsOptional() @IsString() @Length(0, 3000) whatWorked?: string;
  @IsOptional() @IsString() @Length(0, 3000) whatWouldChange?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsUUID('4', { each: true }) topicIds?: string[];
  @IsBoolean() @Equals(true) rightsConfirmed: boolean;
}

export class ModerateExperienceDto {
  @IsOptional() @IsEnum(ExperienceStatus) status?: ExperienceStatus;
  @IsOptional() @IsEnum(IndexabilityStatus) indexability?: IndexabilityStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsUUID() conceptId?: string;
  @IsOptional() @IsUUID() eventTypeId?: string;
}

export class CreateAnswerDto {
  @IsString() @Length(20, 10000) body: string;
}

export class CreateDiscussionDto {
  @IsString() @Length(10, 180) title: string;
  @IsString() @Length(20, 15000) body: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsUUID('4', { each: true }) topicIds?: string[];
}

export class CreatePollDto {
  @IsString() @Length(10, 180) title: string;
  @IsOptional() @IsString() @Length(0, 1000) body?: string;
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(8) @IsString({ each: true }) options: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsUUID('4', { each: true }) topicIds?: string[];
}

export class VoteDto {
  @IsUUID() optionId: string;
}

export class CreateCommentDto {
  @IsEnum(CommunityContentType) contentType: CommunityContentType;
  @IsUUID() contentId: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsString() @Length(2, 3000) body: string;
}

export class InteractionDto {
  @IsEnum(CommunityContentType) contentType: CommunityContentType;
  @IsUUID() contentId: string;
  @IsOptional() @IsEnum(ReactionType) reactionType: ReactionType = ReactionType.LIKE;
}

export class CreateCollectionDto {
  @IsString() @Length(2, 160) title: string;
  @IsOptional() @IsString() @Length(0, 500) description?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class AddCollectionItemDto {
  @IsEnum(CommunityContentType) contentType: CommunityContentType;
  @IsUUID() contentId: string;
}

export class CreateReportDto {
  @IsEnum(CommunityContentType) contentType: CommunityContentType;
  @IsUUID() contentId: string;
  @IsEnum(ReportReason) reason: ReportReason;
  @IsOptional() @IsString() @Length(0, 1000) details?: string;
}

export class ModerationQueryDto extends CommunityListDto {
  @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
  @IsOptional() @IsEnum(CommunityContentType) contentType?: CommunityContentType;
}

export class ModerationActionDto {
  @IsEnum(ModerationActionType) action: ModerationActionType;
  @IsOptional() @IsString() @Length(0, 1000) reason?: string;
}

export class UpdatePollStatusDto {
  @IsEnum(PollStatus) status: PollStatus;
}
