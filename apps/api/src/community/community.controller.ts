import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommunityContentType } from '@ilham/database';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth.guard';
import type { AuthenticatedRequest } from '../common/auth.types';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import {
  AddCollectionItemDto,
  CommunityListDto,
  CreateAnswerDto,
  CreateCollectionDto,
  CreateCommentDto,
  CreateConceptSuggestionDto,
  CreateDiscussionDto,
  CreateExperienceDto,
  CreatePollDto,
  CreateQuestionDto,
  CreateReportDto,
  InteractionDto,
  InteractionStateDto,
  ModerateCommentDto,
  ModerateExperienceDto,
  ModerateQuestionDto,
  ModerationActionDto,
  ModerationQueryDto,
  UpdateCollectionDto,
  VoteDto,
} from './community.dto';
import { CommunityService } from './community.service';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('feed') feed(@Query() query: CommunityListDto) {
    return this.community.feed(query);
  }
  @Get('overview') overview() {
    return this.community.overview();
  }
  @Get('topics') topics(@Query() query: CommunityListDto) {
    return this.community.listTopics(query);
  }
  @Get('event-types') eventTypes() {
    return this.community.eventTypes();
  }
  @Get('topics/:slug') topic(@Param('slug') slug: string) {
    return this.community.getTopic(slug);
  }
  @Get('questions') questions(@Query() query: CommunityListDto) {
    return this.community.listQuestions({
      ...query,
      tab: query.tab === 'following' ? 'new' : query.tab,
    });
  }
  @Get('questions/following/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  followingQuestions(@Req() request: AuthenticatedRequest, @Query() query: CommunityListDto) {
    return this.community.listQuestions({ ...query, tab: 'following' }, request.user.sub);
  }
  @Get('questions/:slug') question(@Param('slug') slug: string) {
    return this.community.getQuestion(slug);
  }
  @Get('discussions') discussions(@Query() query: CommunityListDto) {
    return this.community.listDiscussions(query);
  }
  @Get('discussions/:slug') discussion(@Param('slug') slug: string) {
    return this.community.getDiscussion(slug);
  }
  @Get('polls/:slug') poll(@Param('slug') slug: string) {
    return this.community.getPoll(slug);
  }
  @Get('guides/:slug') guide(@Param('slug') slug: string) {
    return this.community.getGuide(slug);
  }
  @Get('stories') stories(@Query() query: CommunityListDto) {
    return this.community.listExperiences(query);
  }
  @Get('stories/:slug') story(@Param('slug') slug: string) {
    return this.community.getExperience(slug);
  }
  @Get('experiences') experiences(@Query() query: CommunityListDto) {
    return this.community.listExperiences(query);
  }
  @Get('experiences/:slug') experience(@Param('slug') slug: string) {
    return this.community.getExperience(slug);
  }
  @Get('collections/public') publicCollections(@Query() query: CommunityListDto) {
    return this.community.listPublicCollections(query);
  }
  @Get('collections/public/:slug') publicCollection(@Param('slug') slug: string) {
    return this.community.getPublicCollection(slug);
  }
  @Get('profiles/:username') profile(@Param('username') username: string) {
    return this.community.getProfile(username);
  }
  @Get('comments/:contentType/:contentId') comments(
    @Param('contentType') contentType: CommunityContentType,
    @Param('contentId') contentId: string,
  ) {
    return this.community.listComments(contentType, contentId);
  }
  @Get('search/all') search(@Query() query: CommunityListDto) {
    return this.community.search(query);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.community.me(request.user.sub);
  }
  @Get('interactions/state')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  interactionState(@Req() request: AuthenticatedRequest, @Query() query: InteractionStateDto) {
    return this.community.interactionState(request.user.sub, query.contentType, query.contentId);
  }
  @Get('saves/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  savedItems(@Req() request: AuthenticatedRequest) {
    return this.community.savedItems(request.user.sub);
  }
  @Post('questions/:id/follow/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  followQuestion(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.community.toggleQuestionFollow(request.user.sub, id);
  }

  @Get('topics/following/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  followedTopics(@Req() request: AuthenticatedRequest) {
    return this.community.followedTopics(request.user.sub);
  }
  @Post('topics/:id/follow/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  followTopic(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.community.toggleTopicFollow(request.user.sub, id);
  }

  @Post('questions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createQuestion(@Req() request: AuthenticatedRequest, @Body() input: CreateQuestionDto) {
    return this.community.createQuestion(request.user.sub, input);
  }
  @Post('concept-suggestions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createConceptSuggestion(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateConceptSuggestionDto,
  ) {
    return this.community.createConceptSuggestion(request.user.sub, input);
  }
  @Post('questions/:id/answers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: CreateAnswerDto,
  ) {
    return this.community.addAnswer(request.user.sub, id, input);
  }
  @Patch('questions/:id/answers/:answerId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  acceptAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('answerId') answerId: string,
  ) {
    return this.community.acceptAnswer(request.user.sub, id, answerId);
  }

  @Post('discussions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createDiscussion(@Req() request: AuthenticatedRequest, @Body() input: CreateDiscussionDto) {
    return this.community.createDiscussion(request.user.sub, input);
  }
  @Post('experiences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createExperience(@Req() request: AuthenticatedRequest, @Body() input: CreateExperienceDto) {
    return this.community.createExperience(request.user.sub, input);
  }
  @Post('polls')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createPoll(@Req() request: AuthenticatedRequest, @Body() input: CreatePollDto) {
    return this.community.createPoll(request.user.sub, input);
  }
  @Post('polls/:id/vote')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  vote(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: VoteDto) {
    return this.community.vote(request.user.sub, id, input.optionId);
  }

  @Post('comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addComment(@Req() request: AuthenticatedRequest, @Body() input: CreateCommentDto) {
    return this.community.addComment(request.user.sub, input);
  }
  @Post('reactions/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  reaction(@Req() request: AuthenticatedRequest, @Body() input: InteractionDto) {
    return this.community.toggleReaction(request.user.sub, input);
  }
  @Post('saves/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  save(@Req() request: AuthenticatedRequest, @Body() input: InteractionDto) {
    return this.community.toggleSave(request.user.sub, input);
  }
  @Post('follows/users/:id/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  follow(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.community.toggleUserFollow(request.user.sub, id);
  }
  @Get('notifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  notifications(@Req() request: AuthenticatedRequest) {
    return this.community.notifications(request.user.sub);
  }

  @Get('collections/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  collections(@Req() request: AuthenticatedRequest) {
    return this.community.collections(request.user.sub);
  }
  @Post('collections')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createCollection(@Req() request: AuthenticatedRequest, @Body() input: CreateCollectionDto) {
    return this.community.createCollection(request.user.sub, input);
  }
  @Post('collections/:id/items')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addCollectionItem(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: AddCollectionItemDto,
  ) {
    return this.community.addCollectionItem(request.user.sub, id, input);
  }
  @Patch('collections/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateCollection(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateCollectionDto,
  ) {
    return this.community.updateCollection(request.user.sub, id, input);
  }
  @Delete('collections/:id/items')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeCollectionItemByContent(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: AddCollectionItemDto,
  ) {
    return this.community.removeCollectionItemByContent(request.user.sub, id, input);
  }
  @Delete('collections/:id/items/:itemId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeCollectionItem(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.community.removeCollectionItem(request.user.sub, id, itemId);
  }
  @Post('reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  report(@Req() request: AuthenticatedRequest, @Body() input: CreateReportDto) {
    return this.community.report(request.user.sub, input);
  }

  @Get('admin/overview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  adminOverview() {
    return this.community.adminOverview();
  }
  @Get('admin/experiences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  adminExperiences(@Query() query: CommunityListDto) {
    return this.community.adminExperiences(query);
  }
  @Patch('admin/experiences/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  updateExperience(@Param('id') id: string, @Body() input: ModerateExperienceDto) {
    return this.community.updateExperience(id, input);
  }
  @Post('admin/experiences/:id/images/:imageId/remove')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  removeExperienceImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.community.removeExperienceImage(id, imageId);
  }
  @Get('admin/questions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  adminQuestions(@Query() query: CommunityListDto) {
    return this.community.adminQuestions(query);
  }
  @Patch('admin/questions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  updateQuestion(@Param('id') id: string, @Body() input: ModerateQuestionDto) {
    return this.community.updateQuestion(id, input);
  }
  @Get('admin/comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  adminComments(@Query() query: CommunityListDto) {
    return this.community.adminComments(query);
  }
  @Patch('admin/comments/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  updateComment(@Param('id') id: string, @Body() input: ModerateCommentDto) {
    return this.community.updateComment(id, input);
  }
  @Get('admin/moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  moderation(@Query() query: ModerationQueryDto) {
    return this.community.moderationQueue(query);
  }
  @Post('admin/moderation/:id/actions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('moderation.manage')
  moderate(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: ModerationActionDto,
  ) {
    return this.community.moderate(id, request.user.sub, input);
  }
}
