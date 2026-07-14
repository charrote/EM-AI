import api from './api';

export const calendarApi = {
  get: (year: number, month: number) =>
    api.get('/calendar', { params: { year, month } }),
  
  init: (data: { year: number; month: number }) =>
    api.post('/calendar/init', data),
  
  update: (id: number, data: any) =>
    api.put(`/calendar/${id}`, data),
};