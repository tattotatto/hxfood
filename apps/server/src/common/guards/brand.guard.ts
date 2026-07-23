import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public';

@Injectable()
export class BrandGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    const brandId = request.headers['x-brand-id'] || user.brands?.[0];
    if (!brandId) return true;

    if (!user.brands?.includes(brandId)) {
      throw new ForbiddenException(`No access to brand: ${brandId}`);
    }

    request.brandId = brandId;
    return true;
  }
}
