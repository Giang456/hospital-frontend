import React, { useEffect } from 'react';
import LoginForm from '../components/LoginForm';
import AuthLayout from '../../../components/layouts/AuthLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import bannerLogin from '../../../assets/images/banner-login.png';

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
        <>
            {/* Banner Section với background mờ - bên ngoài AuthLayout */}
            <div 
                className="login-hero-section position-relative"
                style={{
                    backgroundImage: `url(${bannerLogin})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Overlay mờ */}
                <div 
                    className="position-absolute w-100 h-100"
                    style={{
                        background: 'rgba(255, 255, 255, 0.45)',
                        top: 0,
                        left: 0,
                        zIndex: 1
                    }}
                ></div>
                
                {/* AuthLayout và Form đăng nhập nổi lên trên banner */}
                <div 
                    className="position-relative d-flex flex-column align-items-center justify-content-center w-100"
                    style={{ zIndex: 2 }}
                >
                    <AuthLayout>
                        <LoginForm onSubmit={handleLogin} />
                        <div className="mt-3 text-center">
                            Bạn chưa có tài khoản? <a href="/register">Đăng ký ngay!</a>
                        </div>
                    </AuthLayout>
                </div>
            </div>
        </>
    );
};

export default LoginPage;