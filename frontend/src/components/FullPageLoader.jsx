export default function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="full-page-loader" role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
