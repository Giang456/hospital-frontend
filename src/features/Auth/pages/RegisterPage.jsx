import React from 'react';
import RegisterForm from '../components/RegisterForm';
import axiosInstance from '../../../services/axiosInstance';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../../../components/layouts/AuthLayout'; // Import AuthLayout

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
                    // Nếu lỗi là `password_confirmation`, đặt lỗi vào trường `password_confirmation`
                    // Các lỗi khác sẽ tự động ánh xạ nếu tên trường khớp
                    if (key === 'password_confirmation') {
                         toast.error(error.response.data.errors[key][0]); // Hiển thị toast cho lỗi xác nhận mật khẩu
                    } else {
                        // Đặt lỗi vào trường form nếu tên trường khớp
                        // setError(key, { type: 'server', message: error.response.data.errors[key][0] }); // Đã xử lý trong RegisterForm
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
        <AuthLayout> {/* Bọc RegisterForm bằng AuthLayout */}
            <RegisterForm onSubmit={handleRegister} />
        </AuthLayout>
    );
};

export default RegisterPage;