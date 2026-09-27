import Logo from './Logo';

const PREVIEW_COLUMNS = [
  { key: 'todo', label: 'To Do', cards: [72, 54, 64] },
  { key: 'progress', label: 'In Progress', cards: [60, 80] },
  { key: 'done', label: 'Completed', cards: [68] },
];

/** Decorative mini board shown beside the auth forms. */
function BoardPreview() {
  return (
    <div className="board-preview" aria-hidden="true">
      {PREVIEW_COLUMNS.map((column) => (
        <div key={column.key} className={`preview-column preview-${column.key}`}>
          <span className="preview-label">{column.label}</span>
          {column.cards.map((width, index) => (
            <span key={index} className="preview-card">
              <span className="preview-line" style={{ width: `${width}%` }} />
              <span className="preview-line preview-line-short" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Logo inverted />
        <div className="auth-pitch">
          <h2>Plan it. Move it. Ship it.</h2>
          <p>Organise your work on a simple board and track every task from idea to done.</p>
        </div>
        <BoardPreview />
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo />
          </div>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
