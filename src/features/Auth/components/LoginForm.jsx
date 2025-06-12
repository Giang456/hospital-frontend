import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, Button, Alert } from 'react-bootstrap';
import toast from 'react-hot-toast';

// 1. Định nghĩa Schema Validation với Zod
const loginSchema = z.object({
    login_id: z.string().min(1, 'Tên đăng nhập là bắt buộc.'),
    password: z.string().min(1, 'Mật khẩu là bắt buộc.'),
});

const LoginForm = ({ onSubmit }) => {
    // 2. Sử dụng useForm hook từ React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    // 3. Hàm xử lý submit form
    const onFormSubmit = async (data) => {
        try {
            await onSubmit(data.login_id, data.password); // Gọi hàm onSubmit từ props
        } catch (apiErrors) {
            // Xử lý lỗi từ API và hiển thị chúng vào form
            if (apiErrors.response && apiErrors.response.data && apiErrors.response.data.errors) {
                // Lỗi validation (422) từ backend, đặt lỗi vào trường login_id
                setError('login_id', {
                    type: 'server',
                    message: apiErrors.response.data.errors.login_id ? apiErrors.response.data.errors.login_id[0] : 'Thông tin đăng nhập không hợp lệ.',
                });
            } else if (apiErrors.response && apiErrors.response.data && apiErrors.response.data.message) {
                // Lỗi chung từ backend
                toast.error(apiErrors.response.data.message);
            } else if (!apiErrors.response) { // Lỗi mạng
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi không xác định khi đăng nhập. Vui lòng thử lại.');
            }
            throw apiErrors; // Ném lỗi để caller có thể bắt
        }
    };

    return (
        <Form onSubmit={handleSubmit(onFormSubmit)}>
            <h2 className="mb-4">Đăng nhập</h2>

            {/* Tên đăng nhập */}
            <Form.Group className="mb-3" controlId="formLoginId">
                <Form.Label>Email / SĐT / Mã nhân viên</Form.Label>
                <Form.Control type="text" placeholder="Nhập tên đăng nhập" {...register('login_id')} />
                {errors.login_id && <Alert variant="danger" className="mt-2 p-2">{errors.login_id.message}</Alert>}
            </Form.Group>

            {/* Mật khẩu */}
            <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control type="password" placeholder="Nhập mật khẩu" {...register('password')} />
                {errors.password && <Alert variant="danger" className="mt-2 p-2">{errors.password.message}</Alert>}
            </Form.Group>

            <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
        </Form>
    );
};

export default LoginForm;