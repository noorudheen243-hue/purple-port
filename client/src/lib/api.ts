import axios from 'axios';

const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || '/api',
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Logic to redirect to login on 401 can go here, 
            // but usually handled by global state or router protector
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
