import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Alert, Spinner, Card, Button, Modal, Form } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DoctorAppointmentsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, pending, completed_paid, cancelled
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State cho Modal xác nhận hành động
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [actionType, setActionType] = useState(''); // approve, reject, cancel, complete
    const [actionReason, setActionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const doctorId = user?.id;

    const fetchAppointments = async (type) => {
        if (!doctorId) {
            setLoading(false);
            setError('Không có ID bác sĩ. Vui lòng đăng nhập lại.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            let statusFilter = [];
            let params = {
                doctor_id: doctorId, // Đảm bảo doctor_id LUÔN ĐƯỢC GỬI
                with: 'patient,clinic,doctor.doctorProfile,medicalRecord' // Eager load các mối quan hệ
            };

            switch (type) {
                case 'upcoming':
                    statusFilter = ['PENDING_APPROVAL', 'APPROVED'];
                    params.status = statusFilter.join(',');
                    params.start_date = format(new Date(), 'yyyy-MM-dd'); // Lấy lịch từ hôm nay trở đi
                    break;
                case 'pending':
                    statusFilter = ['PENDING_APPROVAL'];
                    params.status = statusFilter.join(',');
                    break;
                case 'completed_paid':
                    statusFilter = ['COMPLETED', 'PAYMENT_PENDING', 'PAID'];
                    params.status = statusFilter.join(',');
                    params.end_date = format(new Date(), 'yyyy-MM-dd'); // Lấy lịch đến hôm nay trở về trước
                    break;
                case 'cancelled':
                    statusFilter = ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_STAFF', 'REJECTED'];
                    params.status = statusFilter.join(',');
                    params.end_date = format(new Date(), 'yyyy-MM-dd');
                    break;
                default: break;
            }

            const response = await axiosInstance.get('/doctor/appointments', { params });
            setAppointments(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách lịch hẹn.');
            console.error('Error fetching appointments:', err);
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
    }, [activeTab, doctorId]);

    const handleActionClick = (appointment, type) => {
        setSelectedAppointment(appointment);
        setActionType(type);
        setActionReason(''); // Reset lý do
        setShowActionModal(true);
    };

    // Hàm xử lý nút "Bắt đầu Khám"
    const handleStartExam = (appointment) => {
        // Điều hướng đến trang MedicalRecordFormPage với appointmentId
        if (appointment.medical_record) {
            navigate(`/doctor/medical-records/${appointment.medical_record.id}`); // Trang chi tiết hồ sơ bệnh án đã có
        } else {
            // Nếu chưa có, điều hướng đến trang TẠO MỚI hồ sơ bệnh án
            navigate(`/doctor/medical-records/${appointment.id}/create`); // Route mới cho tạo hồ sơ bệnh án
        }
    };

    const handleConfirmAction = async () => {
        if (!selectedAppointment) return;

        setIsProcessing(true);
        try {
            const payload = {
                cancellation_reason: actionReason,
            };

            let successMessage = '';
            let newStatusToSend = '';

            switch (actionType) {
                case 'approve':
                    newStatusToSend = 'APPROVED';
                    successMessage = 'Lịch hẹn đã được phê duyệt!';
                    break;
                case 'reject':
                    newStatusToSend = 'REJECTED';
                    if (!actionReason.trim()) { toast.error('Lý do từ chối là bắt buộc.'); setIsProcessing(false); return; }
                    successMessage = 'Lịch hẹn đã bị từ chối.';
                    break;
                case 'cancel':
                    newStatusToSend = 'CANCELLED_BY_DOCTOR';
                    if (!actionReason.trim()) { toast.error('Lý do hủy là bắt buộc.'); setIsProcessing(false); return; }
                    successMessage = 'Lịch hẹn đã bị hủy.';
                    break;
                default:
                    toast.error('Hành động không hợp lệ.');
                    setIsProcessing(false);
                    return;
            }
            payload.status = newStatusToSend; // Gán trạng thái vào payload

            const response = await axiosInstance.patch(`/doctor/appointments/${selectedAppointment.id}/status`, payload);
            toast.success(response.data.message || successMessage);
            fetchAppointments(activeTab); // Tải lại danh sách sau khi hành động
            setShowActionModal(false);
            setSelectedAppointment(null);
            setActionReason('');
        } catch (err) {
            console.error('Error processing appointment action:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                toast.error(err.response.data.message);
            } else {
                toast.error('Đã xảy ra lỗi khi xử lý lịch hẹn. Vui lòng thử lại.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const renderAppointmentCard = (appointment) => (
        <Card key={appointment.id} className="mb-3 shadow-sm">
            <Card.Body>
                <Card.Title>{appointment.reason || 'Lý do khám chưa cập nhật'}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                    Bệnh nhân: {appointment.patient?.name || 'N/A'} - Email: {appointment.patient?.email || 'N/A'}
                </Card.Subtitle>
                <Card.Text>
                    Thời gian: {appointment.appointment_date} {appointment.appointment_time?.substring(0, 5)}
                    <br />
                    Phòng khám: {appointment.clinic?.name || 'N/A'} ({appointment.clinic?.room_number ? `Phòng ${appointment.clinic.room_number}` : 'N/A'})
                    <br />
                    Trạng thái: <strong>{appointment.status}</strong>
                    {appointment.cancellation_reason && <p className="text-danger mt-2">Lý do hủy/từ chối: {appointment.cancellation_reason}</p>}
                </Card.Text>
                <div className="d-flex justify-content-end gap-2">
                    {/* Các nút hành động tùy thuộc vào trạng thái */}
                    {appointment.status === 'PENDING_APPROVAL' && (
                        <>
                            <Button variant="success" onClick={() => handleActionClick(appointment, 'approve')}>
                                Phê duyệt
                            </Button>
                            <Button variant="danger" onClick={() => handleActionClick(appointment, 'reject')}>
                                Từ chối
                            </Button>
                        </>
                    )}
                    {appointment.status === 'APPROVED' && (
                        <>
                            <Button variant="primary" onClick={() => handleStartExam(appointment)}>
                                {appointment.medical_record ? 'Xem chi tiết khám' : 'Bắt đầu Khám'}
                            </Button>
                            <Button variant="warning" onClick={() => handleActionClick(appointment, 'cancel')}>
                                Hủy lịch
                            </Button>
                        </>
                    )}
                </div>
            </Card.Body>
        </Card>
    );

    return (
        <Container className="my-4">
            <h2>Lịch hẹn của tôi</h2>
            <Tabs
                id="doctor-appointments-tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
            >
                <Tab eventKey="upcoming" title="Sắp tới">
                    {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch hẹn sắp tới nào.</Alert>
                    )}
                </Tab>
                <Tab eventKey="pending" title="Chờ phê duyệt">
                    {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch hẹn nào đang chờ phê duyệt.</Alert>
                    )}
                </Tab>
                <Tab eventKey="completed_paid" title="Đã hoàn thành/Thanh toán">
                    {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch hẹn đã hoàn thành nào.</Alert>
                    )}
                </Tab>
                <Tab eventKey="cancelled" title="Đã hủy/Từ chối">
                    {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch hẹn đã hủy hoặc từ chối nào.</Alert>
                    )}
                </Tab>
            </Tabs>

            {/* Modal xác nhận hành động */}
            <Modal show={showActionModal} onHide={() => setShowActionModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {actionType === 'approve' ? 'Phê duyệt lịch hẹn' :
                            actionType === 'reject' ? 'Từ chối lịch hẹn' :
                                actionType === 'cancel' ? 'Hủy lịch hẹn' : ''}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Bạn có chắc chắn muốn {actionType === 'approve' ? 'phê duyệt' :
                            actionType === 'reject' ? 'từ chối' :
                                actionType === 'cancel' ? 'hủy' : ''} lịch hẹn của bệnh nhân <strong>{selectedAppointment?.patient?.name}</strong> vào ngày <strong>{selectedAppointment?.appointment_date}</strong> lúc <strong>{selectedAppointment?.appointment_time?.substring(0, 5)}</strong> không?
                    </p>
                    {(actionType === 'reject' || actionType === 'cancel') && (
                        <Form.Group className="mt-3">
                            <Form.Label>Lý do {actionType === 'reject' ? 'từ chối' : 'hủy'} (bắt buộc):</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Nhập lý do..."
                            />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowActionModal(false)}>
                        Hủy
                    </Button>
                    <Button variant={actionType === 'approve' ? 'success' : 'danger'} onClick={handleConfirmAction} disabled={isProcessing}>
                        {isProcessing ? 'Đang xử lý...' : (
                            actionType === 'approve' ? 'Phê duyệt' :
                                actionType === 'reject' ? 'Từ chối' :
                                    actionType === 'cancel' ? 'Hủy lịch' : ''
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DoctorAppointmentsPage;