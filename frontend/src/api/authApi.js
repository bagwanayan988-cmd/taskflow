import axiosClient from './axiosClient';

export async function registerUser({ name, email, password }) {
  const { data } = await axiosClient.post('/api/auth/register', { name, email, password });
  return data;
}

/** Used to confirm the signed-in account still exists (demo deployments can reset their data). */
export async function fetchUser(id) {
  const { data } = await axiosClient.get(`/api/users/${id}`);
  return data;
}

/** Resolves to { token, user }. */
export async function loginUser({ email, password }) {
  const { data } = await axiosClient.post('/api/auth/login', { email, password });
  return data;
}
