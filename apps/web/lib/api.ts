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

export interface RefreshSessionResult {
  accessToken: string;
  refreshToken?: string;
  user?: any;
}

let activeRefreshPromise: Promise<RefreshSessionResult | null> | null = null;

/**
 * Thread-safe / Deduplicated session refresh function.
 * Ensures that even if 10 requests trigger a refresh concurrently,
 * exactly ONE network call to /api/v1/auth/refresh is made.
 */
export const refreshSession = async (): Promise<RefreshSessionResult | null> => {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const storedRefreshToken = getStoredRefreshToken();
      const { data } = await axios.post(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refreshToken: storedRefreshToken || undefined },
        { withCredentials: true, timeout: 12000 }
      );

      if (data?.success && data?.accessToken) {
        const newAccessToken = data.accessToken;
        setAuthToken(newAccessToken);
        if (data.refreshToken) {
          setStoredRefreshToken(data.refreshToken);
        }
        return {
          accessToken: newAccessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        };
      }
      return null;
    } catch (err: any) {
      // Only clear credentials if the refresh genuinely returned an unauthorized response (401/403).
      // Never wipe credentials on network drops, aborts, or server cold-starts!
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setStoredRefreshToken(null);
        setAuthToken(null);
      }
      throw err;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
};

// Request interceptor: wait for any active refresh before sending new requests
api.interceptors.request.use(async (config) => {
  if (
    activeRefreshPromise &&
    !config.url?.includes('/auth/login') &&
    !config.url?.includes('/auth/refresh')
  ) {
    try {
      await activeRefreshPromise;
    } catch {
      // If refresh fails, let the request proceed to fail with 401 naturally
    }
  }

  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: silent single-flight token refresh on 401
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

      try {
        const refreshResult = await refreshSession();
        if (refreshResult?.accessToken) {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
