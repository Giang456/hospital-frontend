import React, { useEffect } from 'react';
import LoginForm from '../components/LoginForm';
import AuthLayout from '../../../components/layouts/AuthLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LoginPage = () => {
    const { isAuthenticated, user, login, redirectToDashboardByRole } = useAuth(); // Lấy hàm redirectToDashboardByRole
    const navigate = useNavigate();

    // Chuyển hướng nếu đã đăng nhập
    useEffect(() => {
        if (isAuthenticated) {
            const path = redirectToDashboardByRole(user?.roles);
            navigate(path, { replace: true });
        }
    }, [isAuthenticated, user, navigate, redirectToDashboardByRole]); // Thêm redirectToDashboardByRole vào dependency array

    const handleLogin = async (loginId, password) => {
        try {
            const loggedInUser = await login(loginId, password);
            toast.success(`Chào mừng ${loggedInUser.name}!`);
            // Việc chuyển hướng sẽ được xử lý trong useEffect
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    if (isAuthenticated) {
        return null;
    }

    return (
        <AuthLayout>
            <LoginForm onSubmit={handleLogin} />
            <div className="mt-3 text-center">
                Bạn chưa có tài khoản? <a href="/register">Đăng ký ngay!</a>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;