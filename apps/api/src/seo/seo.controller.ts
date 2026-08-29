import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import { RedirectQueryDto, SeoEntityParamsDto, UpsertSeoMetadataDto } from './seo.dto';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  /** Used by the web app before returning a 404: legacy slugs resolve to a 308. */
  @Get('redirect')
  redirect(@Query() query: RedirectQueryDto) {
    return this.seo.resolveRedirect(query.path);
  }

  @Get('metadata/:entityType/:entityId')
  metadata(@Param() params: SeoEntityParamsDto) {
    return this.seo.getMetadata(params.entityType, params.entityId);
  }

  @Put('metadata/:entityType/:entityId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concept.write')
  upsert(@Param() params: SeoEntityParamsDto, @Body() input: UpsertSeoMetadataDto) {
    return this.seo.upsertMetadata(params.entityType, params.entityId, input);
  }

  @Delete('metadata/:entityType/:entityId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('concept.write')
  remove(@Param() params: SeoEntityParamsDto) {
    return this.seo.removeMetadata(params.entityType, params.entityId);
  }
}
