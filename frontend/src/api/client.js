import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
});

// Attach the stored Sanctum token to every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('netops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized 401 handling — token expired/revoked, force back to login.
// We avoid an import cycle with the auth context by dispatching a custom
// event the AuthProvider listens for, rather than importing it directly.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('netops_token');
      window.dispatchEvent(new CustomEvent('netops:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** Extracts a human-readable message from a Laravel validation/error response. */
export function apiErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (data.message) return data.message;
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    return Array.isArray(first) ? first[0] : String(first);
  }
  return fallback;
}
