import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { CurrentUser } from '../../common/decorators/current-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('users')
export class UserController {
  constructor(private authService: AuthService) {}

  @Get()
  @RequirePermission('store:view')
  async listUsers() {
    return this.authService.listUsers();
  }

  @Post()
  @RequirePermission('store:view')
  async createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Put(':id')
  @RequirePermission('store:view')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.authService.updateUser(id, dto);
  }

  @Delete(':id')
  @RequirePermission('store:view')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.authService.deactivateUser(id, user.sub);
  }
}
