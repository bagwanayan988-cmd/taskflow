import { useEffect, useState } from 'react';
import { onServersWakingChange } from '../api/axiosClient';

/** Explains the pause while sleeping backend services boot (only ever shown where retries are enabled). */
export default function ServerWakeBanner() {
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => onServersWakingChange(setIsWaking), []);

  if (!isWaking) return null;
  return (
    <div className="wake-banner" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>
        <strong>Waking up the servers…</strong> This demo runs on free hosting that pauses when idle, so the
        first request can take up to a minute.
      </span>
    </div>
  );
}
