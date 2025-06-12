import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../services/axiosInstance';
import { jwtDecode } from 'jwt-decode'; // Vẫn import dù chưa dùng trực tiếp

// Tạo AuthContext
const AuthContext = createContext(null);

// Custom Hook để dễ dàng sử dụng AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};

// AuthProvider Component
export const AuthProvider = ({ children }) => {
    // Lấy thông tin từ localStorage khi khởi tạo
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error("Failed to parse user from localStorage", error);
            return null;
        }
    });
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Cập nhật token trong axiosInstance khi token thay đổi
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('token');
            delete axiosInstance.defaults.headers.common['Authorization'];
        }
        setLoading(false);
    }, [token]);

    // Lắng nghe sự kiện storage để đồng bộ token giữa các tab/cửa sổ
    useEffect(() => {
        const handleStorageChange = () => {
            const newToken = localStorage.getItem('token');
            const newUser = localStorage.getItem('user');
            if (newToken !== token) {
                setToken(newToken);
            }
            if (newUser !== JSON.stringify(user)) {
                try {
                    setUser(newUser ? JSON.parse(newUser) : null);
                } catch (e) {
                    console.error("Failed to parse user from storage change", e);
                    setUser(null);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [token, user]);

    const login = async (loginId, password) => {
        try {
            const response = await axiosInstance.post('/login', { login_id: loginId, password });
            const newToken = response.data.access_token;
            const userData = response.data.user;

            setToken(newToken);
            setUser(userData);
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));

            return userData;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axiosInstance.post('/logout');
        } catch (error) {
            console.error('Lỗi khi gọi API đăng xuất:', error);
        } finally {
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    };

    // Hàm chuyển hướng dựa trên vai trò
    const redirectToDashboardByRole = (roles) => {
        if (!roles || roles.length === 0) return '/dashboard'; // Mặc định về dashboard chung

        const role = roles[0]; // Lấy vai trò chính (có thể có logic phức tạp hơn nếu nhiều vai trò)
        switch (role) {
            case 'SUPER_ADMIN': return '/admin/dashboard';
            case 'HEAD_OF_DEPARTMENT': return '/hod/dashboard';
            case 'DOCTOR': return '/doctor/dashboard';
            case 'NURSE_STAFF': return '/nurse/dashboard';
            case 'PATIENT': return '/patient/dashboard'; // <-- ĐIỀU CHỈNH DÒNG NÀY
            default: return '/dashboard';
        }
    };

    const authContextValue = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        loading,
        redirectToDashboardByRole, // Cung cấp hàm này qua context
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {loading ? <div>Đang tải xác thực...</div> : children}
        </AuthContext.Provider>
    );
};