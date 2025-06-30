import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Alert, Spinner, Card, Button, Modal, Form } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Hàm chuyển trạng thái sang tiếng Việt
const getStatusLabel = (status) => {
    switch (status) {
        case 'PENDING_APPROVAL':
            return 'Chờ phê duyệt';
        case 'APPROVED':
            return 'Đã phê duyệt';
        case 'CANCELLED':
            return 'Đã hủy';
        case 'CANCELLED_BY_PATIENT':
            return 'Bệnh nhân hủy';
        case 'PAYMENT_PENDING':
            return 'Chờ thanh toán';
        case 'PAID':
            return 'Đã thanh toán';
        case 'REJECTED':
            return 'Bị từ chối';
        case 'COMPLETED':
            return 'Đã hoàn thành';
        default:
            return status;
    }
};

const PatientAppointmentsPage = () => {
    const [activeTab, setActiveTab] = useState('upcoming');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppointmentToCancel, setSelectedAppointmentToCancel] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const fetchAppointments = async (type) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/patient/appointments', {
                params: { type: type, with: 'doctor.doctorProfile,clinic' } // Yêu cầu backend eager load doctorProfile
            });
            setAppointments(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách lịch hẹn.');
            console.error('Error fetching appointments:', err);
            setError('Không thể tải danh sách lịch hẹn. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments(activeTab);
    }, [activeTab]);

    const handleCancelClick = (appointment) => {
        setSelectedAppointmentToCancel(appointment);
        setShowCancelModal(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedAppointmentToCancel) return;

        setIsCancelling(true);
        try {
            const payload = {
                cancellation_check: 'ok',
                cancellation_reason: cancelReason,
            };
            const response = await axiosInstance.patch(`/patient/appointments/${selectedAppointmentToCancel.id}/cancel`, payload);
            toast.success(response.data.message || 'Hủy lịch hẹn thành công!');
            fetchAppointments(activeTab);
            setShowCancelModal(false);
            setSelectedAppointmentToCancel(null);
            setCancelReason('');
        } catch (err) {
            console.error('Error cancelling appointment:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else if (!err.response) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi không xác định khi hủy lịch. Vui lòng thử lại.');
            }
        } finally {
            setIsCancelling(false);
        }
    };

    const renderAppointmentCard = (appointment) => {
        const doctorName = appointment.doctor?.name || 'N/A';
        const specialization = appointment.doctor?.doctor_profile?.specialization || ''; // Có thể rỗng nếu không có profile
        const doctorInfo = specialization ? `${doctorName} - ${specialization}` : doctorName;

        return (
            <Card key={appointment.id} className="mb-3 shadow-sm">
                <Card.Body>
                    <Card.Title>{appointment.reason || 'Lý do khám chưa cập nhật'}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        Bác sĩ: {doctorInfo}
                    </Card.Subtitle>
                    <Card.Text>
                        Thời gian: {appointment.appointment_date} {appointment.appointment_time?.substring(0, 5)}
                        <br />
                        Phòng khám: {appointment.clinic?.name || 'N/A'} ({appointment.clinic?.room_number ? `Phòng ${appointment.clinic.room_number}` : 'N/A'})
                        <br />
                        Trạng thái: <strong>{getStatusLabel(appointment.status)}</strong>
                        {appointment.cancellation_reason && <p className="text-danger mt-2">Lý do hủy/từ chối: {appointment.cancellation_reason}</p>}
                    </Card.Text>
                    {/* Nút hủy chỉ hiển thị nếu lịch hẹn có thể hủy */}
                    {(appointment.status === 'PENDING_APPROVAL' || appointment.status === 'APPROVED') && (
                        <Button variant="danger" onClick={() => handleCancelClick(appointment)}>
                            Hủy lịch hẹn
                        </Button>
                    )}
                </Card.Body>
            </Card>
        );
    };

    return (
        <Container className="my-4">
            <h2>Lịch hẹn của tôi</h2>
            <Tabs
                id="patient-appointments-tabs"
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
                <Tab eventKey="history" title="Lịch sử">
                     {loading ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : appointments.length > 0 ? (
                        appointments.map(renderAppointmentCard)
                    ) : (
                        <Alert variant="info">Bạn không có lịch sử khám nào.</Alert>
                    )}
                </Tab>
            </Tabs>

            {/* Modal xác nhận hủy lịch */}
            <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Xác nhận hủy lịch hẹn</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Bạn có chắc chắn muốn hủy lịch hẹn vào ngày {selectedAppointmentToCancel?.appointment_date} lúc {selectedAppointmentToCancel?.appointment_time?.substring(0, 5)} với Bác sĩ {selectedAppointmentToCancel?.doctor?.name} không?
                    <Form.Group className="mt-3">
                        <Form.Label>Lý do hủy (tùy chọn):</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Nhập lý do hủy (ví dụ: bận đột xuất, thay đổi kế hoạch)"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
                        Đóng
                    </Button>
                    <Button variant="danger" onClick={handleConfirmCancel} disabled={isCancelling}>
                        {isCancelling ? 'Đang hủy...' : 'Hủy lịch hẹn'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PatientAppointmentsPage;