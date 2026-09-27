import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/apiError';
import { createTask, deleteTask, fetchTasks, updateTask } from '../api/taskApi';
import Navbar from '../components/Navbar';
import TaskBoard, { TaskBoardSkeleton } from '../components/TaskBoard';
import TaskForm from '../components/TaskForm';
import { useAuth } from '../hooks/useAuth';
import '../styles/dashboard.css';

function EmptyState({ onStart }) {
  return (
    <div className="empty-state card">
      <svg className="empty-state-art" viewBox="0 0 120 80" aria-hidden="true">
        <rect x="4" y="10" width="34" height="62" rx="8" className="art-col" />
        <rect x="43" y="10" width="34" height="62" rx="8" className="art-col" />
        <rect x="82" y="10" width="34" height="62" rx="8" className="art-col" />
        <rect x="10" y="20" width="22" height="12" rx="4" className="art-card" />
      </svg>
      <h2>No tasks yet</h2>
      <p>Your board is empty. Add your first task and it will show up in the To Do column, ready to move along as you work.</p>
      <button type="button" className="btn btn-primary" onClick={onStart}>
        Create your first task
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const titleInputRef = useRef(null);

  useEffect(() => {
    // Ignore a response that arrives after unmount or after a newer request was started.
    let ignore = false;
    fetchTasks()
      .then((data) => {
        if (ignore) return;
        setTasks(data);
        setLoadState('ready');
      })
      .catch((error) => {
        if (ignore) return;
        setLoadError(getErrorMessage(error, 'Could not load your tasks.'));
        setLoadState('error');
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  function handleRetry() {
    setLoadState('loading');
    setReloadKey((key) => key + 1);
  }

  // Handlers update local state from the server's response; errors propagate to the calling form/card.
  const handleCreate = useCallback(async (payload) => {
    const created = await createTask(payload);
    setTasks((current) => [created, ...current]);
  }, []);

  const handleUpdate = useCallback(async (id, payload) => {
    const updated = await updateTask(id, payload);
    setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteTask(id);
    } catch (error) {
      // Already deleted (e.g. in another tab): the goal is achieved, so just drop the card.
      if (error.response?.status !== 404) throw error;
    }
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  function focusNewTaskTitle() {
    titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    titleInputRef.current?.focus({ preventScroll: true });
  }

  const firstName = user.name.split(' ')[0];
  const inProgressCount = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((task) => task.status === 'COMPLETED').length;

  let content;
  if (loadState === 'loading') {
    content = <TaskBoardSkeleton />;
  } else if (loadState === 'error') {
    content = (
      <div className="load-error card" role="alert">
        <p>{loadError}</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleRetry}>
          Try again
        </button>
      </div>
    );
  } else if (tasks.length === 0) {
    content = <EmptyState onStart={focusNewTaskTitle} />;
  } else {
    content = <TaskBoard tasks={tasks} onUpdate={handleUpdate} onDelete={handleDelete} />;
  }

  return (
    <div className="dashboard">
      <Navbar />
      <main className="dash-main">
        <div className="dash-header">
          <div>
            <p className="dash-eyebrow">Hi, {firstName}</p>
            <h1>Your board</h1>
          </div>
          {loadState === 'ready' && tasks.length > 0 && (
            <dl className="dash-stats">
              <div>
                <dt>Total</dt>
                <dd>{tasks.length}</dd>
              </div>
              <div>
                <dt>In progress</dt>
                <dd>{inProgressCount}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{completedCount}</dd>
              </div>
            </dl>
          )}
        </div>

        <TaskForm onCreate={handleCreate} titleRef={titleInputRef} />
        {content}
      </main>
    </div>
  );
}
