import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve admin-hq SPA from ../admin-hq/dist
  const adminDist = join(__dirname, '..', 'admin-hq');
  app.useStaticAssets(adminDist);
  // SPA fallback: serve index.html for all non-API, non-static routes
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/') || req.path.includes('.')) return next();
    res.sendFile(join(adminDist, 'index.html'));
  });

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
