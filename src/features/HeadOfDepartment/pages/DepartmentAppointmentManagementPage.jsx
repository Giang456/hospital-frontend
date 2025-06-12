import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Button, Spinner, Alert, Tabs, Tab, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns'; // Đảm bảo parseISO được import
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema validation cho lý do từ chối/hủy
const reasonSchema = z.object({
    cancellation_reason: z.string().min(1, 'Lý do là bắt buộc.').max(500, 'Lý do không được quá 500 ký tự.'),
});


const DepartmentAppointmentManagementPage = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true); // Loading chính cho danh sách appointments
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('PENDING_APPROVAL'); // Mặc định tab chờ phê duyệt

    const [doctors, setDoctors] = useState([]); // Danh sách bác sĩ trong khoa để lọc
    const [loadingDoctors, setLoadingDoctors] = useState(true); // State loading riêng cho doctors

    // Filters
    const [filterDoctorId, setFilterDoctorId] = useState('');
    const [filterDate, setFilterDate] = useState(null);

    // Modal states
    const [showActionModal, setShowActionModal] = useState(false);
    const [currentAppointment, setCurrentAppointment] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approve', 'reject', 'cancel'

    // Form cho lý do từ chối/hủy
    const {
        register,
        handleSubmit: handleReasonSubmit, // Đổi tên để tránh nhầm lẫn
        formState: { errors: reasonErrors, isSubmitting: isReasonFormSubmitting },
        reset: resetReasonForm,
        // setError: setReasonFormError, // Không thấy dùng
        clearErrors: clearReasonErrors
    } = useForm({
        resolver: zodResolver(reasonSchema),
        defaultValues: { cancellation_reason: '' }
    });

    // Fetch danh sách bác sĩ trong khoa (chỉ một lần khi component mount)
    const fetchDepartmentDoctors = useCallback(async () => {
        setLoadingDoctors(true);
        try {
            const doctorsRes = await axiosInstance.get('/hod/staff'); // API này cần trả về users với roles
            const staffList = doctorsRes.data.data || [];
            setDoctors(
                staffList.filter(u =>
                    u.roles && u.roles.some(role =>
                        ['DOCTOR', 'HEAD_OF_DEPARTMENT'].includes(typeof role === 'string' ? role : role.name)
                    )
                )
            );
        } catch (err) {
            toast.error('Lỗi khi tải danh sách bác sĩ trong khoa.');
            console.error('Error fetching department doctors:', err);
        } finally {
            setLoadingDoctors(false);
        }
    }, []); // Mảng dependency rỗng

    useEffect(() => {
        fetchDepartmentDoctors();
    }, [fetchDepartmentDoctors]);


    // Fetch danh sách lịch hẹn
    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                status: activeTab, // Backend sẽ filter theo trạng thái này cho khoa của HOD
                with: 'patient,doctor.doctorProfile,clinic' // Luôn eager load
            };
            if (filterDoctorId) params.doctor_id = filterDoctorId;
            if (filterDate) params.date = format(filterDate, 'yyyy-MM-dd');

            const response = await axiosInstance.get('/hod/appointments', { params });
            setAppointments(response.data.data || []);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách lịch hẹn khoa.');
            console.error('Error fetching HOD appointments:', err.response?.data || err);
            setError(err.response?.data?.message || 'Không thể tải dữ liệu.');
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, filterDoctorId, filterDate]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);


    const handleShowActionModal = (appointment, action) => {
        setCurrentAppointment(appointment);
        setActionType(action);
        setShowActionModal(true);
        resetReasonForm({ cancellation_reason: appointment?.cancellation_reason || '' }); // Đặt lại lý do nếu có
        clearReasonErrors();
    };

    const handleCloseActionModal = () => {
        setShowActionModal(false);
        setCurrentAppointment(null);
        setActionType('');
        resetReasonForm();
    };

    // Hàm này được gọi bởi nút "Phê duyệt" hoặc khi form lý do (cho từ chối/hủy) được submit
    const handleActionSubmit = async (formDataIfRejectOrCancel = {}) => {
        if (!currentAppointment) return;

        // Sử dụng isReasonFormSubmitting cho nút submit của form lý do
        // và cho nút Phê duyệt (vì không có form riêng cho nó)
        // Nếu muốn state riêng cho nút Phê duyệt, cần thêm useState isApproving
        // Hiện tại, dùng isReasonFormSubmitting chung (hoặc một state isProcessingAction riêng)

        try {
            const payload = {};
            if (actionType === 'approve') {
                payload.status = 'APPROVED';
            } else if (actionType === 'reject') {
                payload.status = 'REJECTED';
                payload.cancellation_reason = formDataIfRejectOrCancel.cancellation_reason;
            } else if (actionType === 'cancel') {
                payload.status = 'CANCELLED_BY_STAFF'; // Hoặc tên trạng thái phù hợp
                payload.cancellation_reason = formDataIfRejectOrCancel.cancellation_reason;
            } else {
                return; // Hành động không hợp lệ
            }

            const response = await axiosInstance.patch(`/hod/appointments/${currentAppointment.id}/status`, payload);
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchAppointments(); // Tải lại danh sách
            handleCloseActionModal();
        } catch (err) {
            console.error(`Error ${actionType}ing appointment:`, err.response?.data || err);
            if (err.response?.data?.errors) {
                // Nếu lỗi validation từ backend cho lý do
                Object.keys(err.response.data.errors).forEach(key => {
                    if (key === 'cancellation_reason') {
                         setFormError('cancellation_reason', { type: 'server', message: err.response.data.errors[key][0] });
                    }
                });
            } else {
                toast.error(err.response?.data?.message || `Không thể thực hiện thao tác.`);
            }
        }
    };


    const renderAppointmentCard = (appointment) => {
        const doctorName = appointment.doctor?.name || 'N/A';
        const specialization = appointment.doctor?.doctor_profile?.specialization || '';
        const doctorInfo = specialization ? `${doctorName} (${specialization})` : doctorName;

        return (
            <Card key={appointment.id} className="mb-3 shadow-sm">
                <Card.Body>
                    <Card.Title>BN: {appointment.patient?.name || 'N/A'} - Lý do: {appointment.reason || 'Chưa cập nhật'}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        Bác sĩ: {doctorInfo}
                    </Card.Subtitle>
                    <Card.Text>
                        Thời gian: {appointment.appointment_date ? format(parseISO(appointment.appointment_date), 'dd/MM/yyyy') : 'N/A'} {appointment.appointment_time?.substring(0, 5)}
                        <br />
                        Phòng khám: {appointment.clinic?.name || 'N/A'} ({appointment.clinic?.room_number ? `Phòng ${appointment.clinic.room_number}` : 'N/A'})
                        <br />
                        Trạng thái: <span className={`fw-bold text-${appointment.status === 'APPROVED' ? 'success' : ['REJECTED', 'CANCELLED_BY_STAFF', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_PATIENT'].includes(appointment.status) ? 'danger' : 'warning'}`}>{appointment.status}</span>
                        {appointment.cancellation_reason && <p className="text-danger mt-1 mb-0"><small>Lý do hủy/từ chối: {appointment.cancellation_reason}</small></p>}
                    </Card.Text>
                    {/* Nút hành động */}
                    {(appointment.status === 'PENDING_APPROVAL') && (
                        <div className="mt-2">
                            <Button variant="success" size="sm" className="me-2" onClick={() => handleShowActionModal(appointment, 'approve')} disabled={isReasonFormSubmitting}>Phê duyệt</Button>
                            <Button variant="danger" size="sm" onClick={() => handleShowActionModal(appointment, 'reject')} disabled={isReasonFormSubmitting}>Từ chối</Button>
                        </div>
                    )}
                    {(appointment.status === 'APPROVED') && (
                        <div className="mt-2">
                             <Button variant="warning" size="sm" onClick={() => handleShowActionModal(appointment, 'cancel')} disabled={isReasonFormSubmitting}>Hủy lịch</Button>
                        </div>
                    )}
                </Card.Body>
            </Card>
        );
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Lịch hẹn Khoa</h2>
                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={5}>
                            <Form.Group controlId="filterDoctor">
                                <Form.Label>Bác sĩ trong khoa</Form.Label>
                                <Form.Select value={filterDoctorId} onChange={(e) => setFilterDoctorId(e.target.value)}>
                                    <option value="">Tất cả bác sĩ</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} {doc.roles && doc.roles.length > 0 && `(${(typeof doc.roles[0] === 'string' ? doc.roles[0] : doc.roles[0]?.name) || 'N/A'})`}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="filterDate">
                                <Form.Label>Ngày hẹn</Form.Label>
                                <DatePicker selected={filterDate} onChange={(date) => setFilterDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable />
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Button variant="secondary" onClick={() => { setFilterDoctorId(''); setFilterDate(null); }} className="w-100">Reset Lọc</Button>
                        </Col>
                    </Row>
                </Card>

                {loading && <div className="text-center my-3"><Spinner animation="border" size="sm"/> Đang tải lịch hẹn...</div>}
                {!loading && error && <Alert variant="danger">{error}</Alert>}

                {!loading && !error && (
                    <Tabs id="hod-appointment-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                        <Tab eventKey="PENDING_APPROVAL" title="Chờ duyệt">
                            {appointments.length > 0 ? appointments.map(renderAppointmentCard) : <Alert variant="info">Không có lịch hẹn nào.</Alert>}
                        </Tab>
                        <Tab eventKey="APPROVED" title="Đã duyệt">
                             {appointments.length > 0 ? appointments.map(renderAppointmentCard) : <Alert variant="info">Không có lịch hẹn nào.</Alert>}
                        </Tab>
                        <Tab eventKey="COMPLETED" title="Hoàn thành">
                             {appointments.length > 0 ? appointments.map(renderAppointmentCard) : <Alert variant="info">Không có lịch hẹn nào.</Alert>}
                        </Tab>
                        <Tab eventKey="PAID" title="Đã thanh toán">
                             {appointments.length > 0 ? appointments.map(renderAppointmentCard) : <Alert variant="info">Không có lịch hẹn nào.</Alert>}
                        </Tab>
                        <Tab eventKey="CANCELLED_REJECTED" title="Hủy/Từ chối"> {/* Gộp lại cho dễ nhìn */}
                             {appointments.length > 0 ? appointments.map(renderAppointmentCard) : <Alert variant="info">Không có lịch hẹn nào.</Alert>}
                        </Tab>
                    </Tabs>
                )}

                <Modal show={showActionModal} onHide={handleCloseActionModal} backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {actionType === 'approve' ? 'Phê duyệt Lịch hẹn' :
                             actionType === 'reject' ? 'Từ chối Lịch hẹn' :
                             'Hủy Lịch hẹn'}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {currentAppointment && (
                            <>
                                <p>Bạn có muốn {actionType === 'approve' ? 'phê duyệt' : (actionType === 'reject' ? 'từ chối' : 'hủy')} lịch hẹn của bệnh nhân <strong>{currentAppointment.patient?.name}</strong> với bác sĩ <strong>{currentAppointment.doctor?.name}</strong> vào lúc {currentAppointment.appointment_time?.substring(0,5)} ngày {currentAppointment.appointment_date ? format(parseISO(currentAppointment.appointment_date), 'dd/MM/yyyy') : ''}?</p>
                                <p><em>Lý do khám: {currentAppointment.reason}</em></p>

                                {(actionType === 'reject' || actionType === 'cancel') && (
                                    <Form onSubmit={handleReasonSubmit(handleActionSubmit)} className="mt-3"> {/* Sử dụng handleReasonSubmit ở đây */}
                                        <Form.Group className="mb-3">
                                            <Form.Label>Lý do {actionType === 'reject' ? 'từ chối' : 'hủy'} (bắt buộc):</Form.Label>
                                            <Form.Control as="textarea" rows={3} {...register('cancellation_reason')} isInvalid={!!reasonErrors.cancellation_reason} />
                                            <Form.Control.Feedback type="invalid">{reasonErrors.cancellation_reason?.message}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Button variant={actionType === 'reject' ? 'danger' : 'warning'} type="submit" disabled={isReasonFormSubmitting}>
                                            {isReasonFormSubmitting ? <><Spinner size="sm" className="me-2"/>Đang xử lý...</> : `Xác nhận ${actionType === 'reject' ? 'Từ chối' : 'Hủy'}`}
                                        </Button>
                                    </Form>
                                )}
                                {(actionType === 'approve') && (
                                    // Nút này sẽ gọi handleActionSubmit trực tiếp vì không có form
                                    <Button variant="success" onClick={() => handleActionSubmit()} disabled={isReasonFormSubmitting}>
                                        {isReasonFormSubmitting ? <><Spinner size="sm" className="me-2"/>Đang xử lý...</> : 'Xác nhận Phê duyệt'}
                                    </Button>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseActionModal} disabled={isReasonFormSubmitting}>Đóng</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
    );
};

export default DepartmentAppointmentManagementPage;