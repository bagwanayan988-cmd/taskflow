import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// Every request goes through the API gateway; the frontend never talks to a backend service directly.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000),
});

// ---------------------------------------------------------------------------------------------
// Cold starts. On hosts that put idle services to sleep (e.g. Render's free tier) the first requests
// fail with 502/503/504 or no response while a service boots. Within this window, requests that are
// safe to repeat are retried automatically. 0 (the local default) disables retries entirely.
const WAKE_RETRY_WINDOW_MS = Number(import.meta.env.VITE_WAKE_RETRY_WINDOW_MS ?? 0);
const WAKE_RETRY_DELAY_MS = 4000;
const WAKING_STATUSES = new Set([502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['get', 'put', 'delete']);

let wakingRequests = 0;
const wakingListeners = new Set();

/** Subscribes to "servers are waking up" changes; returns an unsubscribe function. */
export function onServersWakingChange(listener) {
  wakingListeners.add(listener);
  return () => wakingListeners.delete(listener);
}

function changeWakingCount(delta) {
  wakingRequests += delta;
  wakingListeners.forEach((listener) => listener(wakingRequests > 0));
}

function finishWaking(config) {
  if (config?.wakingUp) {
    config.wakingUp = false;
    changeWakingCount(-1);
  }
}

function shouldRetryWhileWaking(error) {
  const { config } = error;
  if (!config || WAKE_RETRY_WINDOW_MS <= 0) return false;
  const serverIsWaking = !error.response || WAKING_STATUSES.has(error.response.status);
  // Creating a task or an account must not be sent twice; logging in has no side effects.
  const safeToRepeat = IDEMPOTENT_METHODS.has(config.method) || config.url === '/api/auth/login';
  config.firstAttemptAt ??= Date.now();
  return serverIsWaking && safeToRepeat && Date.now() - config.firstAttemptAt < WAKE_RETRY_WINDOW_MS;
}

// ---------------------------------------------------------------------------------------------
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
  (response) => {
    finishWaking(response.config);
    return response;
  },
  async (error) => {
    if (shouldRetryWhileWaking(error)) {
      if (!error.config.wakingUp) {
        error.config.wakingUp = true;
        changeWakingCount(1);
      }
      await new Promise((resolve) => setTimeout(resolve, WAKE_RETRY_DELAY_MS));
      return axiosClient(error.config);
    }
    finishWaking(error.config);

    // A 401 from any protected endpoint means the session is gone: the token expired, was tampered with,
    // or was removed from storage. A 401 from /api/auth/* is just "wrong password" and is handled by the
    // login form instead. Requests marked skipSessionCheck (the wake-up ping) never end the session.
    const isAuthEndpoint = error.config?.url?.startsWith('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint && !error.config?.skipSessionCheck) {
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
