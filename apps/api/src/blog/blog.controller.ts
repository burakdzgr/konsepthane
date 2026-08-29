import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth.guard';
import type { AuthenticatedRequest } from '../common/auth.types';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import {
  BlogAdminListQueryDto,
  BlogListQueryDto,
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  UpdateBlogCategoryDto,
  UpdateBlogPostDto,
} from './blog.dto';
import { BlogService } from './blog.service';

/** Anonymous read side used by the web app (ISR) and the RSS feed. */
@ApiTags('blog')
@Controller('blog')
export class BlogPublicController {
  constructor(private readonly blog: BlogService) {}

  @Get('posts')
  list(@Query() query: BlogListQueryDto) {
    return this.blog.listPublic(query);
  }

  @Get('posts/:slug')
  detail(@Param('slug') slug: string) {
    return this.blog.getPublic(slug);
  }

  @Get('categories')
  categories() {
    return this.blog.listCategoriesPublic();
  }

  @Get('tags')
  tags() {
    return this.blog.listTagsPublic();
  }
}

/** Back-office side: editors (`concept.*`) manage posts, `category.write` manages the taxonomy. */
@ApiTags('blog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('blog/admin')
export class BlogAdminController {
  constructor(private readonly blog: BlogService) {}

  @Get('posts')
  @RequirePermissions('concept.read')
  listPosts(@Query() query: BlogAdminListQueryDto) {
    return this.blog.listAdmin(query);
  }

  @Post('posts')
  @RequirePermissions('concept.write')
  createPost(@Body() input: CreateBlogPostDto, @Req() request: AuthenticatedRequest) {
    return this.blog.create(input, request.user);
  }

  @Patch('posts/:id')
  @RequirePermissions('concept.write')
  updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateBlogPostDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.blog.update(id, input, request.user);
  }

  @Delete('posts/:id')
  @RequirePermissions('concept.write')
  removePost(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.blog.remove(id, request.user);
  }

  @Get('categories')
  @RequirePermissions('concept.read')
  listCategories() {
    return this.blog.listCategoriesAdmin();
  }

  @Post('categories')
  @RequirePermissions('category.write')
  createCategory(@Body() input: CreateBlogCategoryDto) {
    return this.blog.createCategory(input);
  }

  @Patch('categories/:id')
  @RequirePermissions('category.write')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateBlogCategoryDto) {
    return this.blog.updateCategory(id, input);
  }

  @Delete('categories/:id')
  @RequirePermissions('category.write')
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.blog.removeCategory(id);
  }
}
