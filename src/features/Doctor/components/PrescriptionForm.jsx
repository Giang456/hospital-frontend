import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button, Card, Table, Badge, Spinner } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PrescriptionForm = ({ existingPrescription = null, medicalRecordId, onSubmit, isSubmitting }) => {
    const [prescriptionNotes, setPrescriptionNotes] = useState(existingPrescription?.notes || '');
    const [prescriptionItems, setPrescriptionItems] = useState([]);
    const [medicines, setMedicines] = useState([]); // Danh mục thuốc để chọn
    const [searchTerm, setSearchTerm] = useState(''); // Từ khóa tìm kiếm thuốc
    const [searchResultMedicines, setSearchResultMedicines] = useState([]); // Kết quả tìm kiếm thuốc
    const [isSearchingMedicines, setIsSearchingMedicines] = useState(false);

    useEffect(() => {
        // Nếu có đơn thuốc hiện có, gán các mục thuốc vào state
        if (existingPrescription) {
            setPrescriptionNotes(existingPrescription.notes || '');
            setPrescriptionItems(existingPrescription.items.map(item => ({
                ...item,
                medicine: medicines.find(med => med.id === item.medicine_id) || item.medicine // Đảm bảo medicine object có sẵn
            })));
        } else {
            // Reset khi tạo đơn mới
            setPrescriptionItems([]);
            setPrescriptionNotes('');
        }
        // Fetch danh mục thuốc khi component mount
        fetchMedicinesForSelection();
    }, [existingPrescription]);

    // Hàm fetch danh mục thuốc để chọn (gọi API tra cứu chung)
    const fetchMedicinesForSelection = async () => {
        try {
            const response = await axiosInstance.get('/medicines/search', { params: { paginate: false, with: 'categories' } }); // Lấy tất cả, không phân trang
            setMedicines(response.data.data);
        } catch (err) {
            toast.error('Không thể tải danh mục thuốc.');
            console.error('Error fetching medicines for selection:', err);
        }
    };

    // Hàm tìm kiếm thuốc để thêm vào đơn
    const handleSearchMedicine = async () => {
        setIsSearchingMedicines(true);
        try {
            const response = await axiosInstance.get('/medicines/search', { params: { keyword: searchTerm, with: 'categories' } });
            setSearchResultMedicines(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tìm kiếm thuốc.');
            console.error('Error searching medicines:', err);
        } finally {
            setIsSearchingMedicines(false);
        }
    };

    // Hàm thêm một mục thuốc mới vào đơn
    const handleAddPrescriptionItem = (medicineToAdd = null) => {
        const newMedicineItem = medicineToAdd ? {
            medicine_id: medicineToAdd.id,
            medicine: medicineToAdd, // Lưu thông tin thuốc để hiển thị
            dosage: '',
            quantity: 1,
            instructions: ''
        } : { medicine_id: '', dosage: '', quantity: 1, instructions: '' };

        setPrescriptionItems([...prescriptionItems, newMedicineItem]);
        // Xóa kết quả tìm kiếm sau khi thêm
        setSearchTerm('');
        setSearchResultMedicines([]);
    };

    // Hàm cập nhật mục thuốc
    const handleUpdatePrescriptionItem = (index, field, value) => {
        const newItems = [...prescriptionItems];
        newItems[index][field] = value;
        if (field === 'medicine_id') {
            const selectedMedicine = medicines.find(med => med.id === parseInt(value));
            if (selectedMedicine) {
                newItems[index].medicine = selectedMedicine;
            } else {
                newItems[index].medicine = null; // Clear medicine info if ID is invalid
            }
        }
        setPrescriptionItems(newItems);
    };

    // Hàm xóa mục thuốc
    const handleRemovePrescriptionItem = (index) => {
        setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
    };

    // Hàm xử lý submit toàn bộ đơn thuốc
    const onFormSubmit = () => {
        if (prescriptionItems.length === 0) {
            toast.error('Vui lòng thêm ít nhất một loại thuốc vào đơn.');
            return;
        }

        // Client-side validation cơ bản cho các mục thuốc
        for (const item of prescriptionItems) {
            if (!item.medicine_id || !item.dosage.trim() || item.quantity <= 0) {
                toast.error('Vui lòng điền đầy đủ thông tin (thuốc, liều dùng, số lượng) cho tất cả các mục.');
                return;
            }
        }

        const payload = {
            medical_record_id: medicalRecordId,
            notes: prescriptionNotes,
            items: prescriptionItems.map(item => ({
                medicine_id: item.medicine_id,
                dosage: item.dosage,
                quantity: item.quantity,
                instructions: item.instructions,
            }))
        };
        onSubmit(payload); // Gọi hàm onSubmit từ props
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <Form>
            <Form.Group className="mb-3">
                <Form.Label>Ghi chú đơn thuốc (chung)</Form.Label>
                <Form.Control as="textarea" rows={2} value={prescriptionNotes} onChange={(e) => setPrescriptionNotes(e.target.value)} />
            </Form.Group>

            <hr />
            <h5>Các loại thuốc trong đơn</h5>

            {/* Form tìm kiếm và thêm thuốc */}
            <Card className="p-3 mb-3 bg-white shadow-sm">
                <Row className="align-items-end">
                    <Col md={9}>
                        <Form.Group>
                            <Form.Label>Tìm kiếm thuốc để thêm</Form.Label>
                            <Form.Control type="text" placeholder="Tên thuốc hoặc hoạt chất..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Button variant="info" onClick={handleSearchMedicine} disabled={isSearchingMedicines || !searchTerm.trim()} className="w-100">
                            {isSearchingMedicines ? <Spinner as="span" animation="border" size="sm" /> : 'Tìm thuốc'}
                        </Button>
                    </Col>
                </Row>
                {searchResultMedicines.length > 0 && (
                    <div className="mt-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <ListGroup>
                            {searchResultMedicines.map(med => (
                                <ListGroup.Item action key={med.id} onClick={() => handleAddPrescriptionItem(med)}>
                                    {med.name} ({med.concentration} {med.unit}) - {formatCurrency(med.price)}
                                    <Badge bg="primary" className="ms-2">Thêm</Badge>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                )}
                <div className="mt-3 text-center">
                    <Button variant="outline-primary" onClick={() => handleAddPrescriptionItem()} className="mt-2">
                        Thêm thủ công (chưa tìm thấy)
                    </Button>
                </div>
            </Card>

            {/* Danh sách các mục thuốc trong đơn */}
            {prescriptionItems.length === 0 && (
                <Alert variant="info" className="text-center">Đơn thuốc chưa có loại thuốc nào. Vui lòng thêm thuốc.</Alert>
            )}
            {prescriptionItems.map((item, index) => (
                <Card key={index} className="mb-3 p-3 bg-light shadow-sm">
                    <Row className="align-items-center">
                        <Col md={4}>
                            <Form.Group className="mb-2">
                                <Form.Label>Thuốc</Form.Label>
                                <Form.Select
                                    value={item.medicine_id}
                                    onChange={(e) => handleUpdatePrescriptionItem(index, 'medicine_id', parseInt(e.target.value))}
                                    disabled={!!item.medicine} // Disable nếu đã được chọn tự động
                                >
                                    <option value="">Chọn thuốc</option>
                                    {/* Hiển thị thuốc đã tìm kiếm hoặc tất cả thuốc nếu chưa có tìm kiếm */}
                                    {medicines.map(med => (
                                        <option key={med.id} value={med.id}>
                                            {med.name} ({med.concentration} {med.unit})
                                        </option>
                                    ))}
                                </Form.Select>
                                {item.medicine && <small className="text-muted">Giá: {formatCurrency(item.medicine.price || 0)}</small>}
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-2">
                                <Form.Label>Liều dùng</Form.Label>
                                <Form.Control type="text" value={item.dosage} onChange={(e) => handleUpdatePrescriptionItem(index, 'dosage', e.target.value)} placeholder="VD: 1 viên/ngày" />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label>Số lượng</Form.Label>
                                <Form.Control type="number" value={item.quantity} onChange={(e) => handleUpdatePrescriptionItem(index, 'quantity', parseInt(e.target.value))} min={1} />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label>Hướng dẫn (tùy chọn)</Form.Label>
                                <Form.Control type="text" value={item.instructions} onChange={(e) => handleUpdatePrescriptionItem(index, 'instructions', e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col md={1} className="text-end">
                            <Button variant="danger" size="sm" onClick={() => handleRemovePrescriptionItem(index)}>Xóa</Button>
                        </Col>
                    </Row>
                    {item.medicine_id && item.quantity > 0 && item.medicine && (
                        <p className="mt-2 mb-0 text-end">
                            Tổng tiền mục: <strong>{formatCurrency(item.quantity * (item.medicine.price || 0))}</strong>
                        </p>
                    )}
                </Card>
            ))}
            <Button variant="outline-primary" onClick={() => handleAddPrescriptionItem()} className="mt-3">
                Thêm loại thuốc khác (thủ công)
            </Button>

            <hr className="my-4" />
            <Button variant="success" onClick={onFormSubmit} disabled={isSubmittingPrescription || prescriptionItems.length === 0}>
                {isSubmittingPrescription ? 'Đang kê đơn...' : 'Lưu đơn thuốc'}
            </Button>
        </Form>
    );
};

export default PrescriptionForm;