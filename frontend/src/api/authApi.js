import axiosClient from './axiosClient';

export async function registerUser({ name, email, password }) {
  const { data } = await axiosClient.post('/api/auth/register', { name, email, password });
  return data;
}

/** Resolves to { token, user }. */
export async function loginUser({ email, password }) {
  const { data } = await axiosClient.post('/api/auth/login', { email, password });
  return data;
}
