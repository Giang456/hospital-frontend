import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

// Schema validation cho tạo/sửa loại thuốc
const medicineCategorySchema = z.object({
    name: z.string().min(1, 'Tên loại thuốc là bắt buộc.').max(255, 'Tên loại thuốc không được quá 255 ký tự.'),
    description: z.string().optional().nullable().transform(e => e === '' ? null : e),
});

const MedicineCategoryManagementPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm({
        resolver: zodResolver(medicineCategorySchema),
    });

    // Fetch Medicine Categories
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const categoriesRes = await axiosInstance.get('/admin/medicine-categories');
            setCategories(categoriesRes.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách loại thuốc.');
            console.error('Error fetching categories:', err);
            setError('Không thể tải danh sách loại thuốc. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Open Add/Edit Modal
    const handleShowModal = (category = null) => {
        setIsEditing(!!category);
        setCurrentCategory(category);
        if (category) {
            reset({
                name: category.name,
                description: category.description,
            });
        } else {
            reset({ name: '', description: '' });
        }
        setShowModal(true);
        clearErrors();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentCategory(null);
        reset();
        clearErrors();
    };

    // Handle form submission (Add/Edit Category)
    const onSubmit = async (data) => {
        try {
            let response;
            if (isEditing) {
                response = await axiosInstance.put(`/admin/medicine-categories/${currentCategory.id}`, data);
            } else {
                response = await axiosInstance.post('/admin/medicine-categories', data);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData(); // Refresh category list
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

    // Handle category deletion
    const handleDeleteCategory = async (categoryToDelete) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa loại thuốc "${categoryToDelete.name}"?`)) {
            try {
                const response = await axiosInstance.delete(`/admin/medicine-categories/${categoryToDelete.id}`);
                toast.success(response.data.message || 'Loại thuốc đã được xóa.');
                fetchData();
            } catch (err) {
                console.error('Error deleting category:', err);
                toast.error(err.response?.data?.message || 'Không thể xóa loại thuốc.');
            }
        }
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Loại thuốc</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm loại thuốc mới
                </Button>

                <Table striped bordered hover responsive className="mt-4 shadow-sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên loại thuốc</th>
                            <th>Mô tả</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length > 0 ? (
                            categories.map((category) => (
                                <tr key={category.id}>
                                    <td>{category.id}</td>
                                    <td>{category.name}</td>
                                    <td>{category.description || 'N/A'}</td>
                                    <td>
                                        <Button variant="info" size="sm" className="me-2" onClick={() => handleShowModal(category)}>
                                            Sửa
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(category)}>
                                            Xóa
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center">Không có loại thuốc nào.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                {/* Add/Edit Category Modal */}
                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Sửa Loại thuốc' : 'Thêm Loại thuốc mới'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleSubmit(onSubmit)}>
                            <Form.Group className="mb-3">
                                <Form.Label>Tên loại thuốc</Form.Label>
                                <Form.Control type="text" {...register('name')} />
                                {errors.name && <Alert variant="danger" className="mt-2 p-2">{errors.name.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Mô tả</Form.Label>
                                <Form.Control as="textarea" rows={3} {...register('description')} />
                                {errors.description && <Alert variant="danger" className="mt-2 p-2">{errors.description.message}</Alert>}
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

export default MedicineCategoryManagementPage;