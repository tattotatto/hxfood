import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClsService } from 'nestjs-cls';
import { JwtPayload } from '@hxfood/shared-types';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private prisma: PrismaService,
    private cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status === 'disabled') {
      throw new UnauthorizedException('User disabled');
    }
    if (payload.brands.length > 0) {
      this.cls.set('brandId', payload.brands[0]);
    }
    this.cls.set('userId', payload.sub);
    this.cls.set('orgId', payload.orgId);
    return payload;
  }
}
