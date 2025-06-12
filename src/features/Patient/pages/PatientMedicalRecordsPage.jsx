import React, { useState, useEffect } from 'react';
import { Container, Alert, Spinner, Card, Button, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const PatientMedicalRecordsPage = () => {
    const navigate = useNavigate();
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMedicalRecords = async () => {
        setLoading(true);
        setError(null);
        try {
            // Yêu cầu backend eager load doctor.doctorProfile và appointment.clinic
            const response = await axiosInstance.get('/patient/medical-records', {
                params: { with: 'doctor.doctorProfile,appointment.clinic' }
            });
            setMedicalRecords(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải lịch sử khám.');
            console.error('Error fetching medical records:', err);
            setError(err.response?.data?.message || 'Không thể tải lịch sử khám. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedicalRecords();
    }, []);

    const handleViewDetails = (recordId) => {
        navigate(`/patient/medical-records/${recordId}`); // Chuyển đến trang chi tiết
    };

    const renderMedicalRecordCard = (record) => {
        const doctorName = record.doctor?.name || 'N/A';
        const specialization = record.doctor?.doctor_profile?.specialization || '';
        const doctorInfo = specialization ? `${doctorName} (${specialization})` : doctorName;

        return (
            <Card key={record.id} className="mb-3 shadow-sm">
                <Card.Body>
                    <Card.Title>Lần khám ngày: {record.visit_date ? format(new Date(record.visit_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        Bác sĩ: {doctorInfo}
                    </Card.Subtitle>
                    <Card.Text>
                        <strong>Chẩn đoán:</strong> {record.diagnosis || 'N/A'}
                        <br />
                        <strong>Triệu chứng:</strong> {record.symptoms || 'N/A'}
                        <br />
                        <strong>Phòng khám:</strong> {record.appointment?.clinic?.name || 'N/A'} ({record.appointment?.clinic?.room_number || 'N/A'})
                    </Card.Text>
                    <Button variant="outline-primary" onClick={() => handleViewDetails(record.id)}>
                        Xem chi tiết
                    </Button>
                </Card.Body>
            </Card>
        );
    };

    return (
            <Container className="my-4">
                <h2>Hồ sơ sức khỏe của tôi</h2>
                {loading ? (
                    <div className="text-center"><Spinner animation="border" /></div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : medicalRecords.length > 0 ? (
                    medicalRecords.map(renderMedicalRecordCard)
                ) : (
                    <Alert variant="info">Bạn không có hồ sơ sức khỏe nào.</Alert>
                )}
            </Container>
    );
};

export default PatientMedicalRecordsPage;