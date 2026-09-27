export default function Logo({ inverted = false }) {
  return (
    <span className={`logo${inverted ? ' logo-inverted' : ''}`}>
      <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <rect x="7" y="9" width="5" height="14" rx="2" fill="var(--logo-cut)" opacity="0.55" />
        <rect x="13.5" y="9" width="5" height="10" rx="2" fill="var(--logo-cut)" opacity="0.8" />
        <rect x="20" y="9" width="5" height="6" rx="2" fill="var(--logo-cut)" />
      </svg>
      <span className="logo-word">TaskFlow</span>
    </span>
  );
}
