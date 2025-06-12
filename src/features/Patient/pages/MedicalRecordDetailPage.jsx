import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Alert, Spinner, Card, ListGroup, Table, Button } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA
import { format } from 'date-fns';

const MedicalRecordDetailPage = () => {
    const { id: recordId } = useParams();
    const navigate = useNavigate();
    const [medicalRecord, setMedicalRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMedicalRecordDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                // Yêu cầu backend eager load doctor.doctorProfile, appointment.clinic, prescriptions.items.medicine
                const response = await axiosInstance.get(`/patient/medical-records/${recordId}`, {
                    params: { with: 'doctor.doctorProfile,appointment.clinic,prescriptions.items.medicine' }
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

        if (recordId) {
            fetchMedicalRecordDetails();
        }
    }, [recordId]);

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
                <Button variant="secondary" onClick={() => navigate('/patient/medical-records')} className="mt-3">
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
        // XÓA BỌC MainLayout TRỰC TIẾP TẠI ĐÂY
        <Container className="my-4">
            <Button variant="secondary" onClick={() => navigate('/patient/medical-records')} className="mb-3">
                ← Quay lại lịch sử khám
            </Button>

            <Card className="p-4 shadow-sm mb-4">
                <Card.Title className="mb-3">
                    <h2>Hồ sơ bệnh án - Lần khám {medicalRecord.visit_date ? format(new Date(medicalRecord.visit_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</h2>
                </Card.Title>
                <ListGroup variant="flush">
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
                                        <th>Liều dùng</th>
                                        <th>Số lượng</th>
                                        <th>Hướng dẫn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescription.items && prescription.items.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.medicine?.name || 'N/A'}</td>
                                            <td>{item.medicine?.concentration || 'N/A'}</td>
                                            <td>{item.medicine?.unit || 'N/A'}</td>
                                            <td>{item.dosage}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.instructions || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ))}
                </Card>
            )}
        </Container>
    );
};

export default MedicalRecordDetailPage;