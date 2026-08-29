import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { SeoModule } from '../seo/seo.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [AuthModule, SeoModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, JwtAuthGuard, PermissionGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
