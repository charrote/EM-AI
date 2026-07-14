import api from './api';

export const organizationApi = {
  tree: () =>
    api.get('/organizations/tree'),
  
  list: () =>
    api.get('/organizations'),
  
  create: (data: any) =>
    api.post('/organizations', data),
  
  update: (id: string, data: any) =>
    api.put(`/organizations/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/organizations/${id}`),
};