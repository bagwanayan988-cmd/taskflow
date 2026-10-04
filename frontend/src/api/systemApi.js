import axiosClient, { onServersWakingChange } from './axiosClient';

// Only deployments whose services sleep when idle enable wake-up retries (see axiosClient); locally this is a no-op.
const SERVICES_MAY_SLEEP = Number(import.meta.env.VITE_WAKE_RETRY_WINDOW_MS ?? 0) > 0;

// Public base URLs of the backend services, pinged straight from the browser. On Render's free tier a
// sleeping service is only woken by traffic from the internet: the gateway's calls to it come from inside
// Render and are answered with 502 ("no-deploy") instead. The pings carry no data and need no CORS
// (mode: 'no-cors'); every real API call still goes through the gateway.
const DIRECT_WAKE_URLS = (import.meta.env.VITE_WAKE_URLS ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const MIN_PING_INTERVAL_MS = 60 * 1000;
// Services sleep after 15 idle minutes; pinging more often than that keeps them up while someone uses the app.
const KEEP_AWAKE_INTERVAL_MS = 5 * 60 * 1000;
const USER_IDLE_AFTER_MS = 15 * 60 * 1000;

let lastPingAt = 0;
let lastUserActivityAt = Date.now();

/**
 * Sends a cheap request to each backend service so that sleeping services all start booting in parallel,
 * rather than one by one on first use. Any HTTP answer means the service is awake, so errors are ignored.
 */
function wakeUpServices() {
  if (!SERVICES_MAY_SLEEP || Date.now() - lastPingAt < MIN_PING_INTERVAL_MS) return;
  lastPingAt = Date.now();
  const ignore = () => {};
  DIRECT_WAKE_URLS.forEach((url) => fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(ignore));
  axiosClient.get('/api/users/0').catch(ignore); // gateway, then user-service
  axiosClient.get('/api/tasks', { skipSessionCheck: true }).catch(ignore); // gateway, then task-service
}

/**
 * Wakes the services when the app opens, and keeps them awake while the page is visible and in use:
 * every few minutes, whenever the tab becomes visible again, and whenever requests start failing because
 * a service is asleep. Returns a cleanup function.
 */
export function keepServicesAwake() {
  if (!SERVICES_MAY_SLEEP) return () => {};

  const recordActivity = () => {
    lastUserActivityAt = Date.now();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') wakeUpServices();
  };
  const timer = setInterval(() => {
    const inUse = Date.now() - lastUserActivityAt < USER_IDLE_AFTER_MS;
    if (document.visibilityState === 'visible' && inUse) wakeUpServices();
  }, KEEP_AWAKE_INTERVAL_MS);
  const unsubscribe = onServersWakingChange((waking) => waking && wakeUpServices());

  window.addEventListener('pointerdown', recordActivity);
  window.addEventListener('keydown', recordActivity);
  document.addEventListener('visibilitychange', onVisibilityChange);
  wakeUpServices();

  return () => {
    clearInterval(timer);
    unsubscribe();
    window.removeEventListener('pointerdown', recordActivity);
    window.removeEventListener('keydown', recordActivity);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
