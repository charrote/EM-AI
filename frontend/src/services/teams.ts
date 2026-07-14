import api from './api';

export const teamApi = {
  list: (params?: Record<string, any>) =>
    api.get('/teams', { params }),
  
  create: (data: any) =>
    api.post('/teams', data),
  
  update: (id: string, data: any) =>
    api.put(`/teams/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/teams/${id}`),
};