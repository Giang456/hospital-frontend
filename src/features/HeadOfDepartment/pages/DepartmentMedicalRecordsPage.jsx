import React, { useState, useEffect } from 'react';
import { Container, Alert, Spinner, Card, Button, Form, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const DoctorMedicalRecordsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [patientKeywordFilter, setPatientKeywordFilter] = useState('');
    const [patients, setPatients] = useState([]); // Giữ lại để hiển thị danh sách bệnh nhân đã khám (không dùng để lọc dropdown)

    const doctorId = user?.id;

    const fetchMedicalRecords = async (keywordFilter = '') => {
        if (!doctorId) {
            setLoading(false);
            setError('Không có ID bác sĩ. Vui lòng đăng nhập lại.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const params = {
                with: 'patient,doctor,doctor.doctorProfile,appointment.clinic,prescriptions.items.medicine'
            };
            if (keywordFilter) { // Sử dụng keywordFilter từ tham số hàm
                params.patient_keyword = keywordFilter;
            }

            const response = await axiosInstance.get('/hod/medical-records', { params });
            setMedicalRecords(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách hồ sơ bệnh án.');
            console.error('Error fetching medical records:', err);
            setError('Không thể tải danh sách hồ sơ bệnh án. Vui lòng thử lại.');
            if (err.response && err.response.status === 403) {
                 setError('Bạn không có quyền truy cập chức năng này.');
            } else if (err.response && err.response.status === 404) {
                 setError('Không tìm thấy tài nguyên (lỗi API hoặc URL).');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (doctorId) {
            fetchMedicalRecords(); // Tải dữ liệu ban đầu
            // Phần này để hiển thị danh sách bệnh nhân đã khám (không dùng để lọc dropdown nữa)
            const fetchPatientsForFilter = async () => {
                try {
                    const response = await axiosInstance.get(`/hod/appointments`, {
                        params: { status: 'COMPLETED,PAID', with: 'patient' }
                    });
                    const uniquePatients = [...new Map(response.data.data.map(appt => [appt.patient.id, appt.patient])).values()];
                    setPatients(uniquePatients);
                } catch (err) {
                    console.error('Error fetching patients for filter dropdown:', err);
                }
            };
            fetchPatientsForFilter();
        }
    }, [doctorId]);

    const handleFilter = () => {
        fetchMedicalRecords(patientKeywordFilter); // Gửi giá trị từ ô input
    };

    const handleViewDetails = (recordId) => {
        navigate(`/hod/medical-records/${recordId}/form`);
    };

    const renderMedicalRecordCard = (record) => {
        const doctorName = record.doctor?.name || 'N/A';
        const specialization = record.doctor?.doctor_profile?.specialization || '';
        const doctorInfo = specialization ? `${doctorName} (${specialization})` : doctorName;

        const clinicName = record.appointment?.clinic?.name || 'N/A';
        const roomNumber = record.appointment?.clinic?.room_number || 'N/A';
        const clinicInfo = `${clinicName} (${roomNumber})`;

        return (
            <Card key={record.id} className="mb-3 shadow-sm">
                <Card.Body>
                    <Card.Title>Lần khám ngày: {record.visit_date ? format(new Date(record.visit_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        Bệnh nhân: {record.patient?.name || 'N/A'} ({record.patient?.email || 'N/A'})
                    </Card.Subtitle>
                    <Card.Text>
                        <strong>Bác sĩ khám:</strong> {doctorInfo}
                        <br />
                        <strong>Chẩn đoán:</strong> {record.diagnosis || 'N/A'}
                        <br />
                        <strong>Triệu chứng:</strong> {record.symptoms || 'N/A'}
                        <br />
                        <strong>Phòng khám:</strong> {clinicInfo}
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
            <h2>Hồ sơ bệnh án của tôi</h2>

            <Card className="mb-4 p-3 shadow-sm bg-light">
                <Row className="align-items-end">
                    <Col md={6}>
                        <Form.Group controlId="patientFilter">
                            <Form.Label>Tìm kiếm bệnh nhân</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nhập tên hoặc email bệnh nhân..."
                                value={patientKeywordFilter}
                                onChange={(e) => setPatientKeywordFilter(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6} className="d-flex align-items-end">
                        <Button variant="primary" onClick={handleFilter} className="w-100">
                            Lọc
                        </Button>
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <div className="text-center"><Spinner animation="border" /></div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : medicalRecords.length > 0 ? (
                medicalRecords.map(renderMedicalRecordCard)
            ) : (
                <Alert variant="info">Bạn không có hồ sơ bệnh án nào.</Alert>
            )}
        </Container>
    );
};

export default DoctorMedicalRecordsPage;