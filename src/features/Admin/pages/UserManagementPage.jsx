import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Tabs, Tab, Pagination } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format, isValid, parseISO } from 'date-fns';

// --- Base Schema (các trường chung) ---
const baseUserSchemaFields = {
    name: z.string().min(1, 'Họ tên là bắt buộc.').max(255, 'Họ tên không được quá 255 ký tự.'),
    email: z.string().min(1, 'Email là bắt buộc.').email('Email không đúng định dạng.').max(255, 'Email không được quá 255 ký tự.'),
    phone: z.string().max(20, 'Số điện thoại không được quá 20 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    avatar_url: z.string()
        .transform(e => e === '' ? null : e)
        .nullable()
        .optional()
        .refine(val => val === null || (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))), {
            message: 'URL ảnh đại diện không hợp lệ nếu được nhập.',
        })
        .refine(val => val === null || (typeof val === 'string' && val.length <= 1000), {
            message: 'URL ảnh đại diện không được quá 1000 ký tự.',
        }),
    date_of_birth: z.string().optional().nullable().refine(val => val === null || val === '' || isValid(parseISO(val)), {
        message: 'Ngày sinh không hợp lệ.',
    }).transform(e => e === '' ? null : e),
    gender: z.enum(['male', 'female', 'other', '']).optional().nullable().transform(e => e === '' ? null : e),
    address: z.string().max(255, 'Địa chỉ không được quá 255 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    employee_code: z.string().max(50, 'Mã nhân viên không được quá 50 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    role_name: z.string().min(1, 'Vai trò là bắt buộc.'),
    clinic_id: z.string()
                 .transform(val => (val === '' || val === null || val === undefined) ? null : parseInt(val, 10))
                 .nullable()
                 .refine(val => val === null || (typeof val === 'number' && !isNaN(val)), {
                     message: "Giá trị phòng khám không hợp lệ."
                 })
                 .optional(),
};

// --- Schema cho Thêm người dùng ---
const userCreateSchema = z.object({
    ...baseUserSchemaFields,
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
    password_confirmation: z.string().min(1, 'Xác nhận mật khẩu là bắt buộc.'),
}).superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Xác nhận mật khẩu không khớp.', path: ['password_confirmation'] });
    }
    if (['DOCTOR', 'HEAD_OF_DEPARTMENT'].includes(data.role_name) && data.clinic_id === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phòng khám là bắt buộc cho vai trò này.', path: ['clinic_id'] });
    }
});

// --- Schema cho Sửa người dùng ---
const userUpdateSchema = z.object({
    ...baseUserSchemaFields, // Các trường name, email, phone, etc. giữ nguyên

    password: z.string()
        .transform(e => e === '' ? null : e) // Nếu rỗng thì là null
        .nullable() // Cho phép null
        .optional() // Trường này có thể không tồn tại trong data
        .refine(val => val === null || (typeof val === 'string' && val.length >= 8), { // Nếu có giá trị (không phải null), thì phải >= 8 ký tự
            message: 'Mật khẩu mới phải có ít nhất 8 ký tự nếu được nhập.',
        }),

    password_confirmation: z.string()
        .transform(e => e === '' ? null : e)
        .nullable()
        .optional(),

}).superRefine((data, ctx) => {
    // Chỉ kiểm tra password_confirmation NẾU password được cung cấp (không phải null và không phải chuỗi rỗng sau transform)
    if (data.password) { // data.password ở đây sẽ là chuỗi nếu người dùng nhập, hoặc null nếu để trống
        if (!data.password_confirmation) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Vui lòng xác nhận mật khẩu mới.',
                path: ['password_confirmation']
            });
        } else if (data.password !== data.password_confirmation) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Xác nhận mật khẩu không khớp.',
                path: ['password_confirmation']
            });
        }
    }

    // Validation cho clinic_id (sẽ điều chỉnh ở dưới)
    if (['DOCTOR', 'HEAD_OF_DEPARTMENT'].includes(data.role_name) && data.clinic_id === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phòng khám là bắt buộc cho vai trò Bác sĩ/Trưởng Khoa.', path: ['clinic_id'] });
    }
});

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [activeTab, setActiveTab] = useState('all');

    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0); // Tổng số items
    const [itemsPerPage, setItemsPerPage] = useState(10); // Số items mỗi trang

    // --- SỬA ĐOẠN NÀY: Dùng state cho resolver ---
    const [formResolver, setFormResolver] = useState(() => zodResolver(userCreateSchema));

    useEffect(() => {
        setFormResolver(() => isEditing ? zodResolver(userUpdateSchema) : zodResolver(userCreateSchema));
    }, [isEditing]);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors, watch } = useForm({
        resolver: formResolver,
        defaultValues: {
            name: '', email: '', phone: '', password: '', password_confirmation: '',
            date_of_birth: '', gender: '', address: '', avatar_url: '',
            employee_code: '', role_name: '', clinic_id: '',
        }
    });

    const roleNameValue = watch('role_name');

    const fetchData = useCallback(async (roleFilter = null, page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                with: 'roles,clinic',
                page: page,
                per_page: itemsPerPage
            };
            if (roleFilter && roleFilter !== 'all') {
                params.role_name = roleFilter;
            }

            const usersRes = await axiosInstance.get('/admin/users', { params });

            // Giả sử API trả về theo cấu trúc của Laravel Paginator (khi dùng ResourceCollection)
            if (usersRes.data && usersRes.data.data && usersRes.data.meta) {
                setUsers(usersRes.data.data);
                setCurrentPage(usersRes.data.meta.current_page);
                setTotalPages(usersRes.data.meta.last_page);
                setTotalItems(usersRes.data.meta.total);
                setItemsPerPage(usersRes.data.meta.per_page);
            } else if (usersRes.data && usersRes.data.data && usersRes.data.last_page !== undefined) {
                 // Trường hợp API trả về trực tiếp từ paginate() không qua Resource Collection
                setUsers(usersRes.data.data);
                setCurrentPage(usersRes.data.current_page);
                setTotalPages(usersRes.data.last_page);
                setTotalItems(usersRes.data.total);
                setItemsPerPage(usersRes.data.per_page);
            } else {
                // Fallback nếu cấu trúc không như mong đợi
                setUsers(usersRes.data.data || usersRes.data || []);
                setTotalPages(1);
                setCurrentPage(1);
            }

            // Chỉ fetch roles và clinics một lần
            if (roles.length === 0) {
                const rolesRes = await axiosInstance.get('/admin/roles');
                setRoles(rolesRes.data.data || []);
            }
            if (clinics.length === 0) {
                const clinicsRes = await axiosInstance.get('/admin/clinics');
                setClinics(clinicsRes.data.data || []);
            }

        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu người dùng.');
            console.error('Error fetching data:', err);
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
            setUsers([]); // Reset users nếu có lỗi
        } finally {
            setLoading(false);
        }
    }, [roles.length, clinics.length, itemsPerPage]); // Thêm itemsPerPage vào dependencies

    useEffect(() => {
        fetchData(activeTab, currentPage);
    }, [activeTab, currentPage, fetchData]);

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
            setCurrentPage(pageNumber);
        }
    };

    const handleShowModal = (user = null) => {
        const editing = !!user;
        setIsEditing(editing);
        setCurrentUser(user);
        clearErrors();

        if (user) {
            reset({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                date_of_birth: user.date_of_birth ? format(parseISO(user.date_of_birth), 'yyyy-MM-dd') : '',
                gender: user.gender || '',
                address: user.address || '',
                avatar_url: user.avatar_url || '',
                employee_code: user.employee_code || '',
                role_name: user.roles && user.roles.length > 0 ? (typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0]?.name) : '',
                clinic_id: user.clinic_id === null || user.clinic_id === undefined ? '' : String(user.clinic_id),
                password: '',
                password_confirmation: '',
            });
        } else {
            reset(); // Reset về defaultValues với schema create (useEffect sẽ cập nhật resolver)
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentUser(null);
        setIsEditing(false);
        reset();
    };

    const onSubmit = async (formData) => {
        const dataToSend = { ...formData };

        ['phone', 'avatar_url', 'date_of_birth', 'gender', 'address', 'employee_code'].forEach(key => {
            if (dataToSend[key] === '') dataToSend[key] = null;
        });

        if (dataToSend.clinic_id === '' || dataToSend.clinic_id === null || dataToSend.clinic_id === undefined || isNaN(parseInt(dataToSend.clinic_id, 10))) {
            dataToSend.clinic_id = null;
        } else {
            dataToSend.clinic_id = parseInt(dataToSend.clinic_id, 10);
        }

        try {
            let response;
            if (isEditing) {
                // Nếu đang sửa và mật khẩu để trống, xóa các trường mật khẩu khỏi data gửi đi
                if (!dataToSend.password) {
                    delete dataToSend.password;
                    delete dataToSend.password_confirmation;
                }
                response = await axiosInstance.put(`/admin/users/${currentUser.id}`, dataToSend);
            } else {
                response = await axiosInstance.post('/admin/users', dataToSend);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData(activeTab, isEditing ? currentPage : 1); // Nếu thêm mới thì về trang 1
            handleCloseModal();
        } catch (err) {
            console.error('Error submitting form:', err.response?.data || err.message);
            if (err.response?.data?.errors) {
                const serverErrors = err.response.data.errors;
                Object.keys(serverErrors).forEach(key => {
                    setFormError(key, { type: 'server', message: serverErrors[key][0] });
                });
                toast.error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi khi thực hiện thao tác.');
            }
        }
    };

    const handleStatusChange = async (userToUpdate, newStatus) => {
        if (window.confirm(`Bạn có chắc chắn muốn ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} người dùng "${userToUpdate.name}"?`)) {
            try {
                const response = await axiosInstance.patch(`/admin/users/${userToUpdate.id}/status`, { status: newStatus });
                toast.success(response.data.message || 'Cập nhật trạng thái thành công!');
                fetchData(activeTab, currentPage);
            } catch (err) {
                console.error('Error changing status:', err);
                toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái.');
            }
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${userName}"? Thao tác này không thể hoàn tác.`)) {
            try {
                const response = await axiosInstance.delete(`/admin/users/${userId}`);
                toast.success(response.data.message || 'Người dùng đã được xóa.');
                // Nếu xóa user cuối cùng của trang hiện tại, và không phải trang 1, thì lùi về trang trước
                if (users.length === 1 && currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                } else {
                    fetchData(activeTab, currentPage);
                }
            } catch (err) {
                console.error('Error deleting user:', err);
                toast.error(err.response?.data?.message || 'Không thể xóa người dùng.');
            }
        }
    };

    const renderUserTable = (usersToRender, showEmployeeCode = true, showClinic = true) => {
        // Tính tổng số cột để dùng cho colspan khi không có dữ liệu
        let colCount = 6; // ID, Họ tên, Email, SĐT, Vai trò, Trạng thái, Hành động
        if (showEmployeeCode) colCount++;
        if (showClinic) colCount++;
        // colCount: ID, Họ tên, Email, SĐT, [Mã NV], Vai trò, [Phòng khám], Trạng thái, Hành động

        return (
            <Table striped bordered hover responsive className="mt-4 shadow-sm">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Họ tên</th>
                        <th>Email</th>
                        <th>SĐT</th>
                        {showEmployeeCode && <th>Mã NV</th>}
                        <th>Vai trò</th>
                        {showClinic && <th>Phòng khám</th>}
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {usersToRender.length > 0 ? (
                        usersToRender.map((user) => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.phone || 'N/A'}</td>
                                {showEmployeeCode && <td>{user.employee_code || 'N/A'}</td>}
                                <td>{user.roles && user.roles.length > 0 ? user.roles.map(r => typeof r === 'string' ? r : r.name).join(', ') : 'N/A'}</td>
                                {showClinic && <td>{user.clinic?.name || 'N/A'}</td>}
                                <td>
                                    <span className={`badge bg-${user.status === 'active' ? 'success' : 'danger'}`}>{user.status === 'active' ? 'Hoạt động' : 'Vô hiệu'}</span>
                                </td>
                                <td>
                                    <Button variant="info" size="sm" className="me-1 mb-1" onClick={() => handleShowModal(user)}>Sửa</Button>
                                    <Button
                                        variant={user.status === 'active' ? 'warning' : 'success'}
                                        size="sm" className="me-1 mb-1"
                                        onClick={() => handleStatusChange(user, user.status === 'active' ? 'inactive' : 'active')}
                                    >
                                        {user.status === 'active' ? 'Vô hiệu' : 'Kích hoạt'}
                                    </Button>
                                    <Button variant="danger" size="sm" className="mb-1" onClick={() => handleDeleteUser(user.id, user.name)}>Xóa</Button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={colCount} className="text-center">Không có người dùng nào.</td></tr>
                    )}
                </tbody>
            </Table>
        );
    };

    const renderPagination = () => {
        // ... (Giữ nguyên hàm renderPagination từ câu trả lời trước, hoặc dùng thư viện nếu muốn phức tạp hơn)
        if (totalPages <= 1) return null;
        let items = [];
        const pageRangeDisplayed = 5; // Số trang tối đa hiển thị cùng lúc
        let startPage, endPage;

        if (totalPages <= pageRangeDisplayed) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPage <= Math.ceil(pageRangeDisplayed / 2)) {
                startPage = 1;
                endPage = pageRangeDisplayed;
            } else if (currentPage + Math.floor(pageRangeDisplayed / 2) >= totalPages) {
                startPage = totalPages - pageRangeDisplayed + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - Math.floor(pageRangeDisplayed / 2);
                endPage = currentPage + Math.floor(pageRangeDisplayed / 2);
            }
        }

        items.push(<Pagination.First key="first" onClick={() => handlePageChange(1)} disabled={currentPage === 1} />);
        items.push(<Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />);

        if (startPage > 1) {
            items.push(<Pagination.Item key={1} onClick={() => handlePageChange(1)}>{1}</Pagination.Item>);
            if (startPage > 2) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
        }

        for (let number = startPage; number <= endPage; number++) {
            items.push(<Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>{number}</Pagination.Item>);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
            items.push(<Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>{totalPages}</Pagination.Item>);
        }

        items.push(<Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />);
        items.push(<Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />);

        return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
    };

    const renderTabContent = (filterFunction, showEmployeeCode = true, showClinic = true) => {
        const filteredUsers = filterFunction ? users.filter(filterFunction) : users;
        return (
            <>
                {loading ? (
                    <div className="text-center my-3"><Spinner animation="border" /></div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : (
                    <>
                        {renderUserTable(filteredUsers, showEmployeeCode, showClinic)}
                        {/* Phân trang chỉ áp dụng cho tab "Tất cả" nếu filter ở client, hoặc fetch lại nếu filter ở server */}
                        {(activeTab === 'all' || !filterFunction) && renderPagination()}
                    </>
                )}
            </>
        );
    };


    return (
            <Container className="my-4">
                <h2>Quản lý Người dùng</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm người dùng mới
                </Button>

                <Tabs id="user-roles-tabs" activeKey={activeTab} onSelect={(k) => {setActiveTab(k); setCurrentPage(1);}} className="mb-3">
                    <Tab eventKey="all" title="Tất cả Người dùng">{renderTabContent()}</Tab>
                    <Tab eventKey="PATIENT" title="Bệnh nhân">{renderTabContent(u => u.roles.some(r => (typeof r === 'string' ? r : r.name) === 'PATIENT'), false, false)}</Tab>
                    <Tab eventKey="DOCTOR" title="Bác sĩ">{renderTabContent(u => u.roles.some(r => (typeof r === 'string' ? r : r.name) === 'DOCTOR'))}</Tab>
                    <Tab eventKey="NURSE_STAFF" title="Y tá / Điều dưỡng">{renderTabContent(u => u.roles.some(r => (typeof r === 'string' ? r : r.name) === 'NURSE_STAFF'))}</Tab>
                    <Tab eventKey="HEAD_OF_DEPARTMENT" title="Trưởng Khoa">{renderTabContent(u => u.roles.some(r => (typeof r === 'string' ? r : r.name) === 'HEAD_OF_DEPARTMENT'))}</Tab>
                    <Tab eventKey="SUPER_ADMIN" title="Super Admin">{renderTabContent(u => u.roles.some(r => (typeof r === 'string' ? r : r.name) === 'SUPER_ADMIN'))}</Tab>
                </Tabs>

                <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Sửa thông tin Người dùng' : 'Thêm Người dùng mới'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Modal.Body>
                            {/* Form fields */}
                            <Row>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Họ tên<span className="text-danger">*</span></Form.Label><Form.Control type="text" {...register('name')} isInvalid={!!errors.name} /><Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback></Form.Group></Col>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Email<span className="text-danger">*</span></Form.Label><Form.Control type="email" {...register('email')} isInvalid={!!errors.email} /><Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback></Form.Group></Col>
                            </Row>
                            <Row>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Số điện thoại</Form.Label><Form.Control type="text" {...register('phone')} isInvalid={!!errors.phone} /><Form.Control.Feedback type="invalid">{errors.phone?.message}</Form.Control.Feedback></Form.Group></Col>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Mã nhân viên</Form.Label><Form.Control type="text" {...register('employee_code')} isInvalid={!!errors.employee_code} /><Form.Control.Feedback type="invalid">{errors.employee_code?.message}</Form.Control.Feedback></Form.Group></Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Vai trò<span className="text-danger">*</span></Form.Label>
                                        <Form.Select {...register('role_name')} isInvalid={!!errors.role_name} >
                                            <option value="">Chọn vai trò</option>
                                            {roles.map(role => (<option key={role.id} value={role.name}>{role.name}</option>))}
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">{errors.role_name?.message}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Phòng khám {(roleNameValue === 'DOCTOR' || roleNameValue === 'HEAD_OF_DEPARTMENT') && <span className="text-danger">*</span>}</Form.Label>
                                        <Form.Select
                                            {...register('clinic_id')}
                                            isInvalid={!!errors.clinic_id}
                                            disabled={!(roleNameValue === 'DOCTOR' || roleNameValue === 'HEAD_OF_DEPARTMENT')}
                                        >
                                            <option value="">Chọn phòng khám</option>
                                            {clinics.map(clinic => (<option key={clinic.id} value={String(clinic.id)}>{clinic.name} (Phòng {clinic.room_number})</option>))}
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">{errors.clinic_id?.message}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {isEditing ? (
                                <Row>
                                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Mật khẩu mới (Để trống nếu không đổi)</Form.Label><Form.Control type="password" {...register('password')} isInvalid={!!errors.password} /><Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback></Form.Group></Col>
                                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Xác nhận mật khẩu mới</Form.Label><Form.Control type="password" {...register('password_confirmation')} isInvalid={!!errors.password_confirmation}/><Form.Control.Feedback type="invalid">{errors.password_confirmation?.message}</Form.Control.Feedback></Form.Group></Col>
                                </Row>
                            ) : (
                                <Row>
                                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Mật khẩu<span className="text-danger">*</span></Form.Label><Form.Control type="password" {...register('password')} isInvalid={!!errors.password}/><Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback></Form.Group></Col>
                                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Xác nhận mật khẩu<span className="text-danger">*</span></Form.Label><Form.Control type="password" {...register('password_confirmation')} isInvalid={!!errors.password_confirmation}/><Form.Control.Feedback type="invalid">{errors.password_confirmation?.message}</Form.Control.Feedback></Form.Group></Col>
                                </Row>
                            )}

                            <Form.Group className="mb-3"><Form.Label>Ngày sinh</Form.Label><Form.Control type="date" {...register('date_of_birth')} isInvalid={!!errors.date_of_birth} /><Form.Control.Feedback type="invalid">{errors.date_of_birth?.message}</Form.Control.Feedback></Form.Group>
                            <Form.Group className="mb-3"><Form.Label>Giới tính</Form.Label><Form.Select {...register('gender')} isInvalid={!!errors.gender}><option value="">Chọn giới tính</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></Form.Select><Form.Control.Feedback type="invalid">{errors.gender?.message}</Form.Control.Feedback></Form.Group>
                            <Form.Group className="mb-3"><Form.Label>Địa chỉ</Form.Label><Form.Control type="text" {...register('address')} isInvalid={!!errors.address} /><Form.Control.Feedback type="invalid">{errors.address?.message}</Form.Control.Feedback></Form.Group>
                            <Form.Group className="mb-3"><Form.Label>URL Ảnh đại diện</Form.Label><Form.Control type="text" {...register('avatar_url')} isInvalid={!!errors.avatar_url}/><Form.Control.Feedback type="invalid">{errors.avatar_url?.message}</Form.Control.Feedback></Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>Đóng</Button>
                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />Đang lưu...</> : (isEditing ? 'Lưu thay đổi' : 'Thêm người dùng')}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
    );
};

export default UserManagementPage;