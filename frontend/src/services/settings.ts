import api from './api';

export const settingsApi = {
  dataMode: {
    get: () =>
      api.get('/settings/dataMode'),
    update: (mode: 'mock' | 'real') =>
      api.put('/settings/dataMode', { mode }),
  },
  
  ai: {
    get: () =>
      api.get('/settings/ai'),
    update: (data: any) =>
      api.put('/settings/ai', data),
  },
};