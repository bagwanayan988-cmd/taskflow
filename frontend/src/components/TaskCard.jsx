import { useState } from 'react';
import { getErrorMessage } from '../api/apiError';
import { DESCRIPTION_MAX_LENGTH, TASK_STATUSES, TITLE_MAX_LENGTH } from '../constants/taskStatus';
import { formatRelativeTime } from '../utils/formatDate';

export default function TaskCard({ task, onUpdate, onDelete }) {
  // 'view' | 'edit' | 'confirm-delete'
  const [mode, setMode] = useState('view');
  const [draft, setDraft] = useState({ title: task.title, description: task.description ?? '' });
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  /** Runs an API action with busy/error handling; resolves to true on success. */
  async function run(action) {
    setIsBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  function handleStatusChange(event) {
    const status = event.target.value;
    run(() => onUpdate(task.id, { title: task.title, description: task.description, status }));
  }

  function startEditing() {
    setDraft({ title: task.title, description: task.description ?? '' });
    setError('');
    setMode('edit');
  }

  /** Leaves edit/confirm mode; any error belonged to the abandoned action, so it goes too. */
  function backToView() {
    setError('');
    setMode('view');
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }
    const saved = await run(() =>
      onUpdate(task.id, {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        status: task.status,
      }),
    );
    if (saved) setMode('view');
  }

  function handleEditKeyDown(event) {
    if (event.key === 'Escape') backToView();
  }

  if (mode === 'edit') {
    return (
      <form className="task-card is-editing" onSubmit={handleSave} onKeyDown={handleEditKeyDown}>
        <label className="sr-only" htmlFor={`task-${task.id}-title`}>
          Title
        </label>
        <input
          id={`task-${task.id}-title`}
          className="input input-sm"
          value={draft.title}
          maxLength={TITLE_MAX_LENGTH}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          autoFocus
        />
        <label className="sr-only" htmlFor={`task-${task.id}-description`}>
          Description
        </label>
        <textarea
          id={`task-${task.id}-description`}
          className="input input-sm"
          rows={3}
          placeholder="Description (optional)"
          value={draft.description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="task-card-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={backToView} disabled={isBusy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={isBusy}>
            {isBusy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className={`task-card${isBusy ? ' is-busy' : ''}`} aria-busy={isBusy}>
      <h3 className="task-card-title">{task.title}</h3>
      {task.description && <p className="task-card-description">{task.description}</p>}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      {mode === 'confirm-delete' ? (
        <div className="task-card-confirm" role="group" aria-label="Confirm delete">
          <span>Delete this task?</span>
          <div className="task-card-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={backToView} disabled={isBusy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => run(() => onDelete(task.id))}
              disabled={isBusy}
            >
              {isBusy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="task-card-footer">
          <label className="sr-only" htmlFor={`task-${task.id}-status`}>
            Status
          </label>
          <select
            id={`task-${task.id}-status`}
            className={`status-select status-${task.status.toLowerCase()}`}
            value={task.status}
            onChange={handleStatusChange}
            disabled={isBusy}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <time className="task-card-time" dateTime={task.updatedAt} title={new Date(task.updatedAt).toLocaleString()}>
            {formatRelativeTime(task.updatedAt)}
          </time>
          {isBusy && <span className="spinner task-card-spinner" role="status" aria-label="Saving" />}
          <div className="task-card-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={startEditing} disabled={isBusy}>
              Edit
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-ghost-danger"
              onClick={() => setMode('confirm-delete')}
              disabled={isBusy}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
