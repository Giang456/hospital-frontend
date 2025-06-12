import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

// Schema validation cho tạo/sửa phòng khám
const clinicSchema = z.object({
    name: z.string().min(1, 'Tên phòng khám là bắt buộc.').max(255, 'Tên phòng khám không được quá 255 ký tự.'),
    room_number: z.string().max(50, 'Số phòng không được quá 50 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    description: z.string().optional().nullable().transform(e => e === '' ? null : e),
    status: z.enum(['active', 'inactive'], { message: 'Trạng thái không hợp lệ.' }),
});

const ClinicManagementPage = () => {
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClinic, setCurrentClinic] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm({
        resolver: zodResolver(clinicSchema),
    });

    // Fetch Clinics
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const clinicsRes = await axiosInstance.get('/admin/clinics');
            setClinics(clinicsRes.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách phòng khám.');
            console.error('Error fetching clinics:', err);
            setError('Không thể tải danh sách phòng khám. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Open Add/Edit Modal
    const handleShowModal = (clinic = null) => {
        setIsEditing(!!clinic);
        setCurrentClinic(clinic);
        if (clinic) {
            reset({
                name: clinic.name,
                room_number: clinic.room_number,
                description: clinic.description,
                status: clinic.status,
            });
        } else {
            reset({ name: '', room_number: '', description: '', status: 'active' }); // Mặc định là 'active'
        }
        setShowModal(true);
        clearErrors();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentClinic(null);
        reset();
        clearErrors();
    };

    // Handle form submission (Add/Edit Clinic)
    const onSubmit = async (data) => {
        try {
            let response;
            if (isEditing) {
                response = await axiosInstance.put(`/admin/clinics/${currentClinic.id}`, data);
            } else {
                response = await axiosInstance.post('/admin/clinics', data);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData(); // Refresh clinic list
            handleCloseModal();
        } catch (err) {
            console.error('Error submitting form:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.keys(err.response.data.errors).forEach(key => {
                    setFormError(key, { type: 'server', message: err.response.data.errors[key][0] });
                });
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
            }
        }
    };

    // Handle clinic deletion
    const handleDeleteClinic = async (clinicToDelete) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa phòng khám "${clinicToDelete.name}"?`)) {
            try {
                const response = await axiosInstance.delete(`/admin/clinics/${clinicToDelete.id}`);
                toast.success(response.data.message || 'Phòng khám đã được xóa.');
                fetchData();
            } catch (err) {
                console.error('Error deleting clinic:', err);
                toast.error(err.response?.data?.message || 'Không thể xóa phòng khám.');
            }
        }
    };


    return (

            <Container className="my-4">
                <h2>Quản lý Phòng khám</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm phòng khám mới
                </Button>

                <Table striped bordered hover responsive className="mt-4 shadow-sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên phòng khám</th>
                            <th>Số phòng</th>
                            <th>Mô tả</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clinics.length > 0 ? (
                            clinics.map((clinic) => (
                                <tr key={clinic.id}>
                                    <td>{clinic.id}</td>
                                    <td>{clinic.name}</td>
                                    <td>{clinic.room_number || 'N/A'}</td>
                                    <td>{clinic.description || 'N/A'}</td>
                                    <td>{clinic.status}</td>
                                    <td>
                                        <Button variant="info" size="sm" className="me-2" onClick={() => handleShowModal(clinic)}>
                                            Sửa
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteClinic(clinic)}>
                                            Xóa
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center">Không có phòng khám nào.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                {/* Add/Edit Clinic Modal */}
                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Sửa Phòng khám' : 'Thêm Phòng khám mới'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleSubmit(onSubmit)}>
                            <Form.Group className="mb-3">
                                <Form.Label>Tên phòng khám</Form.Label>
                                <Form.Control type="text" {...register('name')} />
                                {errors.name && <Alert variant="danger" className="mt-2 p-2">{errors.name.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Số phòng</Form.Label>
                                <Form.Control type="text" {...register('room_number')} />
                                {errors.room_number && <Alert variant="danger" className="mt-2 p-2">{errors.room_number.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Mô tả</Form.Label>
                                <Form.Control as="textarea" rows={3} {...register('description')} />
                                {errors.description && <Alert variant="danger" className="mt-2 p-2">{errors.description.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Trạng thái</Form.Label>
                                <Form.Select {...register('status')}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </Form.Select>
                                {errors.status && <Alert variant="danger" className="mt-2 p-2">{errors.status.message}</Alert>}
                            </Form.Group>
                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </Container>
    );
};

export default ClinicManagementPage;