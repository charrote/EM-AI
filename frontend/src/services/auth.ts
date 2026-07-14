import api from './api';

export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
};