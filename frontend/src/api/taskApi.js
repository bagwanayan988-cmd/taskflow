import axiosClient from './axiosClient';

export async function fetchTasks() {
  const { data } = await axiosClient.get('/api/tasks');
  return data;
}

export async function createTask({ title, description, status }) {
  const { data } = await axiosClient.post('/api/tasks', { title, description, status });
  return data;
}

/** PUT replaces title and description, so callers must always send the full task, not just changed fields. */
export async function updateTask(id, { title, description, status }) {
  const { data } = await axiosClient.put(`/api/tasks/${id}`, { title, description, status });
  return data;
}

export async function deleteTask(id) {
  await axiosClient.delete(`/api/tasks/${id}`);
}
