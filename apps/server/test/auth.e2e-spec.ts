import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'test123' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.expiresIn).toBe(7200);
    });

    it('should reject invalid password with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);
    });

    it('should reject non-existent user with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'nobody', password: 'test123' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/wechat-login', () => {
    it('should create user and return tokens for new wechat code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/wechat-login')
        .send({ code: 'wx_test_new_user_001' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'test123' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.username).toBe('admin');
      expect(res.body.orgs.length).toBeGreaterThan(0);
      expect(res.body.orgs[0].permissions).toContain('*:*');
    });

    it('should reject without token with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should reject with malformed token with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'test123' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'bad-token' })
        .expect(401);
    });
  });
});
