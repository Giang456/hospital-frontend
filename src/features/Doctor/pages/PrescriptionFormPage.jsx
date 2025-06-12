import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Table } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA
import { format } from 'date-fns';

const PrescriptionFormPage = () => {
    const { id: medicalRecordId } = useParams();
    const navigate = useNavigate();

    const [medicalRecord, setMedicalRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [prescriptionItems, setPrescriptionItems] = useState([]);
    const [prescriptionNotes, setPrescriptionNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [currentItemDosage, setCurrentItemDosage] = useState('');
    const [currentItemQuantity, setCurrentItemQuantity] = useState('');
    const [currentItemInstructions, setCurrentItemInstructions] = useState('');

    useEffect(() => {
        const fetchMedicalRecordAndMedicines = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch thông tin hồ sơ bệnh án
                const medicalRecordRes = await axiosInstance.get(`/doctor/medical-records/${medicalRecordId}`, {
                    params: { with: 'patient,doctor.doctorProfile,appointment.clinic,prescriptions.items.medicine' } // Đảm bảo eager load đủ
                });
                setMedicalRecord(medicalRecordRes.data.data);

                // Tải đơn thuốc đã có nếu tồn tại (để có thể chỉnh sửa/xem)
                if (medicalRecordRes.data.data.prescriptions && medicalRecordRes.data.data.prescriptions.length > 0) {
                    const existingPrescription = medicalRecordRes.data.data.prescriptions[0];
                    setPrescriptionNotes(existingPrescription.notes || '');
                    setPrescriptionItems(existingPrescription.items.map(item => ({
                        ...item,
                        medicine: item.medicine,
                    })));
                    toast.info('Hồ sơ bệnh án này đã có đơn thuốc. Bạn có thể chỉnh sửa các mục.');
                }

                // Fetch danh sách thuốc để tra cứu
                const medicinesRes = await axiosInstance.get('/medicines/search', { params: { with: 'categories' } }); // API chung cho tra cứu thuốc
                setMedicines(medicinesRes.data.data);

            } catch (err) {
                toast.error('Lỗi khi tải thông tin. Vui lòng thử lại.');
                console.error('Error fetching data for prescription form:', err);
                setError('Không thể tải dữ liệu. Vui lòng thử lại.');
                if (err.response && err.response.status === 403) {
                    setError('Bạn không có quyền truy cập hồ sơ bệnh án này.');
                } else if (err.response && err.response.status === 404) {
                    setError('Hồ sơ bệnh án không tồn tại.');
                } else if (!err.response) { // Lỗi mạng
                    toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (medicalRecordId) {
            fetchMedicalRecordAndMedicines();
        }
    }, [medicalRecordId]);

    const handleAddPrescriptionItem = () => {
        if (!selectedMedicine || !currentItemDosage.trim() || !currentItemQuantity || currentItemQuantity <= 0) {
            toast.error('Vui lòng chọn thuốc, nhập liều dùng và số lượng hợp lệ.');
            return;
        }

        setPrescriptionItems(prevItems => [
            ...prevItems,
            {
                medicine_id: selectedMedicine.id,
                medicine: selectedMedicine,
                dosage: currentItemDosage.trim(),
                quantity: parseInt(currentItemQuantity),
                instructions: currentItemInstructions.trim() || null,
            }
        ]);

        setSelectedMedicine(null);
        setCurrentItemDosage('');
        setCurrentItemQuantity('');
        setCurrentItemInstructions('');
    };

    const handleRemovePrescriptionItem = (index) => {
        setPrescriptionItems(prevItems => prevItems.filter((_, i) => i !== index));
    };

    const handleSubmitPrescription = async () => {
        if (prescriptionItems.length === 0) {
            toast.error('Đơn thuốc phải có ít nhất một mục thuốc.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                medical_record_id: medicalRecordId,
                notes: prescriptionNotes.trim() || null,
                items: prescriptionItems.map(item => ({
                    medicine_id: item.medicine_id,
                    dosage: item.dosage,
                    quantity: item.quantity,
                    instructions: item.instructions,
                })),
            };

            const response = await axiosInstance.post(`/doctor/medical-records/${medicalRecordId}/prescriptions`, payload);
            toast.success(response.data.message || 'Đơn thuốc đã được kê thành công!');
            navigate(`/doctor/medical-records/${medicalRecordId}`);
        } catch (err) {
            console.error('Error submitting prescription:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else if (!err.response) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi khi kê đơn. Vui lòng thử lại.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải thông tin hồ sơ bệnh án...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">{error}</Alert>
                <Button variant="secondary" onClick={() => navigate('/doctor/medical-records')} className="mt-3">
                    ← Quay lại hồ sơ bệnh án
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

    return (
        // XÓA BỌC MainLayout TRỰC TIẾP TẠI ĐÂY
        <Container className="my-4">
            <h2>Kê đơn thuốc cho BN: {medicalRecord.patient?.name || 'N/A'}</h2>
            <p>Lần khám: {medicalRecord.visit_date ? format(new Date(medicalRecord.visit_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
            <p>Chẩn đoán: {medicalRecord.diagnosis || 'N/A'}</p>
            <hr />

            {/* Form tìm kiếm và thêm thuốc */}
            <Card className="p-4 shadow-sm mb-4">
                <Card.Title className="mb-3">Thêm thuốc vào đơn</Card.Title>
                <Row className="mb-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Chọn thuốc</Form.Label>
                            <Form.Select
                                value={selectedMedicine ? selectedMedicine.id : ''}
                                onChange={(e) => setSelectedMedicine(medicines.find(med => med.id == e.target.value))}
                            >
                                <option value="">-- Chọn thuốc --</option>
                                {medicines.map(med => (
                                    <option key={med.id} value={med.id}>
                                        {med.name} ({med.concentration || med.unit}) - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(med.price)}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Số lượng</Form.Label>
                            <Form.Control type="number" value={currentItemQuantity} onChange={(e) => setCurrentItemQuantity(e.target.value)} min="1" />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Liều dùng</Form.Label>
                            <Form.Control type="text" value={currentItemDosage} onChange={(e) => setCurrentItemDosage(e.target.value)} placeholder="Ví dụ: 1 viên/ngày" />
                        </Form.Group>
                    </Col>
                </Row>
                <Form.Group className="mb-3">
                    <Form.Label>Hướng dẫn sử dụng chi tiết (tùy chọn)</Form.Label>
                    <Form.Control as="textarea" rows={2} value={currentItemInstructions} onChange={(e) => setCurrentItemInstructions(e.target.value)} />
                </Form.Group>
                <Button variant="outline-primary" onClick={handleAddPrescriptionItem} disabled={!selectedMedicine || !currentItemDosage.trim() || !currentItemQuantity || currentItemQuantity <= 0}>
                    Thêm vào đơn
                </Button>
            </Card>

            {/* Bảng các mục thuốc trong đơn */}
            <Card className="p-4 shadow-sm mb-4">
                <Card.Title className="mb-3">Danh sách thuốc trong đơn</Card.Title>
                {prescriptionItems.length > 0 ? (
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên thuốc</th>
                                <th>Hàm lượng</th>
                                <th>Đơn vị</th>
                                <th>Liều dùng</th>
                                <th>Số lượng</th>
                                <th>Thành tiền</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prescriptionItems.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.medicine?.name || 'N/A'}</td>
                                    <td>{item.medicine?.concentration || 'N/A'}</td>
                                    <td>{item.medicine?.unit || 'N/A'}</td>
                                    <td>{item.dosage}</td>
                                    <td>{item.quantity}</td>
                                    <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.quantity * (item.medicine?.price || 0))}</td>
                                    <td>
                                        <Button variant="danger" size="sm" onClick={() => handleRemovePrescriptionItem(index)}>Xóa</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <Alert variant="info">Chưa có thuốc nào trong đơn.</Alert>
                )}
            </Card>

            {/* Ghi chú chung cho đơn và nút Lưu */}
            <Card className="p-4 shadow-sm">
                <Card.Title className="mb-3">Ghi chú đơn thuốc (tùy chọn)</Card.Title>
                <Form.Group className="mb-3">
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        placeholder="Ghi chú chung cho đơn thuốc này..."
                    />
                </Form.Group>
                <Button variant="success" onClick={handleSubmitPrescription} disabled={isSubmitting || prescriptionItems.length === 0}>
                    {isSubmitting ? 'Đang kê đơn...' : 'Kê đơn thuốc'}
                </Button>
            </Card>
        </Container>
    );
};

export default PrescriptionFormPage;