import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// Every request goes through the API gateway; the frontend never talks to a backend service directly.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  // Raised in deployments where idle services sleep and need time to wake up (e.g. Render's free tier).
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000),
});

let unauthorizedHandler = null;

/** Lets the auth context react to an expired/invalid session (drop the user) without a full page reload. */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from any protected endpoint means the session is gone: the token expired, was tampered with,
    // or was removed from storage. A 401 from /api/auth/* is just "wrong password" and is handled by the
    // login form instead.
    const isAuthEndpoint = error.config?.url?.startsWith('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      tokenStorage.clear();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      } else {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
