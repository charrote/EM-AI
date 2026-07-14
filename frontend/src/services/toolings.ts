import api from './api';

export const toolingApi = {
  list: (params?: Record<string, any>) =>
    api.get('/toolings', { params }),
  
  byDevice: (deviceId: string) =>
    api.get(`/toolings/by-device/${deviceId}`),
  
  create: (data: any) =>
    api.post('/toolings', data),
  
  update: (id: string, data: any) =>
    api.put(`/toolings/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/toolings/${id}`),
  
  updateStatus: (id: string, data: any) =>
    api.put(`/toolings/${id}/status`, data),
  
  mount: {
    batch: (data: any) =>
      api.post('/toolings/batch-mount', data),
    single: (id: string) =>
      api.put(`/toolings/${id}/mount`),
  },
  
  dismount: {
    batch: (data: any) =>
      api.post('/toolings/batch-dismount', data),
    single: (id: string) =>
      api.put(`/toolings/${id}/dismount`),
  },
};