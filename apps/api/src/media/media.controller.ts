import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/auth.guard';
import type { AuthenticatedRequest } from '../common/auth.types';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import { S3StorageService, type UploadedBinary } from './storage.service';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 15_000_000;

class CreateUploadDto {
  @IsString() filename: string;
  @IsIn(IMAGE_MIME_TYPES) contentType: string;
  @IsInt() @Min(1) @Max(MAX_IMAGE_BYTES) byteSize: number;
}

@ApiTags('media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly storage: S3StorageService) {}

  /** Presigned direct-to-bucket upload (browser → S3); used by member-facing flows. */
  @Post('uploads')
  @UseGuards(JwtAuthGuard)
  createUpload(@Body() input: CreateUploadDto) {
    return this.storage.createUpload(input);
  }

  /**
   * Server-side multipart upload for the admin panel: the file is streamed through the API,
   * validated (type/size), stored in the bucket and registered as a READY `MediaAsset`.
   * Returns the public URL to store on the content record.
   */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('media.manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async upload(@Req() request: AuthenticatedRequest, @UploadedFile() file?: UploadedBinary) {
    if (!file) throw new BadRequestException('Dosya bulunamadı (alan adı: file).');
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype))
      throw new BadRequestException('Yalnızca JPEG, PNG, WebP veya AVIF görsel yüklenebilir.');
    if (file.size > MAX_IMAGE_BYTES)
      throw new BadRequestException('Görsel en fazla 15 MB olabilir.');
    return this.storage.storeImage(file, request.user.sub);
  }
}
