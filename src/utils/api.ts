// Centralized API Base URL configuration for local dev and production Netlify deployment
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
};

export const getSocketUrl = (): string => {
  return API_BASE || window.location.origin;
};
