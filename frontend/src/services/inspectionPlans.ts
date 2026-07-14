import api from './api';

export const inspectionPlanApi = {
  list: () =>
    api.get('/inspection-plans'),
  
  create: (data: any) =>
    api.post('/inspection-plans', data),
  
  update: (id: string, data: any) =>
    api.put(`/inspection-plans/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/inspection-plans/${id}`),
};