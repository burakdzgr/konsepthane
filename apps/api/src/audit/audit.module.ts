import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService, JwtAuthGuard, PermissionGuard],
})
export class AuditModule {}
