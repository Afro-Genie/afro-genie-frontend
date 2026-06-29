import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('afrogenie.accessToken');
  if (t) {
    cfg.headers.Authorization = 'Bearer ' + JSON.parse(t);
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (err?.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const rt = localStorage.getItem('afrogenie.refreshToken');
      if (rt) {
        const res = await axios.post('/api/auth/refresh', { refreshToken: JSON.parse(rt) });
        localStorage.setItem('afrogenie.accessToken', JSON.stringify(res.data.accessToken));
        localStorage.setItem('afrogenie.refreshToken', JSON.stringify(res.data.refreshToken));
        original.headers.Authorization = 'Bearer ' + res.data.accessToken;
        return api(original);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
