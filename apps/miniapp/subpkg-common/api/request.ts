/**
 * uni-app 网络请求封装
 * 自动注入 token、品牌上下文、处理 401 跳转
 * 离线缓存：GET 请求缓存 5 分钟，网络失败时返回缓存数据
 */

const BASE_URL = 'http://localhost:3000/api/v1';

const CACHE_PREFIX = 'api_cache_';
const DEFAULT_CACHE_MS = 5 * 60 * 1000; // 5 minutes for product/sku data

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
  showLoading?: boolean;
  /** Skip cache for this request (force network) */
  skipCache?: boolean;
  /** Custom cache duration in ms */
  cacheMs?: number;
}

/** Get cache key from URL */
function cacheKey(url: string): string {
  return CACHE_PREFIX + url.replace(/\//g, '_').replace(/[?&=]/g, ':');
}

/** Try to read stale data from cache */
function getCache<T = any>(url: string): { data: T; cachedAt: number } | null {
  try {
    const raw = uni.getStorageSync(cacheKey(url));
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; cachedAt: number };
  } catch {
    return null;
  }
}

/** Write data to cache */
function setCache<T = any>(url: string, data: T): void {
  try {
    uni.setStorageSync(
      cacheKey(url),
      JSON.stringify({ data, cachedAt: Date.now() }),
    );
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/** Check if cached entry is still fresh */
function isCacheFresh(entry: { cachedAt: number }, maxAgeMs: number): boolean {
  return Date.now() - entry.cachedAt < maxAgeMs;
}

/** Retry a request up to maxRetries times with delay between attempts */
async function retryRequest<T = any>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

function request<T = any>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('accessToken');
  const brandId = uni.getStorageSync('currentBrandId');
  const method = options.method || 'GET';
  const isGet = method === 'GET';
  const cacheDuration = options.cacheMs || DEFAULT_CACHE_MS;

  // Check cache for GET requests (unless skipCache)
  if (isGet && !options.skipCache) {
    const cached = getCache<T>(options.url);
    if (cached && isCacheFresh(cached, cacheDuration)) {
      return Promise.resolve(cached.data);
    }
  }

  return new Promise((resolve, reject) => {
    if (options.showLoading !== false) {
      uni.showLoading({ title: '加载中...', mask: true });
    }

    const makeRequest = (): Promise<any> =>
      new Promise((res, rej) => {
        uni.request({
          url: BASE_URL + options.url,
          method,
          data: options.data,
          header: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(brandId ? { 'X-Brand-Id': brandId } : {}),
            ...options.header,
          },
          success: (uniRes: any) => {
            if (uniRes.statusCode === 401) {
              uni.removeStorageSync('accessToken');
              uni.reLaunch({ url: '/pages/auth/login' });
              rej(new Error('Unauthorized'));
              return;
            }
            if (uniRes.statusCode >= 200 && uniRes.statusCode < 300) {
              res(uniRes.data);
            } else {
              rej(new Error(uniRes.data?.message || 'Request failed'));
            }
          },
          fail: (err) => {
            rej(err);
          },
        });
      });

    retryRequest(makeRequest, 3, 1000)
      .then((data: any) => {
        // Cache successful GET responses
        if (isGet) {
          setCache(options.url, data as T);
        }
        resolve(data as T);
      })
      .catch((err) => {
        // On network error, try to return stale cache
        if (isGet) {
          const stale = getCache<T>(options.url);
          if (stale) {
            uni.showToast({ title: '使用缓存数据', icon: 'none', duration: 2000 });
            resolve(stale.data);
            return;
          }
        }
        uni.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      })
      .finally(() => {
        if (options.showLoading !== false) {
          uni.hideLoading();
        }
      });
  });
}

export const api = {
  get: <T = any>(url: string, data?: any, opts?: { skipCache?: boolean; cacheMs?: number }) =>
    request<T>({ url, method: 'GET', data, skipCache: opts?.skipCache, cacheMs: opts?.cacheMs }),
  post: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'PUT', data }),
  del: <T = any>(url: string) =>
    request<T>({ url, method: 'DELETE' }),
};

export default api;
