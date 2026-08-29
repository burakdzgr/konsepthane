import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/auth.guard';
import type { AuthenticatedRequest } from '../common/auth.types';
import { PermissionGuard, RequirePermissions } from '../common/permissions';
import { CreateUserDto, SetRolesDto, UpdateUserDto, UserListQueryDto } from './users.dto';
import { UsersService } from './users.service';

/** Admin user / editor management. Every route is server-side guarded by permission keys. */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('user.read')
  list(@Query() query: UserListQueryDto) {
    return this.users.list(query);
  }

  @Get('roles')
  @RequirePermissions('user.read')
  roles() {
    return this.users.listRoles();
  }

  @Get('editor-options')
  @RequirePermissions('concept.read')
  editorOptions() {
    return this.users.listEditorOptions();
  }

  @Get(':id')
  @RequirePermissions('user.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @Post()
  @RequirePermissions('user.write')
  create(@Body() input: CreateUserDto, @Req() request: AuthenticatedRequest) {
    return this.users.create(input, request.user);
  }

  @Patch(':id')
  @RequirePermissions('user.write')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateUserDto) {
    return this.users.update(id, input);
  }

  @Put(':id/roles')
  @RequirePermissions('role.manage')
  setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SetRolesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.setRoles(id, input, request.user);
  }

  @Delete(':id')
  @RequirePermissions('user.write')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.users.softDelete(id, request.user);
  }
}

/** Public editor profiles (only active, public editors). */
@ApiTags('editors')
@Controller('editors')
export class EditorsController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.listEditors();
  }

  @Get(':username')
  get(@Param('username') username: string) {
    return this.users.getEditor(username);
  }
}
