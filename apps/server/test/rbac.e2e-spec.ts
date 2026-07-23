import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let storeToken: string;

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

    const storeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'store01', password: 'test123' });
    storeToken = storeRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/rbac/roles — admin (*:*) can access', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // 应包含角色
    const codes = res.body.map((r: any) => r.code);
    expect(codes).toContain('super_admin');
    expect(codes).toContain('store_admin');
  });

  it('GET /api/v1/rbac/roles — store01 (no *:*) gets 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${storeToken}`)
      .expect(403);
  });

  it('store01 token includes correct permissions in profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${storeToken}`)
      .expect(200);

    expect(res.body.orgs[0].roles).toContain('store_admin');
    expect(res.body.orgs[0].permissions).toContain('order:create');
    expect(res.body.orgs[0].permissions).toContain('product:view');
    // 加盟店不应该有 *:*
    expect(res.body.orgs[0].permissions).not.toContain('*:*');
  });
});
