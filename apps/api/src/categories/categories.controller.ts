import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, ListQueryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}
  @Get() list(@Query() query: ListQueryDto) {
    return this.categories.listPublic(query.page, query.pageSize);
  }
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.categories.getPublic(slug);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('category.read')
  listAdmin(@Query() query: ListQueryDto) {
    return this.categories.listAdmin(query);
  }
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('category.write')
  create(@Body() input: CreateCategoryDto) {
    return this.categories.create(input);
  }
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('category.write')
  update(@Param('id') id: string, @Body() input: UpdateCategoryDto) {
    return this.categories.update(id, input);
  }
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('category.write')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
