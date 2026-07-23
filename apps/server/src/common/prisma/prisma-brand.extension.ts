import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

const PUBLIC_MODELS = ['Brand', 'User', 'Role', 'Permission', 'RolePermission'];

export const brandIsolationExtension = (cls: ClsService) =>
  Prisma.defineExtension({
    name: 'brandIsolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const brandId = cls.get('brandId');

          if (PUBLIC_MODELS.includes(model as string) || !brandId) {
            return query(args);
          }

          switch (operation) {
            case 'findUnique':
            case 'findFirst':
            case 'findMany':
            case 'count':
            case 'findUniqueOrThrow':
            case 'findFirstOrThrow':
              args.where = { ...args.where, brandId };
              break;

            case 'create':
              args.data = { ...args.data, brandId };
              break;

            case 'createMany':
              if (Array.isArray(args.data)) {
                args.data = args.data.map((d: any) => ({ ...d, brandId }));
              } else {
                args.data = { ...args.data, brandId };
              }
              break;

            case 'update':
            case 'delete':
            case 'updateMany':
            case 'deleteMany':
            case 'upsert':
              args.where = { ...args.where, brandId };
              break;
          }

          return query(args);
        },
      },
    },
  });
