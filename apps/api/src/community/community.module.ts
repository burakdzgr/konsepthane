import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth.guard';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from '../common/permissions';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [AuthModule],
  controllers: [CommunityController],
  providers: [CommunityService, JwtAuthGuard, PermissionGuard],
  exports: [CommunityService],
})
export class CommunityModule {}
