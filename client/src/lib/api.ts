import axios from 'axios';

const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || '/api',
    withCredentials: true,
});

// Request Interceptor to add Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Optional: Handle token expiration/forced logout
            // localStorage.removeItem('auth_token');
        }
        return Promise.reject(error);
    }
);

export default api;
