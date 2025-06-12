import React, { useState, useEffect, useCallback } from 'react'; // Thêm useCallback
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns'; // Đảm bảo parseISO

// Schema validation cho lý do từ chối
const rejectReasonSchema = z.object({
    rejection_reason: z.string().min(1, 'Lý do từ chối là bắt buộc.').max(500, 'Lý do không được quá 500 ký tự.'),
});


const DepartmentLeaveRequestManagementPage = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [departmentStaff, setDepartmentStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false); // Chỉ true/false
    const [showRejectForm, setShowRejectForm] = useState(false); // State riêng cho form từ chối
    const [currentRequest, setCurrentRequest] = useState(null);
    const [filterStatus, setFilterStatus] = useState('PENDING_HOD_APPROVAL');
    const [filterUserId, setFilterUserId] = useState('');
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);


    const { register, handleSubmit, formState: { errors: rejectErrors }, reset: resetRejectForm, clearErrors: clearRejectErrors } = useForm({
        resolver: zodResolver(rejectReasonSchema),
        defaultValues: { rejection_reason: '' }
    });

    // Hàm tiện ích để lấy tên vai trò đầu tiên một cách an toàn
    const getPrimaryRoleName = (user) => {
        if (user && user.roles && user.roles.length > 0) {
            const firstRole = user.roles[0];
            return typeof firstRole === 'string' ? firstRole : firstRole?.name || 'N/A';
        }
        return 'N/A';
    };

    const fetchDepartmentStaff = useCallback(async () => {
        // Chỉ fetch một lần nếu departmentStaff rỗng
        if (departmentStaff.length > 0) return;
        try {
            const staffRes = await axiosInstance.get('/hod/staff', { params: { with: 'roles', per_page: 1000 } }); // Yêu cầu eager load roles
            setDepartmentStaff(staffRes.data.data || []);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách nhân viên khoa.');
            console.error('Error fetching department staff:', err);
        }
    }, [departmentStaff.length]);


    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                status: filterStatus,
                with: 'user.roles,approver' // Eager load user.roles và approver
            };
            if (filterUserId) params.user_id = filterUserId;
            if (filterStartDate) params.start_date = format(filterStartDate, 'yyyy-MM-dd');
            if (filterEndDate) params.end_date = format(filterEndDate, 'yyyy-MM-dd');

            console.log("Fetching leave requests with params:", params);
            const requestsRes = await axiosInstance.get('/hod/leave-requests', { params });
            console.log("Leave requests response:", requestsRes.data);
            setLeaveRequests(requestsRes.data.data || []);

        } catch (err) {
            toast.error('Lỗi khi tải danh sách đơn nghỉ phép khoa.');
            console.error('Error fetching leave requests:', err.response?.data || err);
            setError(err.response?.data?.message || 'Không thể tải dữ liệu.');
            setLeaveRequests([]);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterUserId, filterStartDate, filterEndDate]);

    useEffect(() => {
        fetchDepartmentStaff();
    }, [fetchDepartmentStaff]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const handleShowDetailModal = (request) => {
        setCurrentRequest(request);
        setShowDetailModal(true);
        setShowRejectForm(false); // Đảm bảo form từ chối bị ẩn ban đầu
        resetRejectForm({ rejection_reason: request?.rejection_reason || '' });
        clearRejectErrors();
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setShowRejectForm(false);
        setCurrentRequest(null);
        resetRejectForm();
    };

    const handleAction = async (actionType, reasonData = null) => {
        if (!currentRequest) return;

        setIsProcessingAction(true);
        try {
            const endpoint = `/hod/leave-requests/${currentRequest.id}/${actionType}`;
            const payload = actionType === 'reject' && reasonData ? { rejection_reason: reasonData.rejection_reason } : {};

            const response = await axiosInstance.patch(endpoint, payload);
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData();
            handleCloseDetailModal();
        } catch (err) {
            console.error(`Error ${actionType}ing leave request:`, err.response?.data || err);
            if (err.response?.data?.errors && actionType === 'reject') {
                Object.keys(err.response.data.errors).forEach(key => {
                     if (key === 'rejection_reason') {
                        setFormError('rejection_reason', { type: 'server', message: err.response.data.errors[key][0] });
                    }
                });
            } else {
                toast.error(err.response?.data?.message || `Không thể ${actionType}.`);
            }
        } finally {
            setIsProcessingAction(false);
        }
    };

    // Khi form lý do từ chối được submit
    const onRejectSubmit = (data) => {
        handleAction('reject', data);
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Đơn xin nghỉ phép Khoa</h2>
                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={3}><Form.Group><Form.Label>Trạng thái</Form.Label><Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Tất cả</option><option value="PENDING_HOD_APPROVAL">Chờ Trưởng Khoa duyệt</option><option value="PENDING_SA_APPROVAL">Chờ Admin duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option></Form.Select></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>Nhân viên</Form.Label><Form.Select value={filterUserId} onChange={e => setFilterUserId(e.target.value)}><option value="">Tất cả nhân viên</option>{departmentStaff.map(user => (<option key={user.id} value={user.id}>{user.name} ({getPrimaryRoleName(user)})</option>))}</Form.Select></Form.Group></Col>
                        <Col md={2}><Form.Group><Form.Label>Từ ngày nghỉ</Form.Label><DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable selectsStart startDate={filterStartDate} endDate={filterEndDate} maxDate={filterEndDate || new Date()}/></Form.Group></Col>
                        <Col md={2}><Form.Group><Form.Label>Đến ngày nghỉ</Form.Label><DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable selectsEnd startDate={filterStartDate} endDate={filterEndDate} minDate={filterStartDate} maxDate={new Date()}/></Form.Group></Col>
                        <Col md={2}><Button variant="secondary" onClick={() => { setFilterStatus('PENDING_HOD_APPROVAL'); setFilterUserId(''); setFilterStartDate(null); setFilterEndDate(null); }} className="w-100">Reset</Button></Col>
                    </Row>
                </Card>

                {loading && <div className="text-center my-3"><Spinner size="sm"/> Đang tải...</div>}
                {!loading && error && <Alert variant="danger">{error}</Alert>}

                {!loading && !error && (
                    <Table striped bordered hover responsive className="mt-4 shadow-sm">
                        <thead><tr><th>ID</th><th>Nhân viên</th><th>Thời gian nghỉ</th><th>Lý do</th><th>Trạng thái</th><th>Người duyệt</th><th>Hành động</th></tr></thead>
                        <tbody>
                            {leaveRequests.length > 0 ? (
                                leaveRequests.map(request => (
                                    <tr key={request.id}>
                                        <td>{request.id}</td>
                                        <td>{request.user?.name || 'N/A'} ({getPrimaryRoleName(request.user)})</td>
                                        <td>
                                            {request.start_date ? format(parseISO(request.start_date), 'dd/MM/yyyy HH:mm') : 'N/A'} - <br/>
                                            {request.end_date ? format(parseISO(request.end_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                        </td>
                                        <td>{request.reason ? (request.reason.length > 40 ? request.reason.substring(0, 40) + '...' : request.reason) : 'N/A'}</td>
                                        <td><span className={`badge bg-${request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'}`}>{request.status}</span></td>
                                        <td>{request.approver?.name || 'N/A'}</td>
                                        <td>
                                            <Button variant="primary" size="sm" onClick={() => handleShowDetailModal(request)}>Xem & Duyệt</Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="text-center">Không có đơn nghỉ phép nào phù hợp.</td></tr>
                            )}
                        </tbody>
                    </Table>
                )}

                <Modal show={showDetailModal} onHide={handleCloseDetailModal} size="lg" backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>Chi tiết Đơn xin nghỉ phép #{currentRequest?.id}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {currentRequest && (
                            <Card className="p-3 mb-3">
                                {/* ... (Hiển thị chi tiết đơn như cũ) ... */}
                                <Card.Text><strong>Nhân viên:</strong> {currentRequest.user?.name} ({getPrimaryRoleName(currentRequest.user)})</Card.Text>
                                <Card.Text><strong>Thời gian nghỉ:</strong> {currentRequest.start_date ? format(parseISO(currentRequest.start_date), 'dd/MM/yyyy HH:mm') : 'N/A'} đến {currentRequest.end_date ? format(parseISO(currentRequest.end_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</Card.Text>
                                <Card.Text><strong>Lý do:</strong><pre style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{currentRequest.reason}</pre></Card.Text>
                                <Card.Text><strong>Trạng thái:</strong> <span className={`fw-bold text-${currentRequest.status === 'APPROVED' ? 'success' : currentRequest.status === 'REJECTED' ? 'danger' : 'warning'}`}>{currentRequest.status}</span></Card.Text>
                                {currentRequest.approver && <Card.Text><strong>Người duyệt:</strong> {currentRequest.approver.name}</Card.Text>}
                                {currentRequest.rejection_reason && <Card.Text className="text-danger"><strong>Lý do từ chối:</strong> {currentRequest.rejection_reason}</Card.Text>}

                            </Card>
                        )}

                        {/* Chỉ hiển thị phần hành động nếu đang ở trạng thái chờ duyệt và không phải đang xem form từ chối */}
                        {currentRequest && (currentRequest.status === 'PENDING_HOD_APPROVAL' || currentRequest.status === 'PENDING_SA_APPROVAL') && !showRejectForm && (
                            <div className="mt-4">
                                <h5>Hành động:</h5>
                                <Button variant="success" className="me-2" onClick={() => handleAction('approve')} disabled={isProcessingAction}>
                                    {isProcessingAction ? <><Spinner size="sm" className="me-1"/>Đang xử lý...</> : 'Phê duyệt'}
                                </Button>
                                <Button variant="danger" onClick={() => setShowRejectForm(true)} disabled={isProcessingAction}>
                                    Từ chối
                                </Button>
                            </div>
                        )}

                        {/* Form lý do từ chối (chỉ hiển thị nếu showRejectForm là true) */}
                        {currentRequest && showRejectForm && (
                             <Form onSubmit={handleSubmit(onRejectSubmit)} className="mt-3 p-3 border rounded bg-light">
                                <h5>Lý do từ chối đơn #{currentRequest?.id}</h5>
                                <Form.Group className="mb-3">
                                    <Form.Label>Lý do từ chối<span className="text-danger">*</span>:</Form.Label>
                                    <Form.Control as="textarea" rows={3} {...register('rejection_reason')} isInvalid={!!rejectErrors.rejection_reason} />
                                    <Form.Control.Feedback type="invalid">{rejectErrors.rejection_reason?.message}</Form.Control.Feedback>
                                </Form.Group>
                                <Button variant="danger" type="submit" disabled={isProcessingAction}>
                                    {isProcessingAction ? <><Spinner size="sm" className="me-1"/>Đang xử lý...</> : 'Xác nhận Từ chối'}
                                </Button>
                                <Button variant="outline-secondary" className="ms-2" onClick={() => setShowRejectForm(false)} disabled={isProcessingAction}>
                                    Hủy
                                </Button>
                            </Form>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseDetailModal} disabled={isProcessingAction}>Đóng</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
    );
};

export default DepartmentLeaveRequestManagementPage;