import api from './api';

export const inspectionApi = {
  create: (data: any) =>
    api.post('/inspections', data),
};