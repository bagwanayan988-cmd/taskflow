import { useState } from 'react';
import { getErrorMessage, getFieldErrors } from '../api/apiError';
import { DESCRIPTION_MAX_LENGTH, TASK_STATUSES, TITLE_MAX_LENGTH } from '../constants/taskStatus';

const EMPTY_TASK = { title: '', description: '', status: 'TODO' };

/** {@code titleRef} is owned by the page so other UI (the empty state) can focus the title field. */
export default function TaskForm({ onCreate, titleRef }) {
  const [form, setForm] = useState(EMPTY_TASK);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: 'Give your task a title.' });
      titleRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await onCreate({
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
      });
      setForm(EMPTY_TASK);
      titleRef.current?.focus();
    } catch (error) {
      // Field-level problems are shown under each input; the banner is only for everything else.
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      setFormError(
        Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error, 'Could not create the task. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="task-form card" onSubmit={handleSubmit} noValidate aria-labelledby="task-form-heading">
      <h2 id="task-form-heading" className="task-form-heading">
        Add a task
      </h2>

      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="task-form-grid">
        <div className="field task-form-title">
          <label htmlFor="new-task-title">Title</label>
          <input
            ref={titleRef}
            id="new-task-title"
            name="title"
            className={`input${errors.title ? ' has-error' : ''}`}
            placeholder="What needs to be done?"
            maxLength={TITLE_MAX_LENGTH}
            value={form.title}
            onChange={handleChange}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'new-task-title-error' : undefined}
          />
          {errors.title && (
            <p id="new-task-title-error" className="field-error">
              {errors.title}
            </p>
          )}
        </div>

        <div className="field task-form-status">
          <label htmlFor="new-task-status">Status</label>
          <select
            id="new-task-status"
            name="status"
            className="input"
            value={form.status}
            onChange={handleChange}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field task-form-description">
          <label htmlFor="new-task-description">
            Description <span className="label-optional">optional</span>
          </label>
          <textarea
            id="new-task-description"
            name="description"
            className={`input${errors.description ? ' has-error' : ''}`}
            placeholder="Add details, links or acceptance criteria"
            rows={2}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={form.description}
            onChange={handleChange}
          />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>

        <button type="submit" className="btn btn-primary task-form-submit" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner" aria-hidden="true" />}
          {isSubmitting ? 'Adding…' : 'Add task'}
        </button>
      </div>
    </form>
  );
}
