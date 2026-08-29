import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';

@Module({
  imports: [AuthModule],
  controllers: [GuidesController],
  providers: [GuidesService, JwtAuthGuard, PermissionGuard],
})
export class GuidesModule {}
