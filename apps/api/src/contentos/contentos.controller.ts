import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ContentosContractErrorFilter } from './contract-error.filter';
import { ContentosService } from './contentos.service';
import { ContentosServiceGuard } from './service-token.guard';

/**
 * ContentOS Publishing API v1 receiving endpoints (service-to-service).
 *
 * These paths sit OUTSIDE the public `v1` global prefix (excluded in
 * `main.ts`) so the wire paths match the accepted contract exactly:
 * `<CONTENTOS_PUBLISHING_API_URL>/v1/media/{sha256}` and
 * `<CONTENTOS_PUBLISHING_API_URL>/v1/publications`, where the base URL ends
 * at `.../internal/contentos`. Hidden from the public OpenAPI document.
 */
@ApiExcludeController()
@ApiBearerAuth()
@UseGuards(ContentosServiceGuard)
@UseFilters(ContentosContractErrorFilter)
@Controller('internal/contentos/v1')
export class ContentosController {
  // Explicit token: vitest/esbuild does not emit design metadata.
  constructor(@Inject(ContentosService) private readonly contentos: ContentosService) {}

  @Put('media/:sha256')
  async putMedia(
    @Param('sha256') sha256: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('content-type') contentType?: string,
    @Headers('x-content-sha256') headerSha?: string,
  ) {
    const data: unknown = request.body;
    if (!Buffer.isBuffer(data))
      throw new BadRequestException({
        code: 'malformed_request',
        message: 'Raw binary media bytes are required.',
      });
    const { replayed, ...result } = await this.contentos.storeMedia(
      sha256.toLowerCase(),
      data,
      (contentType ?? '').split(';')[0]!.trim().toLowerCase(),
      headerSha?.toLowerCase(),
    );
    response.status(replayed ? 200 : 201);
    return result;
  }

  @Post('publications')
  @HttpCode(201)
  async publish(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey)
      throw new BadRequestException({
        code: 'malformed_request',
        message: 'The Idempotency-Key header is required.',
      });
    const { result, replayed } = await this.contentos.publish(body as never, idempotencyKey);
    // Contract: 201 on first publish, 200 on an idempotent replay.
    response.status(replayed ? 200 : 201);
    return result;
  }
}
