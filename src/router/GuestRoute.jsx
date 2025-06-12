import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

const GuestRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div>Đang kiểm tra xác thực...</div>; // Hoặc một loading spinner
    }

    // Nếu đã đăng nhập, chuyển hướng đến Dashboard chung
    return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default GuestRoute;