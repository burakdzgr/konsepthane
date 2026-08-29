import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { MediaController } from './media.controller';
import { S3StorageService } from './storage.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [S3StorageService, JwtAuthGuard, PermissionGuard],
  exports: [S3StorageService],
})
export class MediaModule {}
