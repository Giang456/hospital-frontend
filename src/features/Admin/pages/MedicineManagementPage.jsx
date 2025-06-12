import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

// Schema validation cho tạo/sửa thuốc
const medicineSchema = z.object({
    name: z.string().min(1, 'Tên thuốc là bắt buộc.').max(255, 'Tên thuốc không được quá 255 ký tự.'),
    active_ingredient: z.string().max(255, 'Hoạt chất không được quá 255 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    concentration: z.string().max(100, 'Hàm lượng không được quá 100 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    unit: z.string().min(1, 'Đơn vị tính là bắt buộc.').max(50, 'Đơn vị tính không được quá 50 ký tự.'),
    price: z.preprocess(
        (val) => Number(val),
        z.number().min(0, 'Giá bán không được nhỏ hơn 0.').refine(val => !isNaN(val), 'Giá bán phải là số.')
    ),
    manufacturer: z.string().max(255, 'Nhà sản xuất không được quá 255 ký tự.').optional().nullable().transform(e => e === '' ? null : e),
    instructions: z.string().optional().nullable().transform(e => e === '' ? null : e),
    status: z.enum(['available', 'discontinued'], { message: 'Trạng thái không hợp lệ.' }),
    category_ids: z.array(z.preprocess(Number, z.number().int('ID loại thuốc phải là số nguyên.'))).optional(), // Mảng ID loại thuốc
});

const MedicineManagementPage = () => {
    const [medicines, setMedicines] = useState([]);
    const [categories, setCategories] = useState([]); // Danh sách loại thuốc để chọn
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMedicine, setCurrentMedicine] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm({
        resolver: zodResolver(medicineSchema),
    });

    // Fetch Medicines and Categories
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const medicinesRes = await axiosInstance.get('/admin/medicines');
            setMedicines(medicinesRes.data.data);

            if (categories.length === 0) { // Fetch categories only once
                const categoriesRes = await axiosInstance.get('/admin/medicine-categories');
                setCategories(categoriesRes.data.data);
            }

        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu thuốc.');
            console.error('Error fetching data:', err);
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Open Add/Edit Modal
    const handleShowModal = (medicine = null) => {
        setIsEditing(!!medicine);
        setCurrentMedicine(medicine);
        if (medicine) {
            reset({
                name: medicine.name,
                active_ingredient: medicine.active_ingredient,
                concentration: medicine.concentration,
                unit: medicine.unit,
                price: medicine.price, // Giá đã là number từ backend
                manufacturer: medicine.manufacturer,
                instructions: medicine.instructions,
                status: medicine.status,
                category_ids: medicine.categories.map(cat => cat.id) || [], // Map về mảng ID
            });
        } else {
            reset({
                name: '', active_ingredient: '', concentration: '', unit: '', price: '',
                manufacturer: '', instructions: '', status: 'available', category_ids: [],
            });
        }
        setShowModal(true);
        clearErrors();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentMedicine(null);
        reset();
        clearErrors();
    };

    // Handle form submission (Add/Edit Medicine)
    const onSubmit = async (data) => {
        // Zod validation đã chuyển price thành number, nhưng nếu bạn cần gửi dạng string cho API (hiếm)
        // data.price = String(data.price);
        try {
            let response;
            if (isEditing) {
                response = await axiosInstance.put(`/admin/medicines/${currentMedicine.id}`, data);
            } else {
                response = await axiosInstance.post('/admin/medicines', data);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData(); // Refresh medicine list
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

    // Handle medicine deletion
    const handleDeleteMedicine = async (medicineToDelete) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${medicineToDelete.name}"?`)) {
            try {
                const response = await axiosInstance.delete(`/admin/medicines/${medicineToDelete.id}`);
                toast.success(response.data.message || 'Thuốc đã được xóa.');
                fetchData();
            } catch (err) {
                console.error('Error deleting medicine:', err);
                toast.error(err.response?.data?.message || 'Không thể xóa thuốc.');
            }
        }
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Thuốc</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm thuốc mới
                </Button>

                <Table striped bordered hover responsive className="mt-4 shadow-sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên thuốc</th>
                            <th>Hoạt chất</th>
                            <th>Hàm lượng</th>
                            <th>Đơn vị</th>
                            <th>Giá</th>
                            <th>Nhà SX</th>
                            <th>Hướng dẫn</th>
                            <th>Trạng thái</th>
                            <th>Loại thuốc</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {medicines.length > 0 ? (
                            medicines.map((medicine) => (
                                <tr key={medicine.id}>
                                    <td>{medicine.id}</td>
                                    <td>{medicine.name}</td>
                                    <td>{medicine.active_ingredient || 'N/A'}</td>
                                    <td>{medicine.concentration || 'N/A'}</td>
                                    <td>{medicine.unit}</td>
                                    <td>{medicine.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                                    <td>{medicine.manufacturer || 'N/A'}</td>
                                    <td>{medicine.instructions?.substring(0, 50) || 'N/A'}...</td> {/* Cắt ngắn hướng dẫn */}
                                    <td>{medicine.status}</td>
                                    <td>
                                        {medicine.categories && medicine.categories.length > 0 ? (
                                            medicine.categories.map(cat => (
                                                <Badge key={cat.id} bg="secondary" className="me-1">{cat.name}</Badge>
                                            ))
                                        ) : 'N/A'}
                                    </td>
                                    <td>
                                        <Button variant="info" size="sm" className="me-2" onClick={() => handleShowModal(medicine)}>
                                            Sửa
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteMedicine(medicine)}>
                                            Xóa
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="11" className="text-center">Không có thuốc nào.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                {/* Add/Edit Medicine Modal */}
                <Modal show={showModal} onHide={handleCloseModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Sửa Thuốc' : 'Thêm Thuốc mới'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleSubmit(onSubmit)}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Tên thuốc</Form.Label>
                                        <Form.Control type="text" {...register('name')} />
                                        {errors.name && <Alert variant="danger" className="mt-2 p-2">{errors.name.message}</Alert>}
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Hoạt chất</Form.Label>
                                        <Form.Control type="text" {...register('active_ingredient')} />
                                        {errors.active_ingredient && <Alert variant="danger" className="mt-2 p-2">{errors.active_ingredient.message}</Alert>}
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Hàm lượng</Form.Label>
                                        <Form.Control type="text" {...register('concentration')} />
                                        {errors.concentration && <Alert variant="danger" className="mt-2 p-2">{errors.concentration.message}</Alert>}
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Đơn vị tính</Form.Label>
                                        <Form.Control type="text" {...register('unit')} />
                                        {errors.unit && <Alert variant="danger" className="mt-2 p-2">{errors.unit.message}</Alert>}
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Giá bán (VND)</Form.Label>
                                        <Form.Control type="number" step="0.01" {...register('price')} />
                                        {errors.price && <Alert variant="danger" className="mt-2 p-2">{errors.price.message}</Alert>}
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Nhà sản xuất</Form.Label>
                                        <Form.Control type="text" {...register('manufacturer')} />
                                        {errors.manufacturer && <Alert variant="danger" className="mt-2 p-2">{errors.manufacturer.message}</Alert>}
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Hướng dẫn sử dụng</Form.Label>
                                <Form.Control as="textarea" rows={3} {...register('instructions')} />
                                {errors.instructions && <Alert variant="danger" className="mt-2 p-2">{errors.instructions.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Trạng thái</Form.Label>
                                <Form.Select {...register('status')}>
                                    <option value="available">Available</option>
                                    <option value="discontinued">Discontinued</option>
                                </Form.Select>
                                {errors.status && <Alert variant="danger" className="mt-2 p-2">{errors.status.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Loại thuốc</Form.Label>
                                {/* Checkbox cho từng loại thuốc */}
                                <div className="d-flex flex-wrap gap-2">
                                    {categories.map(category => (
                                        <Form.Check
                                            key={category.id}
                                            type="checkbox"
                                            id={`category-${category.id}`}
                                            label={category.name}
                                            value={category.id}
                                            {...register('category_ids')}
                                        />
                                    ))}
                                </div>
                                {errors.category_ids && <Alert variant="danger" className="mt-2 p-2">{errors.category_ids.message}</Alert>}
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

export default MedicineManagementPage;