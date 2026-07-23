import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Brand Isolation (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;   // brand WYZJ
  let storeBToken: string;  // brand MMJD

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'test123' });
    adminToken = adminRes.body.accessToken;

    const storeBRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'storeb01', password: 'test123' });
    storeBToken = storeBRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin can access own brand context by default', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // admin 的默认品牌应为 WYZJ
    expect(res.body.currentOrg.brandId).toBeDefined();
  });

  it('storeb01 (brand MMJD) profile shows correct brand', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${storeBToken}`)
      .expect(200);

    const brandNames = res.body.orgs.map((o: any) => o.brandName);
    expect(brandNames).toContain('面面聚道');
  });

  it('should reject access with invalid X-Brand-Id header', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Brand-Id', '00000000-0000-0000-0000-000000000000')
      .expect(403);

    expect(res.body.message).toContain('No access to brand');
  });

  it('storeb01 should not have access to WYZJ brand resources', async () => {
    // storeb01 的 token 对应 MMJD 品牌，当尝试访问 WYZJ 时被拒绝
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${storeBToken}`)
      .set('X-Brand-Id', 'mock-wyzj-brand-id') // 不在 storeb01 的品牌列表中
      .expect(403);
  });
});
