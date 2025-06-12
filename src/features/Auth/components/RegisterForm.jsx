import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod'; // Import tất cả từ zod với alias z
import { Form, Button, Alert } from 'react-bootstrap';
import toast from 'react-hot-toast'; // Import toast

// 1. Định nghĩa Schema Validation với Zod
const registerSchema = z.object({
    name: z.string().min(1, 'Họ tên là bắt buộc.').max(255, 'Họ tên không được quá 255 ký tự.'),
    email: z.string().min(1, 'Email là bắt buộc.').email('Email không đúng định dạng.').max(255, 'Email không được quá 255 ký tự.'),
    phone: z.string().min(1, 'Số điện thoại là bắt buộc.').max(20, 'Số điện thoại không được quá 20 ký tự.'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
    password_confirmation: z.string().min(1, 'Xác nhận mật khẩu là bắt buộc.'),
    date_of_birth: z.string().optional().refine(val => val === '' || !isNaN(new Date(val)), { // Optional và kiểm tra định dạng ngày
        message: 'Ngày sinh không đúng định dạng.',
    }),
    gender: z.enum(['male', 'female', 'other']).optional(), // Chỉ chấp nhận các giá trị này
}).refine((data) => data.password === data.password_confirmation, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['password_confirmation'], // Đặt lỗi vào trường password_confirmation
});

const RegisterForm = ({ onSubmit }) => {
    // 2. Sử dụng useForm hook từ React Hook Form
    const {
        register, // Hàm để đăng ký các trường input
        handleSubmit, // Hàm xử lý submit form
        formState: { errors, isSubmitting }, // Trạng thái form (errors, loading state)
        setError // Hàm để đặt lỗi thủ công (ví dụ từ API)
    } = useForm({
        resolver: zodResolver(registerSchema), // Tích hợp Zod resolver
    });

    // 3. Hàm xử lý submit form
    const onFormSubmit = async (data) => {
        try {
            await onSubmit(data); // Gọi hàm onSubmit từ props (sẽ là gọi API)
        } catch (apiErrors) {
            // Xử lý lỗi từ API và hiển thị chúng vào form
            if (apiErrors.response && apiErrors.response.data && apiErrors.response.data.errors) {
                Object.keys(apiErrors.response.data.errors).forEach(key => {
                    setError(key, {
                        type: 'server',
                        message: apiErrors.response.data.errors[key][0],
                    });
                });
            } else {
                toast.error('Đã xảy ra lỗi không xác định.');
            }
        }
    };

    return (
        <Form onSubmit={handleSubmit(onFormSubmit)}>
            <h2 className="mb-4">Đăng ký Tài khoản Bệnh nhân</h2>

            {/* Họ tên */}
            <Form.Group className="mb-3" controlId="formName">
                <Form.Label>Họ tên</Form.Label>
                <Form.Control type="text" placeholder="Nhập họ tên" {...register('name')} />
                {errors.name && <Alert variant="danger" className="mt-2 p-2">{errors.name.message}</Alert>}
            </Form.Group>

            {/* Email */}
            <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" placeholder="Nhập email" {...register('email')} />
                {errors.email && <Alert variant="danger" className="mt-2 p-2">{errors.email.message}</Alert>}
            </Form.Group>

            {/* Số điện thoại */}
            <Form.Group className="mb-3" controlId="formPhone">
                <Form.Label>Số điện thoại</Form.Label>
                <Form.Control type="text" placeholder="Nhập số điện thoại" {...register('phone')} />
                {errors.phone && <Alert variant="danger" className="mt-2 p-2">{errors.phone.message}</Alert>}
            </Form.Group>

            {/* Mật khẩu */}
            <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control type="password" placeholder="Nhập mật khẩu" {...register('password')} />
                {errors.password && <Alert variant="danger" className="mt-2 p-2">{errors.password.message}</Alert>}
            </Form.Group>

            {/* Xác nhận mật khẩu */}
            <Form.Group className="mb-3" controlId="formPasswordConfirmation">
                <Form.Label>Xác nhận mật khẩu</Form.Label>
                <Form.Control type="password" placeholder="Xác nhận mật khẩu" {...register('password_confirmation')} />
                {errors.password_confirmation && <Alert variant="danger" className="mt-2 p-2">{errors.password_confirmation.message}</Alert>}
            </Form.Group>

            {/* Ngày sinh */}
            <Form.Group className="mb-3" controlId="formDateOfBirth">
                <Form.Label>Ngày sinh (Tùy chọn)</Form.Label>
                <Form.Control type="date" {...register('date_of_birth')} />
                {errors.date_of_birth && <Alert variant="danger" className="mt-2 p-2">{errors.date_of_birth.message}</Alert>}
            </Form.Group>

            {/* Giới tính */}
            <Form.Group className="mb-3" controlId="formGender">
                <Form.Label>Giới tính (Tùy chọn)</Form.Label>
                <Form.Select {...register('gender')}>
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                </Form.Select>
                {errors.gender && <Alert variant="danger" className="mt-2 p-2">{errors.gender.message}</Alert>}
            </Form.Group>

            <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
        </Form>
    );
};

export default RegisterForm;