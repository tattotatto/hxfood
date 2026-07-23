import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload, TokenResponse, UserProfile } from '@hxfood/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto.username, dto.password, dto.brandId);
  }

  @Public()
  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto): Promise<TokenResponse> {
    return this.authService.wechatLogin(dto.code, dto.brandId);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<TokenResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload): Promise<UserProfile> {
    return this.authService.getProfile(user.sub);
  }
}
