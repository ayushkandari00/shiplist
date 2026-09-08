import axios from 'axios';

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '', withCredentials: true, headers: { 'Content-Type': 'application/json' } });
const unwrap = (response) => response.data?.data ?? response.data;
export const apiErrorMessage = (error) => error.response?.data?.message || error.response?.data?.error || 'Something went wrong. Please try again.';

client.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  if (error.response?.status === 401 && !request?._retry && !request?.url?.includes('/auth/refresh')) {
    request._retry = true;
    try { await client.post('/auth/refresh'); return client(request); } catch { /* Auth state is refreshed by AuthProvider. */ }
  }
  return Promise.reject(error);
});

export const authApi = {
  signup: async (payload) => unwrap(await client.post('/auth/signup', payload)), login: async (payload) => unwrap(await client.post('/auth/login', payload)), logout: async () => unwrap(await client.post('/auth/logout')),
  me: async () => unwrap(await client.get('/auth/me')), verifyEmail: async (token) => unwrap(await client.get('/auth/verify-email', { params: { token } })), forgotPassword: async (payload) => unwrap(await client.post('/auth/forgot-password', payload)), resetPassword: async (payload) => unwrap(await client.post('/auth/reset-password', payload)),
};
export const postsApi = {
  list: async (params) => unwrap(await client.get('/api/posts', { params })), get: async (id) => unwrap(await client.get(`/api/posts/${id}`)), create: async (payload) => unwrap(await client.post('/api/posts', payload)), update: async (id, payload) => unwrap(await client.patch(`/api/posts/${id}`, payload)), remove: async (id) => unwrap(await client.delete(`/api/posts/${id}`)),
  vote: async (id, hasVoted) => unwrap(hasVoted ? await client.delete(`/api/posts/${id}/vote`) : await client.post(`/api/posts/${id}/vote`)),
};
export const commentsApi = { list: async (postId) => unwrap(await client.get(`/api/posts/${postId}/comments`)), create: async (postId, payload) => unwrap(await client.post(`/api/posts/${postId}/comments`, payload)), update: async (id, payload) => unwrap(await client.patch(`/api/comments/${id}`, payload)), remove: async (id) => unwrap(await client.delete(`/api/comments/${id}`)) };
export const adminApi = { updateStatus: async (id, status) => unwrap(await client.patch(`/api/admin/posts/${id}/status`, { status })) };
export { client };
