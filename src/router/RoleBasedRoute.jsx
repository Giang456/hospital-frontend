import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

const RoleBasedRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div>Đang kiểm tra xác thực...</div>; // Hoặc một loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />; // Chưa đăng nhập thì chuyển về Login
    }

    // Kiểm tra xem người dùng có ít nhất một trong các vai trò được phép không
    const userRoles = user?.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    // Nếu có vai trò, cho phép truy cập, nếu không, chuyển hướng đến trang lỗi 403 hoặc dashboard chung
    return hasRequiredRole ? <Outlet /> : <Navigate to="/unauthorized" replace />; // Sẽ tạo trang Unauthorized
};

export default RoleBasedRoute;