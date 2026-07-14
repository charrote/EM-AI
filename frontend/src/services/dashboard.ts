import api from './api';

export const dashboardApi = {
  andon: () =>
    api.get('/dashboard/andon'),
};