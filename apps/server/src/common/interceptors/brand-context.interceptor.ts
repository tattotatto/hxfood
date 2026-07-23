import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

@Injectable()
export class BrandContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      const brandId = request.brandId || user.brands?.[0];
      if (brandId) {
        this.cls.set('brandId', brandId);
        this.cls.set('userId', user.sub);
        this.cls.set('orgId', user.orgId);
      }
    }

    return next.handle();
  }
}
