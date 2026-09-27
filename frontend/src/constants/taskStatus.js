/** Mirrors task-service's TaskStatus enum; order defines the board's column order. */
export const TASK_STATUSES = [
  { value: 'TODO', label: 'To Do', tone: 'todo' },
  { value: 'IN_PROGRESS', label: 'In Progress', tone: 'progress' },
  { value: 'COMPLETED', label: 'Completed', tone: 'done' },
];

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
