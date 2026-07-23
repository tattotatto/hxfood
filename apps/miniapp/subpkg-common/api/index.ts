import api from './request';
import type { TokenResponse, UserProfile, SkuVo, OrderVo } from '@hxfood/shared-types';

// ── Auth ──
export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }),
  wechatLogin: (code: string) =>
    api.post<TokenResponse>('/auth/wechat-login', { code }),
  getProfile: () =>
    api.get<UserProfile>('/auth/profile'),
  refresh: (refreshToken: string) =>
    api.post<TokenResponse>('/auth/refresh', { refreshToken }),
};

// ── Products ──
export const productApi = {
  getCategories: () => api.get('/products/categories'),
  getSkus: () => api.get<SkuVo[]>('/products/skus'),
  getSkuById: (id: string) => api.get(`/products/skus/${id}`),
  getSpus: (categoryId?: string) =>
    api.get('/products/spus', categoryId ? { categoryId } : undefined),
};

// ── Orders ──
export const orderApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: any) => api.get('/orders', params),
  detail: (id: string) => api.get<OrderVo>(`/orders/${id}`),
  approve: (id: string) => api.post(`/orders/${id}/approve`),
  reject: (id: string, comment: string) => api.post(`/orders/${id}/reject`, { comment }),
  cancel: (id: string) => api.post(`/orders/${id}/cancel`),
  receive: (id: string) => api.post(`/orders/${id}/receive`),
};

// ── Organization ──
export const orgApi = {
  franchiseApply: (data: any, brandId: string) =>
    api.post(`/organizations/franchise-apply?brandId=${brandId}`, data),
  getMyStore: () => api.get('/organizations/my-store/info'),
  updateMyStore: (data: any) => api.put('/organizations/my-store/info', data),
};

// ── Payment ──
export const paymentApi = {
  payByBalance: (data: any) => api.post('/payment/pay-by-balance', data),
};
