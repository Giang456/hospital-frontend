import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Alert, Spinner, Card, Button, Modal, Form, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // KHÔNG CẦN DÒNG NÀY NỮA
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const NurseAppointmentsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('today_approved'); // today_approved, pending_payment, all_active
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State cho Modal cập nhật sinh hiệu/ghi chú
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
    const [vitalsData, setVitalsData] = useState({
        vitals_pulse: '',
        vitals_temperature: '',
        vitals_blood_pressure: '',
        vitals_weight: '',
        vitals_height: '',
        nurse_notes: '',
    });
    const [isUpdatingVitals, setIsUpdatingVitals] = useState(false);


    const fetchAppointments = async (type) => {
        setLoading(true);
        setError(null);
        try {
            let params = {
                with: 'patient,doctor,clinic,medicalRecord' // Luôn eager load medicalRecord
            };
            const today = format(new Date(), 'yyyy-MM-dd');

            switch (type) {
                case 'today_approved': // Lịch hẹn đã phê duyệt cho hôm nay
                    params.status = 'APPROVED';
                    params.date = today;
                    break;
                case 'pending_payment': // Lịch hẹn chờ thanh toán
                    params.status = 'PAYMENT_PENDING';
                    // API backend GET /nurse/payments/pending
                    // Logic này cần được chuyển sang component riêng cho pending payments nếu nó là một trang khác
                    // Hoặc API /nurse/appointments phải hỗ trợ lọc PAYMENT_PENDING
                    // Hiện tại, API /nurse/appointments đã hỗ trợ lọc status=PAYMENT_PENDING
                    break;
                case 'all_active': // Tất cả lịch hẹn active (sắp tới, chờ duyệt, hoàn thành, chờ TT)
                    params.status = 'PENDING_APPROVAL,APPROVED,COMPLETED,PAYMENT_PENDING';
                    params.start_date = today; // Lấy từ hôm nay trở đi
                    break;
                default: break;
            }

            // Gọi API /nurse/appointments
            const response = await axiosInstance.get('/nurse/appointments', { params });
            setAppointments(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách lịch hẹn.');
            console.error('Error fetching nurse appointments:', err);
            setError('Không thể tải danh sách lịch hẹn. Vui lòng thử lại.');
            if (err.response && err.response.status === 403) {
                 setError('Bạn không có quyền truy cập chức năng này.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments(activeTab);
    }, [activeTab, user]);

    const handleOpenVitalsModal = (appointment) => {
        if (!appointment.medical_record) {
            toast.error('Lịch hẹn này chưa có hồ sơ bệnh án. Vui lòng liên hệ bác sĩ.');
            return;
        }
        setSelectedMedicalRecord(appointment.medical_record);
        setVitalsData({
            vitals_pulse: appointment.medical_record.vitals_pulse || '',
            vitals_temperature: appointment.medical_record.vitals_temperature || '',
            vitals_blood_pressure: appointment.medical_record.vitals_blood_pressure || '',
            vitals_weight: appointment.medical_record.vitals_weight || '',
            vitals_height: appointment.medical_record.vitals_height || '',
            nurse_notes: appointment.medical_record.nurse_notes || '',
        });
        setShowVitalsModal(true);
    };

    const handleUpdateVitals = async () => {
        if (!selectedMedicalRecord) return;

        setIsUpdatingVitals(true);
        try {
            const response = await axiosInstance.patch(`/nurse/medical-records/${selectedMedicalRecord.id}/vitals`, vitalsData);
            toast.success(response.data.message || 'Cập nhật sinh hiệu thành công!');
            setShowVitalsModal(false);
            fetchAppointments(activeTab);
        } catch (err) {
            console.error('Error updating vitals:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else {
                toast.error(err.response.data.message || 'Đã xảy ra lỗi khi cập nhật sinh hiệu.');
            }
        } finally {
            setIsUpdatingVitals(false);
        }
    };

    const renderAppointmentCard = (appointment) => (
        <Card key={appointment.id} className="mb-3 shadow-sm">
            <Card.Body>
                <Card.Title>Bệnh nhân: {appointment.patient?.name || 'N/A'}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                    Bác sĩ: {appointment.doctor?.name || 'N/A'} - Phòng khám: {appointment.clinic?.name || 'N/A'}
                </Card.Subtitle>
                <Card.Text>
                    Thời gian: {appointment.appointment_date} {appointment.appointment_time?.substring(0, 5)}
                    <br />
                    Lý do khám: {appointment.reason || 'N/A'}
                    <br />
                    Trạng thái: <strong>{appointment.status}</strong>
                </Card.Text>
                <div className="d-flex justify-content-end gap-2">
                    {/* Nút cập nhật sinh hiệu chỉ khi đã có medical_record */}
                    {appointment.medical_record && (
                        <Button variant="outline-primary" onClick={() => handleOpenVitalsModal(appointment)}>
                            Cập nhật Sinh hiệu
                        </Button>
                    )}
                    {/* Nút để chuyển hướng đến trang thanh toán nếu trạng thái là PAYMENT_PENDING */}
                    {appointment.status === 'PAYMENT_PENDING' && (
                        <Button variant="success" onClick={() => navigate(`/nurse/payments/${appointment.id}/process`)}>
                            Xử lý Thanh toán
                        </Button>
                    )}
                </div>
            </Card.Body>
        </Card>
    );

    return (
        <Container className="my-4">
            <h2>Hỗ trợ Quy trình Khám bệnh</h2>
            <Tabs
                id="nurse-appointments-tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
            >
                <Tab eventKey="today_approved" title="Lịch hẹn hôm nay">
                    {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Không có lịch hẹn hôm nay cần hỗ trợ.</Alert>
                    )}
                </Tab>
                <Tab eventKey="pending_payment" title="Chờ Thanh toán">
                     {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch hẹn nào đang chờ thanh toán.</Alert>
                    )}
                </Tab>
                <Tab eventKey="all_active" title="Tất cả lịch active">
                     {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch hẹn active nào.</Alert>
                    )}
                </Tab>
            </Tabs>

            {/* Modal cập nhật sinh hiệu */}
            <Modal show={showVitalsModal} onHide={() => setShowVitalsModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Cập nhật Sinh hiệu & Ghi chú điều dưỡng</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p><strong>Bệnh nhân:</strong> {selectedMedicalRecord?.patient?.name}</p>
                    <p><strong>Ngày khám:</strong> {selectedMedicalRecord?.visit_date ? format(new Date(selectedMedicalRecord.visit_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</p>
                    <Form>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Mạch (bpm)</Form.Label>
                                    <Form.Control type="text" value={vitalsData.vitals_pulse} onChange={(e) => setVitalsData({...vitalsData, vitals_pulse: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nhiệt độ (°C)</Form.Label>
                                    <Form.Control type="text" value={vitalsData.vitals_temperature} onChange={(e) => setVitalsData({...vitalsData, vitals_temperature: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Huyết áp (mmHg)</Form.Label>
                                    <Form.Control type="text" value={vitalsData.vitals_blood_pressure} onChange={(e) => setVitalsData({...vitalsData, vitals_blood_pressure: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cân nặng (kg)</Form.Label>
                                    <Form.Control type="text" value={vitalsData.vitals_weight} onChange={(e) => setVitalsData({...vitalsData, vitals_weight: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Chiều cao (cm)</Form.Label>
                            <Form.Control type="text" value={vitalsData.vitals_height} onChange={(e) => setVitalsData({...vitalsData, vitals_height: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ghi chú điều dưỡng</Form.Label>
                            <Form.Control as="textarea" rows={3} value={vitalsData.nurse_notes} onChange={(e) => setVitalsData({...vitalsData, nurse_notes: e.target.value})} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowVitalsModal(false)}>
                        Hủy
                    </Button>
                    <Button variant="primary" onClick={handleUpdateVitals} disabled={isUpdatingVitals}>
                        {isUpdatingVitals ? 'Đang cập nhật...' : 'Cập nhật'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default NurseAppointmentsPage;