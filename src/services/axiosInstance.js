import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Quan trọng nếu bạn dùng Sanctum SPA Authentication (cookie)
});

// Thêm Interceptor để tự động thêm Bearer Token vào mỗi request
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // Hoặc từ context/store của bạn
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Thêm Interceptor để xử lý lỗi response (ví dụ: 401 Unauthorized)
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Xử lý lỗi 401: ví dụ, xóa token và chuyển hướng về trang đăng nhập
            console.error("401 Unauthorized: Redirecting to login.");
            localStorage.removeItem('token');
            // window.location.href = '/login'; // Chuyển hướng (sẽ cần React Router)
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;