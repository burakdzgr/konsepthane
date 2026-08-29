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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth.guard';
import type { AuthenticatedRequest } from '../common/auth.types';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import { ListQueryDto } from '../categories/dto/category.dto';
import { ConceptsService } from './concepts.service';
import { ConceptListQueryDto, CreateConceptDto, UpdateConceptDto } from './dto/concept.dto';

@ApiTags('concepts')
@Controller('concepts')
export class ConceptsController {
  constructor(private readonly concepts: ConceptsService) {}
  @Get() list(@Query() query: ConceptListQueryDto) {
    return this.concepts.listPublic(query);
  }
  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concept.read')
  listAdmin(@Query() query: ListQueryDto) {
    return this.concepts.listAdmin(query);
  }
  @Get(':slug') get(@Param('slug') slug: string) {
    return this.concepts.getPublic(slug);
  }
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concept.write')
  create(@Body() input: CreateConceptDto, @Req() request: AuthenticatedRequest) {
    return this.concepts.create(input, request.user);
  }
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concept.write')
  update(
    @Param('id') id: string,
    @Body() input: UpdateConceptDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.concepts.update(id, input, request.user);
  }
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concept.write')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.concepts.remove(id, request.user);
  }
}
