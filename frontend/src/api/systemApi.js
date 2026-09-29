import axiosClient from './axiosClient';

// Only deployments whose services sleep when idle enable wake-up retries (see axiosClient); locally this is a no-op.
const SERVICES_MAY_SLEEP = Number(import.meta.env.VITE_WAKE_RETRY_WINDOW_MS ?? 0) > 0;

/**
 * Sends a cheap request through the gateway to each backend service so that sleeping services all start
 * booting in parallel as soon as the page opens, rather than one by one on first use. Any HTTP answer
 * (a 404 or 401 here) means the service is awake, so errors are ignored.
 */
export function wakeUpServices() {
  if (!SERVICES_MAY_SLEEP) return;
  const ignore = () => {};
  axiosClient.get('/api/users/0').catch(ignore); // user-service
  axiosClient.get('/api/tasks', { skipSessionCheck: true }).catch(ignore); // task-service
}
