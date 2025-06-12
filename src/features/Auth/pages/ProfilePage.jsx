import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA

// Schema validation cho cập nhật profile
const profileSchema = z.object({
    name: z.string().min(1, 'Họ tên là bắt buộc.').max(255, 'Họ tên không được quá 255 ký tự.'),
    email: z.string().min(1, 'Email là bắt buộc.').email('Email không đúng định dạng.').max(255, 'Email không được quá 255 ký tự.'),
    phone: z.string().max(20, 'Số điện thoại không được quá 20 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    date_of_birth: z.string().optional().nullable().transform(e => e === '' ? null : e).refine(val => val === null || !isNaN(new Date(val)), {
        message: 'Ngày sinh không đúng định dạng.',
    }),
    gender: z.enum(['male', 'female', 'other']).optional().nullable().transform(e => e === '' ? null : e),
    address: z.string().max(255, 'Địa chỉ không được quá 255 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    avatar_url: z.string().url('URL ảnh đại diện không hợp lệ.').max(2048, 'URL ảnh quá dài.').optional().nullable().transform(e => e === '' ? null : e),

    // Các trường chuyên môn (chỉ có nếu user là bác sĩ/trưởng khoa)
    specialization: z.string().max(255, 'Chuyên khoa không được quá 255 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    qualifications: z.string().max(1000, 'Bằng cấp không được quá 1000 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    experience_years: z.preprocess((val) => Number(val), z.number().int().min(0, 'Số năm kinh nghiệm không hợp lệ.').optional().nullable()),
    bio: z.string().max(1000, 'Tiểu sử không được quá 1000 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
});

// Schema validation cho đổi mật khẩu
const passwordSchema = z.object({
    current_password: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc.'),
    new_password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự.'),
    new_password_confirmation: z.string().min(1, 'Xác nhận mật khẩu mới là bắt buộc.'),
}).refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'Xác nhận mật khẩu mới không khớp.',
    path: ['new_password_confirmation'],
});


const ProfilePage = () => {
    const { user, logout } = useAuth();
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [errorProfile, setErrorProfile] = useState(null);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Xác định xem người dùng hiện tại có phải là bác sĩ/trưởng khoa không
    const isDoctorOrHod = user?.roles?.some(role => ['DOCTOR', 'HEAD_OF_DEPARTMENT'].includes(role));

    // Form cho Profile Info
    const {
        register: profileRegister,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
        reset: resetProfileForm,
        setError: setProfileError
    } = useForm({
        resolver: zodResolver(profileSchema),
    });

    // Form cho Password Change
    const {
        register: passwordRegister,
        handleSubmit: handlePasswordSubmit,
        formState: { errors: passwordErrors },
        reset: resetPasswordForm,
        setError: setPasswordError
    } = useForm({
        resolver: zodResolver(passwordSchema),
    });

    // Load dữ liệu profile khi component mount hoặc user thay đổi
    useEffect(() => {
        const fetchAndSetProfile = async () => {
            if (user) {
                try {
                    setLoadingProfile(true);
                    const response = await axiosInstance.get('/user');
                    const fetchedUser = response.data.data;

                    const defaultValues = {
                        name: fetchedUser.name || '',
                        email: fetchedUser.email || '',
                        phone: fetchedUser.phone || '',
                        date_of_birth: fetchedUser.date_of_birth ? format(new Date(fetchedUser.date_of_birth), 'yyyy-MM-dd') : '',
                        gender: fetchedUser.gender || '',
                        address: fetchedUser.address || '',
                        avatar_url: fetchedUser.avatar_url || '',
                        // Điền các trường chuyên môn nếu có
                        specialization: fetchedUser.doctor_profile?.specialization || '',
                        qualifications: fetchedUser.doctor_profile?.qualifications || '',
                        experience_years: fetchedUser.doctor_profile?.experience_years || 0,
                        bio: fetchedUser.doctor_profile?.bio || '',
                    };
                    resetProfileForm(defaultValues);
                    setLoadingProfile(false);
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setErrorProfile('Không thể tải thông tin cá nhân. Vui lòng thử lại.');
                    setLoadingProfile(false);
                }
            } else {
                setLoadingProfile(true);
                setErrorProfile('Không có thông tin người dùng. Vui lòng đăng nhập lại.');
            }
        };

        fetchAndSetProfile();
    }, [user, resetProfileForm]);

    // Xử lý submit Form Profile
    const onProfileFormSubmit = async (data) => {
        setIsSubmittingProfile(true);
        try {
            const response = await axiosInstance.put('/user/profile', data);
            toast.success(response.data.message || 'Cập nhật profile thành công!');
            localStorage.setItem('user', JSON.stringify(response.data.user.data));
            window.location.reload();

        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.response && error.response.data && error.response.data.errors) {
                Object.keys(error.response.data.errors).forEach(key => {
                    setProfileError(key, { type: 'server', message: error.response.data.errors[key][0] });
                });
            } else {
                toast.error(error.response.data.message || 'Đã xảy ra lỗi khi cập nhật profile.');
            }
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    // Xử lý submit Form Đổi mật khẩu
    const onPasswordFormSubmit = async (data) => {
        setIsSubmittingPassword(true);
        try {
            const response = await axiosInstance.put('/user/password', {
                current_password: data.current_password,
                new_password: data.new_password,
                new_password_confirmation: data.new_password_confirmation,
            });
            toast.success(response.data.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            resetPasswordForm();
            logout();
        } catch (error) {
            console.error('Error changing password:', error);
            if (error.response && error.response.data && error.response.data.errors) {
                Object.keys(error.response.data.errors).forEach(key => {
                    setPasswordError(key, { type: 'server', message: error.response.data.errors[key][0] });
                });
            } else {
                toast.error(error.response.data.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
            }
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    if (loadingProfile) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải thông tin cá nhân...</p>
            </Container>
        );
    }

    if (errorProfile) {
        return (
            <Container className="my-4">
                <Alert variant="danger">{errorProfile}</Alert>
            </Container>
        );
    }

    return (
        // XÓA BỌC MainLayout TRỰC TIẾP TẠI ĐÂY
        <Container className="my-4">
            <h2>Quản lý Thông tin cá nhân</h2>

            {/* Form cập nhật Profile */}
            <Card className="p-4 shadow-sm mb-4">
                <Card.Title className="mb-3">Thông tin Profile</Card.Title>
                <Form onSubmit={handleProfileSubmit(onProfileFormSubmit)}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Họ tên</Form.Label>
                                <Form.Control type="text" {...profileRegister('name')} />
                                {profileErrors.name && <Alert variant="danger" className="mt-2 p-2">{profileErrors.name.message}</Alert>}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" {...profileRegister('email')} />
                                {profileErrors.email && <Alert variant="danger" className="mt-2 p-2">{profileErrors.email.message}</Alert>}
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Số điện thoại</Form.Label>
                                <Form.Control type="text" {...profileRegister('phone')} />
                                {profileErrors.phone && <Alert variant="danger" className="mt-2 p-2">{profileErrors.phone.message}</Alert>}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Ngày sinh</Form.Label>
                                <Form.Control type="date" {...profileRegister('date_of_birth')} />
                                {profileErrors.date_of_birth && <Alert variant="danger" className="mt-2 p-2">{profileErrors.date_of_birth.message}</Alert>}
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Giới tính</Form.Label>
                                <Form.Select {...profileRegister('gender')}>
                                    <option value="">Chọn giới tính</option>
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                    <option value="other">Khác</option>
                                </Form.Select>
                                {profileErrors.gender && <Alert variant="danger" className="mt-2 p-2">{profileErrors.gender.message}</Alert>}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Địa chỉ</Form.Label>
                                <Form.Control type="text" {...profileRegister('address')} />
                                {profileErrors.address && <Alert variant="danger" className="mt-2 p-2">{profileErrors.address.message}</Alert>}
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>URL Ảnh đại diện</Form.Label>
                        <Form.Control type="text" {...profileRegister('avatar_url')} />
                        {profileErrors.avatar_url && <Alert variant="danger" className="mt-2 p-2">{profileErrors.avatar_url.message}</Alert>}
                    </Form.Group>

                    {/* Thêm các trường chuyên môn cho bác sĩ/trưởng khoa */}
                    {isDoctorOrHod && (
                        <>
                            <h5 className="mt-4 mb-3">Thông tin chuyên môn</h5>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Chuyên khoa</Form.Label>
                                        <Form.Control type="text" {...profileRegister('specialization')} />
                                        {profileErrors.specialization && <Alert variant="danger" className="mt-2 p-2">{profileErrors.specialization.message}</Alert>}
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Số năm kinh nghiệm</Form.Label>
                                        <Form.Control type="number" {...profileRegister('experience_years')} min={0} />
                                        {profileErrors.experience_years && <Alert variant="danger" className="mt-2 p-2">{profileErrors.experience_years.message}</Alert>}
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Bằng cấp</Form.Label>
                                <Form.Control as="textarea" rows={3} {...profileRegister('qualifications')} />
                                {profileErrors.qualifications && <Alert variant="danger" className="mt-2 p-2">{profileErrors.qualifications.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Tiểu sử/Giới thiệu</Form.Label>
                                <Form.Control as="textarea" rows={3} {...profileRegister('bio')} />
                                {profileErrors.bio && <Alert variant="danger" className="mt-2 p-2">{profileErrors.bio.message}</Alert>}
                            </Form.Group>
                        </>
                    )}

                    <Button variant="primary" type="submit" disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? 'Đang cập nhật...' : 'Cập nhật Profile'}
                    </Button>
                </Form>
            </Card>

            {/* Form đổi mật khẩu */}
            <Card className="p-4 shadow-sm">
                <Card.Title className="mb-3">Đổi mật khẩu</Card.Title>
                <Form onSubmit={handlePasswordSubmit(onPasswordFormSubmit)}>
                    <Form.Group className="mb-3">
                        <Form.Label>Mật khẩu hiện tại</Form.Label>
                        <Form.Control type="password" {...passwordRegister('current_password')} />
                        {passwordErrors.current_password && <Alert variant="danger" className="mt-2 p-2">{passwordErrors.current_password.message}</Alert>}
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Mật khẩu mới</Form.Label>
                        <Form.Control type="password" {...passwordRegister('new_password')} />
                        {passwordErrors.new_password && <Alert variant="danger" className="mt-2 p-2">{passwordErrors.new_password.message}</Alert>}
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Xác nhận mật khẩu mới</Form.Label>
                        <Form.Control type="password" {...passwordRegister('new_password_confirmation')} />
                        {passwordErrors.new_password_confirmation && <Alert variant="danger" className="mt-2 p-2">{passwordErrors.new_password_confirmation.message}</Alert>}
                    </Form.Group>
                    <Button variant="danger" type="submit" disabled={isSubmittingPassword}>
                        {isSubmittingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                    </Button>
                </Form>
            </Card>
        </Container>
    );
};

export default ProfilePage;