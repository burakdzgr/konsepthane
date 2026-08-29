import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { SeoModule } from '../seo/seo.module';
import { ConceptsController } from './concepts.controller';
import { ConceptsService } from './concepts.service';

@Module({
  imports: [AuthModule, SeoModule],
  controllers: [ConceptsController],
  providers: [ConceptsService, JwtAuthGuard, PermissionGuard],
})
export class ConceptsModule {}
