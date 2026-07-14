import api from './api';

export const workOrderApi = {
  list: (params?: Record<string, any>) =>
    api.get('/work-orders', { params }),
  
  detail: (id: string) =>
    api.get(`/work-orders/${id}`),
  
  create: (data: any) =>
    api.post('/work-orders', data),
  
  updateStatus: (id: string, status: string) =>
    api.put(`/work-orders/${id}/status`, { status }),
  
  complete: (id: string, data: any) =>
    api.post(`/work-orders/${id}/complete`, data),
  
  aiDiagnosis: (id: string) =>
    api.get(`/work-orders/${id}/ai-diagnosis`),
};