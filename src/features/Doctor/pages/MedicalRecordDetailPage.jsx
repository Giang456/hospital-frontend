import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner, Card, ListGroup, Table, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const MedicalRecordDetailPage = () => {
    const { id: recordId } = useParams();
    const navigate = useNavigate();
    const [medicalRecord, setMedicalRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State cho Modal kê đơn
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [prescriptionItems, setPrescriptionItems] = useState([]); // Danh sách các mục thuốc trong đơn
    const [medicines, setMedicines] = useState([]); // Danh sách thuốc để chọn (từ API tra cứu)
    const [prescriptionNotes, setPrescriptionNotes] = useState('');
    const [isSubmittingPrescription, setIsSubmittingPrescription] = useState(false);

    // Hàm fetch chi tiết hồ sơ bệnh án
    const fetchMedicalRecordDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get(`/doctor/medical-records/${recordId}`, {
                params: { with: 'patient,doctor,doctor.doctorProfile,appointment.clinic,prescriptions.items.medicine' }
            });
            setMedicalRecord(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải chi tiết hồ sơ bệnh án.');
            console.error('Error fetching medical record details:', err);
            setError('Không thể tải chi tiết hồ sơ bệnh án. Vui lòng thử lại.');
            if (err.response && err.response.status === 403) {
                setError('Bạn không có quyền xem hồ sơ bệnh án này.');
            } else if (err.response && err.response.status === 404) {
                setError('Hồ sơ bệnh án không tồn tại.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Hàm fetch danh mục thuốc để chọn trong Modal
    const fetchMedicinesForPrescription = async () => {
        try {
            const response = await axiosInstance.get('/medicines/search', { params: { with: 'categories' } });
            setMedicines(response.data.data);
        } catch (err) {
            toast.error('Không thể tải danh mục thuốc.');
            console.error('Error fetching medicines for prescription:', err);
        }
    };

    // useEffect để fetch dữ liệu khi component mount
    useEffect(() => {
        if (recordId) {
            fetchMedicalRecordDetails();
            fetchMedicinesForPrescription();
        }
    }, [recordId]);

    // Hàm định dạng tiền tệ
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Hàm xử lý mở modal kê đơn
    const handleOpenPrescriptionModal = () => {
        setPrescriptionItems([]); // Reset danh sách mục thuốc
        setPrescriptionNotes(''); // Reset ghi chú
        setShowPrescriptionModal(true);
    };

    // Hàm thêm một mục thuốc mới vào đơn
    const handleAddPrescriptionItem = () => {
        setPrescriptionItems([...prescriptionItems, { medicine_id: '', dosage: '', quantity: 1, instructions: '' }]);
    };

    // Hàm cập nhật mục thuốc
    const handleUpdatePrescriptionItem = (index, field, value) => {
        const newItems = [...prescriptionItems];
        newItems[index][field] = value;

        if (field === 'medicine_id') {
            const selectedMedicine = medicines.find(med => med.id === value);
            if (selectedMedicine) {
                // Lưu thông tin thuốc đã chọn vào mục để tính toán giá
                newItems[index].medicine = selectedMedicine;
            } else {
                newItems[index].medicine = null;
            }
        }
        setPrescriptionItems(newItems);
    };

    // Hàm xóa mục thuốc
    const handleRemovePrescriptionItem = (index) => {
        setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
    };

    // Hàm xử lý submit đơn thuốc
    const handleSubmitPrescription = async () => {
        if (!medicalRecord) return;
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

        setIsSubmittingPrescription(true);
        try {
            const payload = {
                medical_record_id: medicalRecord.id,
                notes: prescriptionNotes,
                items: prescriptionItems.map(item => ({
                    medicine_id: item.medicine_id,
                    dosage: item.dosage,
                    quantity: item.quantity,
                    instructions: item.instructions,
                }))
            };

            const response = await axiosInstance.post(`/doctor/medical-records/${medicalRecord.id}/prescriptions`, payload);
            toast.success(response.data.message || 'Kê đơn thuốc thành công!');
            setShowPrescriptionModal(false);
            fetchMedicalRecordDetails(); // Tải lại chi tiết hồ sơ bệnh án để hiển thị đơn thuốc mới
        } catch (err) {
            console.error('Error submitting prescription:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else {
                toast.error('Đã xảy ra lỗi không xác định khi kê đơn. Vui lòng thử lại.');
            }
        } finally {
            setIsSubmittingPrescription(false);
        }
    };


    if (loading) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải chi tiết hồ sơ bệnh án...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">{error}</Alert>
                <Button variant="secondary" onClick={() => navigate('/doctor/medical-records')} className="mt-3">
                    ← Quay lại lịch sử khám
                </Button>
            </Container>
        );
    }

    if (!medicalRecord) {
        return (
            <Container className="my-4">
                <Alert variant="warning">Không tìm thấy hồ sơ bệnh án.</Alert>
            </Container>
        );
    }

    // Lấy thông tin bác sĩ và chuyên khoa để hiển thị
    const doctorName = medicalRecord.doctor?.name || 'N/A';
    const specialization = medicalRecord.doctor?.doctor_profile?.specialization || 'N/A';
    const doctorInfo = `${doctorName} (${specialization})`;

    return (
        <Container className="my-4">
            <Button variant="secondary" onClick={() => navigate('/doctor/medical-records')} className="mb-3">
                ← Quay lại lịch sử khám
            </Button>

            <Card className="p-4 shadow-sm mb-4">
                <Card.Title className="mb-3">
                    <h2>Hồ sơ bệnh án - Lần khám {medicalRecord.visit_date ? format(new Date(medicalRecord.visit_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</h2>
                </Card.Title>
                <ListGroup variant="flush">
                    <ListGroup.Item><strong>Bệnh nhân:</strong> {medicalRecord.patient?.name || 'N/A'} ({medicalRecord.patient?.email || 'N/A'})</ListGroup.Item>
                    <ListGroup.Item><strong>Bác sĩ khám:</strong> {doctorInfo}</ListGroup.Item>
                    <ListGroup.Item><strong>Phòng khám:</strong> {medicalRecord.appointment?.clinic?.name || 'N/A'} ({medicalRecord.appointment?.clinic?.room_number || 'N/A'})</ListGroup.Item>
                    <ListGroup.Item><strong>Triệu chứng:</strong> {medicalRecord.symptoms || 'Không có'}</ListGroup.Item>
                    <ListGroup.Item><strong>Chẩn đoán:</strong> {medicalRecord.diagnosis || 'Không có'}</ListGroup.Item>
                    <ListGroup.Item><strong>Kế hoạch điều trị:</strong> {medicalRecord.treatment_plan || 'Không có'}</ListGroup.Item>
                    <ListGroup.Item><strong>Ghi chú của bác sĩ:</strong> {medicalRecord.doctor_notes || 'Không có'}</ListGroup.Item>
                    {medicalRecord.nurse_notes && <ListGroup.Item><strong>Ghi chú của điều dưỡng:</strong> {medicalRecord.nurse_notes}</ListGroup.Item>}
                </ListGroup>

                <h5 className="mt-4">Thông tin sinh hiệu:</h5>
                <ListGroup variant="flush">
                    <ListGroup.Item><strong>Mạch:</strong> {medicalRecord.vitals_pulse || 'N/A'}</ListGroup.Item>
                    <ListGroup.Item><strong>Nhiệt độ:</strong> {medicalRecord.vitals_temperature || 'N/A'}</ListGroup.Item>
                    <ListGroup.Item><strong>Huyết áp:</strong> {medicalRecord.vitals_blood_pressure || 'N/A'}</ListGroup.Item>
                    <ListGroup.Item><strong>Cân nặng:</strong> {medicalRecord.vitals_weight || 'N/A'}</ListGroup.Item>
                    <ListGroup.Item><strong>Chiều cao:</strong> {medicalRecord.vitals_height || 'N/A'}</ListGroup.Item>
                </ListGroup>

                <Button variant="success" className="mt-4" onClick={handleOpenPrescriptionModal}>
                    Kê đơn thuốc mới
                </Button>
            </Card>

            {medicalRecord.prescriptions && medicalRecord.prescriptions.length > 0 && (
                <Card className="p-4 shadow-sm">
                    <h4>Đơn thuốc đã kê</h4>
                    {medicalRecord.prescriptions.map((prescription) => (
                        <div key={prescription.id} className="mb-4">
                            <p className="mb-2"><em>Kê đơn ngày: {prescription.date_prescribed ? format(new Date(prescription.date_prescribed), 'dd/MM/yyyy') : 'N/A'}</em></p>
                            {prescription.notes && <p className="mb-2"><em>Ghi chú đơn thuốc: {prescription.notes}</em></p>}
                            <Table striped bordered hover responsive size="sm">
                                <thead>
                                    <tr>
                                        <th>Tên thuốc</th>
                                        <th>Hàm lượng</th>
                                        <th>Đơn vị</th>
                                        <th>Giá</th>
                                        <th>Liều dùng</th>
                                        <th>Số lượng</th>
                                        <th>Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescription.items && prescription.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.medicine?.name || 'N/A'}</td>
                                            <td>{item.medicine?.concentration || 'N/A'}</td>
                                            <td>{item.medicine?.unit || 'N/A'}</td>
                                            <td>{formatCurrency(item.medicine?.price || 0)}</td>
                                            <td>{item.dosage}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency((item.quantity || 0) * (item.medicine?.price || 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ))}
                </Card>
            )}

            {/* Modal kê đơn */}
            <Modal show={showPrescriptionModal} onHide={() => setShowPrescriptionModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Kê đơn thuốc mới</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Ghi chú đơn thuốc (chung)</Form.Label>
                            <Form.Control as="textarea" rows={2} value={prescriptionNotes} onChange={(e) => setPrescriptionNotes(e.target.value)} />
                        </Form.Group>

                        <hr />
                        <h5>Các loại thuốc trong đơn</h5>
                        {prescriptionItems.map((item, index) => (
                            <Card key={index} className="mb-3 p-3 bg-light">
                                <Row className="align-items-center">
                                    <Col md={4}>
                                        <Form.Group className="mb-2">
                                            <Form.Label>Thuốc</Form.Label>
                                            <Form.Select
                                                value={item.medicine_id}
                                                onChange={(e) => handleUpdatePrescriptionItem(index, 'medicine_id', parseInt(e.target.value))}
                                            >
                                                <option value="">Chọn thuốc</option>
                                                {medicines.map(med => (
                                                    <option key={med.id} value={med.id}>
                                                        {med.name} ({med.concentration} {med.unit}) - {formatCurrency(med.price)}
                                                    </option>
                                                ))}
                                            </Form.Select>
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
                                {/* Hiển thị tổng tiền cho mục thuốc nếu thuốc được chọn */}
                                {item.medicine_id && item.quantity > 0 && item.medicine && (
                                    <p className="mt-2 mb-0 text-end">
                                        Tổng tiền mục: <strong>{formatCurrency(item.quantity * (item.medicine.price || 0))}</strong>
                                    </p>
                                )}
                            </Card>
                        ))}
                        <Button variant="outline-primary" onClick={handleAddPrescriptionItem} className="mt-3">
                            Thêm loại thuốc khác
                        </Button>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPrescriptionModal(false)}>
                        Hủy
                    </Button>
                    <Button variant="success" onClick={handleSubmitPrescription} disabled={isSubmittingPrescription}>
                        {isSubmittingPrescription ? 'Đang kê đơn...' : 'Lưu đơn thuốc'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MedicalRecordDetailPage;