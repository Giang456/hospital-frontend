import React from 'react';
import RegisterForm from '../components/RegisterForm';
import axiosInstance from '../../../services/axiosInstance';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../../../components/layouts/AuthLayout';
import bannerRegister from '../../../assets/images/banner-register.png';

const RegisterPage = () => {
    const navigate = useNavigate();

    const handleRegister = async (data) => {
        try {
            const response = await axiosInstance.post('/register', data);
            toast.success(response.data.message || 'Đăng ký thành công!');
            navigate('/login');
            return response.data;
        } catch (error) {
            if (error.response && error.response.data && error.response.data.errors) {
                Object.keys(error.response.data.errors).forEach(key => {
                    if (key === 'password_confirmation') {
                         toast.error(error.response.data.errors[key][0]);
                    } else {
                    }
                });
            }
            if (error.response && error.response.data && error.response.data.message) {
                // Hiển thị lỗi chung nếu có
                toast.error(error.response.data.message);
            } else if (!error.response) { // Lỗi mạng
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi không xác định khi đăng ký. Vui lòng thử lại.');
            }
            throw error; // Ném lỗi để RegisterForm có thể bắt và xử lý setError
        }
    };

    return (
        <>
            {/* Banner Section với background mờ - bên ngoài AuthLayout */}
            <div 
                className="register-hero-section position-relative"
                style={{
                    backgroundImage: `url(${bannerRegister})`,
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
                        background: 'rgba(255, 255, 255, 0.44)',
                        top: 0,
                        left: 0,
                        zIndex: 1
                    }}
                ></div>
                
                {/* AuthLayout và Form đăng ký nổi lên trên banner */}
                <div 
                    className="position-relative d-flex align-items-center justify-content-center w-100"
                    style={{ zIndex: 2 }}
                >
                    <AuthLayout>
                        <RegisterForm onSubmit={handleRegister} />
                    </AuthLayout>
                </div>
            </div>
        </>
    );
};

export default RegisterPage;