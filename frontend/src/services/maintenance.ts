import api from './api';

export const maintenanceApi = {
  plans: (params?: Record<string, any>) =>
    api.get('/maintenance/plans', { params }),
  
  records: (params?: Record<string, any>) =>
    api.get('/maintenance/records', { params }),
  
  createRecord: (data: any) =>
    api.post('/maintenance/records', data),
};