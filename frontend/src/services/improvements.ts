import api from './api';

export const improvementApi = {
  list: () =>
    api.get('/improvements'),
  
  opportunities: () =>
    api.get('/improvements/opportunities'),
  
  create: (data: any) =>
    api.post('/improvements', data),
  
  update: (id: string, data: any) =>
    api.put(`/improvements/${id}`, data),
};