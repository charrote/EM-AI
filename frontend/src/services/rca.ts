import api from './api';

export const rcaApi = {
  list: () =>
    api.get('/rca'),
  
  create: (data: any) =>
    api.post('/rca', data),
  
  update: (id: string, data: any) =>
    api.put(`/rca/${id}`, data),
};