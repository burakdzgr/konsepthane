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
import { ListQueryDto } from '../categories/dto/category.dto';
import { CreateGuideDto, UpdateGuideDto } from './guides.dto';
import { GuidesService } from './guides.service';

@ApiTags('guides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('guides')
export class GuidesController {
  constructor(private readonly guides: GuidesService) {}

  @Get('admin/all')
  @RequirePermissions('concept.read')
  listAdmin(@Query() query: ListQueryDto) {
    return this.guides.listAdmin(query);
  }

  @Post()
  @RequirePermissions('concept.write')
  create(@Body() input: CreateGuideDto, @Req() request: AuthenticatedRequest) {
    return this.guides.create(input, request.user);
  }

  @Patch(':id')
  @RequirePermissions('concept.write')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateGuideDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.guides.update(id, input, request.user);
  }

  @Delete(':id')
  @RequirePermissions('concept.write')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.guides.remove(id, request.user);
  }
}
