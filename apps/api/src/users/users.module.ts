import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth.guard';
import { PermissionGuard } from '../common/permissions';
import { EditorsController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, EditorsController],
  providers: [UsersService, JwtAuthGuard, PermissionGuard],
  exports: [UsersService],
})
export class UsersModule {}
