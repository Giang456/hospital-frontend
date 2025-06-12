import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

const PrivateRoute = () => {
    const { isAuthenticated, loading } = useAuth(); // Lấy trạng thái xác thực và loading

    if (loading) {
        return <div>Đang kiểm tra xác thực...</div>; // Hoặc một loading spinner
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;