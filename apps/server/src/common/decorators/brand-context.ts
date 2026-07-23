import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const BrandContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      brandId: request.brandId,
      userId: request.user?.sub,
      orgId: request.user?.orgId,
    };
  },
);
