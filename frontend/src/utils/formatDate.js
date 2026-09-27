const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const UNITS = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

/** "just now", "5 minutes ago", "yesterday", … */
export function formatRelativeTime(isoDate) {
  const secondsAgo = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);
  for (const { unit, seconds } of UNITS) {
    if (secondsAgo >= seconds) {
      return relativeFormatter.format(-Math.floor(secondsAgo / seconds), unit);
    }
  }
  return 'just now';
}
