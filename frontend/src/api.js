import axios from 'axios';

// Use environment variable for API URL (production) or fallback to proxy (local)
const apiUrl = import.meta.env.VITE_API_URL || '';
const api = axios.create({
    baseURL: `${apiUrl}/api`, // Ensures /api is always appended (e.g., https://my-backend.onrender.com/api)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
