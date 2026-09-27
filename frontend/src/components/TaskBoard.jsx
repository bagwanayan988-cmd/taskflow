import { TASK_STATUSES } from '../constants/taskStatus';
import TaskCard from './TaskCard';

export default function TaskBoard({ tasks, onUpdate, onDelete }) {
  return (
    <div className="board">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status.value);
        const headingId = `column-${status.tone}-heading`;
        return (
          <section key={status.value} className={`column column-${status.tone}`} aria-labelledby={headingId}>
            <header className="column-header">
              <span className="column-dot" aria-hidden="true" />
              <h2 id={headingId}>{status.label}</h2>
              <span className="column-count" aria-label={`${columnTasks.length} tasks`}>
                {columnTasks.length}
              </span>
            </header>
            <div className="column-body">
              {columnTasks.length === 0 ? (
                <p className="column-empty">Nothing here yet</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Placeholder columns shown while tasks are loading. */
export function TaskBoardSkeleton() {
  return (
    <div className="board" role="status" aria-label="Loading tasks">
      {TASK_STATUSES.map((status) => (
        <section key={status.value} className={`column column-${status.tone}`} aria-hidden="true">
          <header className="column-header">
            <span className="column-dot" />
            <h2>{status.label}</h2>
          </header>
          <div className="column-body">
            <div className="skeleton-card" />
            <div className="skeleton-card skeleton-card-short" />
          </div>
        </section>
      ))}
    </div>
  );
}
