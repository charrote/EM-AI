import api from './api';

export const deviceApi = {
  list: (params?: Record<string, any>) =>
    api.get('/devices', { params }),
  
  detail: (id: string) =>
    api.get(`/devices/${id}`),
  
  workOrders: (id: string, days: number = 30) =>
    api.get(`/devices/${id}/work-orders?days=${days}`),
  
  manage: {
    list: (params?: Record<string, any>) =>
      api.get('/devices/manage', { params }),
    create: (data: any) =>
      api.post('/devices/manage', data),
    update: (id: string, data: any) =>
      api.put(`/devices/manage/${id}`, data),
    delete: (id: string) =>
      api.delete(`/devices/manage/${id}`),
  },
  
  types: {
    list: () =>
      api.get('/devices/manage/types'),
    create: (data: any) =>
      api.post('/devices/manage/types', data),
    update: (id: string, data: any) =>
      api.put(`/devices/manage/types/${id}`, data),
    delete: (id: string) =>
      api.delete(`/devices/manage/types/${id}`),
    addDocument: (id: string, data: any) =>
      api.put(`/devices/manage/types/${id}`, { documents: data }),
  },
};