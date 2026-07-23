import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission';
import { IS_PUBLIC_KEY } from '../decorators/public';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.permissions) {
      throw new ForbiddenException('No permissions found');
    }
    if (user.permissions.includes('*:*')) {
      return true;
    }
    const hasPermission = requiredPermissions.some((rp) =>
      user.permissions.includes(rp),
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermissions.join(', ')}`,
      );
    }
    return true;
  }
}
