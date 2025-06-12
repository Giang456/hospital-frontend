import React, { useState, useEffect } from 'react';
import { Container, Alert, Spinner, Card, Table, Button } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const DoctorPrescriptionsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const doctorId = user?.id;

    const fetchPrescriptions = async () => {
        if (!doctorId) {
            setLoading(false);
            setError('Không có ID bác sĩ. Vui lòng đăng nhập lại.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Frontend đang lấy tất cả medical records và lọc ra prescriptions từ đó.
            // API là /doctor/medical-records, nó đã tự lọc theo doctor_id của bác sĩ đang đăng nhập.
            // Đảm bảo yêu cầu eager load đủ các mối quan hệ trên MedicalRecord để Prescription có thể truy cập
            const response = await axiosInstance.get('/doctor/medical-records', {
                params: {
                    with: 'patient,doctor,doctor.doctorProfile,appointment.clinic,prescriptions.patient,prescriptions.medicalRecord,prescriptions.items.medicine'
                }
            });
            // Lấy tất cả các đơn thuốc từ các hồ sơ bệnh án của bác sĩ này
            const allPrescriptions = response.data.data.flatMap(record => record.prescriptions || []);
            setPrescriptions(allPrescriptions);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách đơn thuốc.');
            console.error('Error fetching prescriptions:', err);
            setError('Không thể tải danh sách đơn thuốc. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrescriptions();
    }, [doctorId]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const renderPrescriptionCard = (prescription) => {
        // Truy cập thông tin bệnh nhân và lần khám từ đối tượng prescription
        // Vì backend đã eager load prescriptions.patient và prescriptions.medicalRecord
        const patientName = prescription.patient?.name || 'N/A';
        const patientEmail = prescription.patient?.email || 'N/A';
        const medicalRecordVisitDate = prescription.medical_record?.visit_date; // Lấy từ medical_record của prescription

        return (
            <Card key={prescription.id} className="mb-3 shadow-sm">
                <Card.Body>
                    <Card.Title>Đơn thuốc ngày: {prescription.date_prescribed ? format(new Date(prescription.date_prescribed), 'dd/MM/yyyy') : 'N/A'}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        Bệnh nhân: {patientName} ({patientEmail}) - Lần khám: {medicalRecordVisitDate ? format(new Date(medicalRecordVisitDate), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </Card.Subtitle>
                    {prescription.notes && <Card.Text>Ghi chú đơn thuốc: {prescription.notes}</Card.Text>}
                    
                    <h5>Chi tiết thuốc:</h5>
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
                </Card.Body>
            </Card>
        );
    };

    return (
        <Container className="my-4">
            <h2>Danh sách đơn thuốc đã kê</h2>
            {loading ? (
                <div className="text-center"><Spinner animation="border" /></div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : prescriptions.length > 0 ? (
                prescriptions.map(renderPrescriptionCard)
            ) : (
                <Alert variant="info">Bạn chưa kê đơn thuốc nào.</Alert>
            )}
        </Container>
    );
};

export default DoctorPrescriptionsPage;