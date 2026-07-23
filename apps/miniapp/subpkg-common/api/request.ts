/**
 * uni-app 网络请求封装
 * 自动注入 token、品牌上下文、处理 401 跳转
 */

const BASE_URL = 'http://localhost:3000/api/v1';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  showLoading?: boolean;
}

function request<T = any>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('accessToken');
  const brandId = uni.getStorageSync('currentBrandId');

  return new Promise((resolve, reject) => {
    if (options.showLoading !== false) {
      uni.showLoading({ title: '加载中...', mask: true });
    }

    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(brandId ? { 'X-Brand-Id': brandId } : {}),
        ...options.header,
      },
      success: (res: any) => {
        if (res.statusCode === 401) {
          uni.removeStorageSync('accessToken');
          uni.reLaunch({ url: '/pages/auth/login' });
          reject(new Error('Unauthorized'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          uni.showToast({ title: res.data?.message || '请求失败', icon: 'none' });
          reject(new Error(res.data?.message || 'Request failed'));
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      },
      complete: () => {
        if (options.showLoading !== false) {
          uni.hideLoading();
        }
      },
    });
  });
}

export const api = {
  get: <T = any>(url: string, data?: any) => request<T>({ url, method: 'GET', data }),
  post: <T = any>(url: string, data?: any) => request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) => request<T>({ url, method: 'PUT', data }),
  del: <T = any>(url: string) => request<T>({ url, method: 'DELETE' }),
};

export default api;
