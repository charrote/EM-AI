import api from './api';

export const knowledgeApi = {
  list: (params?: Record<string, any>) =>
    api.get('/knowledge', { params }),
  
  stats: () =>
    api.get('/knowledge/stats'),
  
  equipmentTypes: () =>
    api.get('/knowledge/equipment-types'),
  
  detail: (id: string) =>
    api.get(`/knowledge/${id}`),
  
  create: (data: any) =>
    api.post('/knowledge', data),
  
  delete: (id: string) =>
    api.delete(`/knowledge/${id}`),
  
  favorite: (id: string) =>
    api.post(`/knowledge/${id}/favorite`),
  
  favorites: () =>
    api.get('/knowledge/favorites'),
  
  approve: (id: string, data: any) =>
    api.post(`/knowledge/${id}/approve`, data),
};