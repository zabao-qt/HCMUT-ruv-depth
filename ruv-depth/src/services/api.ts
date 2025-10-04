// src/services/api.ts
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// attach token if present (fixed)
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (!cfg.headers) cfg.headers = new axios.AxiosHeaders();
  if (token) {
    // Put Authorization header into plain object
    (cfg.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return cfg;
});

export const authSignup = (email: string, password: string) => api.post('/auth/signup', { email, password });
export const authLogin = (email: string, password: string) => api.post('/auth/login', { email, password });
export const authMe = () => api.get('/auth/me');
export const sendOtp = (email: string, purpose = 'email_verification', name?: string) => api.post('/auth/send-otp', { email, purpose, name });
export const verifyOtp = (email: string, code: string, purpose = 'email_verification') => api.post('/auth/verify-otp', { email, code, purpose });
export const resendOtp = (email: string, purpose = 'email_verification') => api.post('/auth/resend-otp', { email, purpose });

export const createProfile = (title:string, description?:string) => api.post('/profiles', { title, description });
export const listProfiles = () => api.get('/profiles');
export const deleteProfile = (id:string) => api.delete(`/profiles/${id}`);
export const appendPoint = (profileId:string, point:any) => api.post(`/profiles/${profileId}/points`, point);
export const deletePoints = (profileId:string, pointId:string) => api.delete(`/profiles/${profileId}/points/${pointId}`);
export const getPoints = (profileId:string, limit=200) => api.get(`/profiles/${profileId}/points?limit=${limit}`);

export const registerDevice = (name: string, feeds?: Record<string,string>) => api.post('/devices', { name, feeds });
export const listDevices = () => api.get('/devices');
export const getDeviceLast = (token: string) => api.get(`/devices/${token}/last`);
export const patchDeviceFeeds = (token: string, feeds: Record<string,string>) => api.patch(`/devices/${token}`, { feeds });
