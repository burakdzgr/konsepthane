import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [AuthModule],
  controllers: [SeoController],
  providers: [SeoService, JwtAuthGuard, PermissionGuard],
  exports: [SeoService],
})
export class SeoModule {}
