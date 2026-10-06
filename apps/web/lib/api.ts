import axios, { AxiosRequestConfig } from 'axios';

const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://shenoda-api.onrender.com'
    : 'http://localhost:5000';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000, // 15-second timeout prevents indefinite UI hangs
  headers: {
    'Content-Type': 'application/json',
  },
});

let inMemoryToken: string | null = null;

export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredRefreshToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota or access errors
  }
};

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => inMemoryToken;

// Attach Bearer token to all outgoing requests if available
api.interceptors.request.use((config) => {
  if (inMemoryToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// Automatic silent token refresh on 401 responses with deduped promise
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const storedRefreshToken = getStoredRefreshToken();
        const { data } = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken: storedRefreshToken || undefined },
          { withCredentials: true, timeout: 10000 }
        );

        const newAccessToken = data.accessToken || null;
        if (data.refreshToken) {
          setStoredRefreshToken(data.refreshToken);
        }
        setAuthToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers && newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        setStoredRefreshToken(null);
        processQueue(refreshError, null);
        setAuthToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
