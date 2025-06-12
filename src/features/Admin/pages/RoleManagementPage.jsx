import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, ListGroup } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

// Schema validation cho tạo/sửa vai trò
const roleSchema = z.object({
    name: z.string().min(1, 'Tên vai trò là bắt buộc.').max(255, 'Tên vai trò không được quá 255 ký tự.'),
    description: z.string().optional().nullable().transform(e => e === '' ? null : e),
});

// Schema validation cho phân quyền (có thể không cần nếu submit thủ công)
// const assignPermissionsSchema = z.object({
//     permissions: z.array(z.number()).optional(),
// });

const RoleManagementPage = () => {
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [currentRole, setCurrentRole] = useState(null);

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [currentRoleForPermissions, setCurrentRoleForPermissions] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [isAssigningPermissions, setIsAssigningPermissions] = useState(false);
    const [loadingRolePermissions, setLoadingRolePermissions] = useState(false);

    // Form cho Role Info
    const {
        register: roleRegister,
        handleSubmit: handleRoleSubmit,
        formState: { errors: roleErrors, isSubmitting: isSubmittingRole }, // Đổi tên isSubmitting
        reset: resetRoleForm,
        setError: setRoleFormError,
        clearErrors: clearRoleFormErrors
    } = useForm({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: '', description: '' }
    });

    // Không cần useForm riêng cho assignPermissions nếu chỉ gửi mảng IDs và không có validation phức tạp
    // const { handleSubmit: handlePermissionSubmit, formState: { isSubmitting: isAssigningPermissionsState } } = useForm({
    //     resolver: zodResolver(assignPermissionsSchema),
    // });


    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rolesRes = await axiosInstance.get('/admin/roles');
            setRoles(rolesRes.data.data || []);

            if (allPermissions.length === 0) {
                const permissionsRes = await axiosInstance.get('/admin/permissions');
                setAllPermissions(permissionsRes.data.data || []);
            }
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu vai trò và quyền.');
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, [allPermissions]);

    useEffect(() => {
        fetchData(); // <<< SỬA Ở ĐÂY: Đổi từ fetchAllData thành fetchData
    }, [fetchData]); // <<< SỬA Ở ĐÂY: Đổi từ fetchAllData thành fetchData

    const handleShowRoleModal = (role = null) => {
        setIsEditingRole(!!role);
        setCurrentRole(role);
        if (role) {
            resetRoleForm({ name: role.name, description: role.description || '' });
        } else {
            resetRoleForm({ name: '', description: '' });
        }
        setShowRoleModal(true);
        clearRoleFormErrors();
    };

    const handleCloseRoleModal = () => {
        setShowRoleModal(false);
        setCurrentRole(null);
        resetRoleForm();
    };

    const onRoleSubmit = async (data) => {
        try {
            let response;
            if (isEditingRole) {
                response = await axiosInstance.put(`/admin/roles/${currentRole.id}`, data);
            } else {
                response = await axiosInstance.post('/admin/roles', data);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData();
            handleCloseRoleModal();
        } catch (err) {
            if (err.response?.data?.errors) {
                Object.keys(err.response.data.errors).forEach(key => {
                    setRoleFormError(key, { type: 'server', message: err.response.data.errors[key][0] });
                });
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi.');
            }
        }
    };

    const handleDeleteRole = async (roleToDelete) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${roleToDelete.name}"?`)) {
            try {
                const response = await axiosInstance.delete(`/admin/roles/${roleToDelete.id}`);
                toast.success(response.data.message || 'Vai trò đã được xóa.');
                fetchData();
            } catch (err) {
                if (err.response?.status === 409) {
                    toast.error('Không thể xóa vai trò này vì đang được sử dụng bởi người dùng.');
                } else {
                    toast.error(err.response?.data?.message || 'Không thể xóa vai trò.');
                }
            }
        }
    };

    const handleShowPermissionModal = async (role) => {
        setCurrentRoleForPermissions(role);
        setShowPermissionModal(true);
        setLoadingRolePermissions(true);
        setSelectedPermissions([]);
        try {
            // Fetch all permissions first if not already loaded
            if (allPermissions.length === 0) {
                const permissionsRes = await axiosInstance.get('/admin/permissions');
                setAllPermissions(permissionsRes.data.data || []);
            }
            
            // Fetch role details with permissions using the correct endpoint
            const response = await axiosInstance.get(`/admin/roles/${role.id}`);
            const roleDetails = response.data?.data;
            
            // Set selected permissions from the role details
            if (roleDetails && Array.isArray(roleDetails.permissions)) {
                setSelectedPermissions(roleDetails.permissions.map(p => Number(p.id)));
            } else {
                setSelectedPermissions([]);
            }
        } catch (err) {
            toast.error(`Lỗi khi tải quyền cho vai trò ${role.name}.`);
        } finally {
            setLoadingRolePermissions(false);
        }
    };

    const handleClosePermissionModal = () => {
        setShowPermissionModal(false);
        setCurrentRoleForPermissions(null);
        setSelectedPermissions([]);
    };

    const handlePermissionCheckboxChange = (permissionId) => {
        const numPermissionId = Number(permissionId);
        setSelectedPermissions(prevSelected =>
            prevSelected.includes(numPermissionId)
                ? prevSelected.filter(id => id !== numPermissionId)
                : [...prevSelected, numPermissionId]
        );
    };

    const onAssignPermissionsSubmit = async (event) => {
        event.preventDefault();
        if (!currentRoleForPermissions) return;
        setIsAssigningPermissions(true);
        try {
            await axiosInstance.post(
                `/admin/roles/${currentRoleForPermissions.id}/assign-permissions`,
                { permissions: selectedPermissions }
            );
            toast.success('Phân quyền thành công!');
            handleClosePermissionModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể phân quyền.');
        } finally {
            setIsAssigningPermissions(false);
        }
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Vai trò & Phân quyền</h2>
                <Button variant="primary" onClick={() => handleShowRoleModal()} className="mb-3">
                    Thêm vai trò mới
                </Button>

                <Table striped bordered hover responsive className="mt-4 shadow-sm">
                    <thead>
                        <tr><th>ID</th><th>Tên vai trò</th><th>Mô tả</th><th>Guard Name</th><th>Hành động</th></tr>
                    </thead>
                    <tbody>
                        {roles.length > 0 ? roles.map(role => (
                            <tr key={role.id}>
                                <td>{role.id}</td><td>{role.name}</td>
                                <td>{role.description || 'N/A'}</td><td>{role.guard_name}</td>
                                <td>
                                    <Button variant="info" size="sm" className="me-2 mb-1" onClick={() => handleShowRoleModal(role)}>Sửa</Button>
                                    <Button variant="danger" size="sm" className="me-2 mb-1" onClick={() => handleDeleteRole(role)}>Xóa</Button>
                                    <Button variant="primary" size="sm" className="mb-1" onClick={() => handleShowPermissionModal(role)}>Phân quyền</Button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="5" className="text-center">Không có vai trò nào.</td></tr>}
                    </tbody>
                </Table>

                <Modal show={showRoleModal} onHide={handleCloseRoleModal} backdrop="static" keyboard={false}>
                    <Form onSubmit={handleRoleSubmit(onRoleSubmit)}>
                        <Modal.Header closeButton><Modal.Title>{isEditingRole ? 'Sửa Vai trò' : 'Thêm Vai trò mới'}</Modal.Title></Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Tên vai trò<span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" {...roleRegister('name')} isInvalid={!!roleErrors.name} />
                                <Form.Control.Feedback type="invalid">{roleErrors.name?.message}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Mô tả</Form.Label>
                                <Form.Control as="textarea" rows={3} {...roleRegister('description')} isInvalid={!!roleErrors.description}/>
                                <Form.Control.Feedback type="invalid">{roleErrors.description?.message}</Form.Control.Feedback>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseRoleModal} disabled={isSubmittingRole}>Đóng</Button>
                            <Button variant="primary" type="submit" disabled={isSubmittingRole}>
                                {isSubmittingRole ? <><Spinner size="sm" className="me-2"/>Đang lưu...</> : 'Lưu'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

                <Modal show={showPermissionModal} onHide={handleClosePermissionModal} size="lg" backdrop="static" keyboard={false}>
                     <Form onSubmit={onAssignPermissionsSubmit}>
                        <Modal.Header closeButton>
                            <Modal.Title>Phân quyền cho vai trò: {currentRoleForPermissions?.name}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {loadingRolePermissions ? (
                                <div className="text-center"><Spinner animation="border" size="sm" /> Đang tải quyền...</div>
                            ) : allPermissions.length > 0 ? (
                                <ListGroup>
                                    {allPermissions.map(permission => {
                                        const permissionIdNum = Number(permission.id);
                                        const isChecked = selectedPermissions.includes(permissionIdNum);
                                        return (
                                            <ListGroup.Item key={permission.id}>
                                                <Form.Check
                                                    type="checkbox"
                                                    id={`permission-${permission.id}`}
                                                    label={`${permission.name} (${permission.guard_name})`}
                                                    checked={isChecked}
                                                    onChange={() => handlePermissionCheckboxChange(permission.id)}
                                                />
                                                <small className="text-muted d-block ms-4">{permission.description || 'Không có mô tả'}</small>
                                            </ListGroup.Item>
                                        );
                                    })}
                                </ListGroup>
                            ) : (
                                <Alert variant="info">Không có quyền nào trong hệ thống để hiển thị.</Alert>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                             <Button variant="secondary" onClick={handleClosePermissionModal} disabled={isAssigningPermissions}>Đóng</Button>
                            <Button variant="primary" type="submit" disabled={isAssigningPermissions || loadingRolePermissions}>
                                {isAssigningPermissions ? <><Spinner size="sm" className="me-2"/>Đang cập nhật...</> : 'Cập nhật Quyền'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
    );
};

export default RoleManagementPage;