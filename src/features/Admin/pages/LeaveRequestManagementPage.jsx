import React, { useState, useEffect, useCallback } from 'react';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns'; // Đảm bảo parseISO được import
import { useForm } from 'react-hook-form';

// Schema validation cho lý do từ chối
const rejectReasonSchema = z.object({
    rejection_reason: z.string().min(1, 'Lý do từ chối là bắt buộc.').max(500, 'Lý do không được quá 500 ký tự.'),
});

// Hàm chuyển trạng thái sang tiếng Việt
const getStatusLabel = (status) => {
    switch (status) {
        case 'PENDING_HOD_APPROVAL':
            return 'Chờ Trưởng khoa duyệt';
        case 'PENDING_SA_APPROVAL':
            return 'Chờ Admin duyệt';
        case 'APPROVED':
            return 'Đã duyệt';
        case 'REJECTED':
            return 'Đã từ chối';
        default:
            return status;
    }
};

const LeaveRequestManagementPage = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false); // true hoặc 'rejectForm'
    const [currentRequest, setCurrentRequest] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);

    // State cho việc xử lý hành động (approve/reject)
    const [isProcessingAction, setIsProcessingAction] = useState(false); // <<< KHAI BÁO STATE NÀY

    const { register, handleSubmit, formState: { errors }, reset, setError: setFormError, clearErrors } = useForm({
        resolver: zodResolver(rejectReasonSchema), // Chỉ dùng cho form lý do từ chối
        defaultValues: { rejection_reason: '' }
    });

    const fetchData = useCallback(async () => { // useCallback để ổn định dependency
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterUserId) params.user_id = filterUserId;
            if (filterStartDate) params.start_date = format(filterStartDate, 'yyyy-MM-dd');
            if (filterEndDate) params.end_date = format(filterEndDate, 'yyyy-MM-dd');
            params.with = 'user.roles,approver'; // Eager load user, roles và approver

            const requestsRes = await axiosInstance.get('/admin/leave-requests', { params });
            setLeaveRequests(requestsRes.data.data || []);

            if (users.length === 0) {
                const usersRes = await axiosInstance.get('/admin/users', { params: {per_page: 1000}}); // Lấy nhiều user
                setUsers(usersRes.data.data.filter(u => u.roles && u.roles.some(role => ['DOCTOR', 'HEAD_OF_DEPARTMENT', 'NURSE_STAFF', 'SUPER_ADMIN'].includes(typeof role === 'string' ? role : role.name))));
            }
        } catch (err) {
            toast.error('Lỗi khi tải danh sách đơn nghỉ phép.');
            setError('Không thể tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterUserId, filterStartDate, filterEndDate, users.length]); // Thêm users.length

    useEffect(() => {
        fetchData();
    }, [fetchData]); // fetchData là dependency ổn định

    const handleShowDetailModal = (request) => {
        setCurrentRequest(request);
        setShowDetailModal(true); // Chỉ mở modal, không set 'rejectForm' ở đây
        reset({ rejection_reason: request?.rejection_reason || '' });
        clearErrors();
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setCurrentRequest(null);
        reset();
    };

    const handleApproveReject = async (actionType, data = {}) => {
        if (!currentRequest) return;

        const confirmMessage = actionType === 'approve'
            ? `PHÊ DUYỆT đơn của ${currentRequest.user.name}?`
            : `TỪ CHỐI đơn của ${currentRequest.user.name}?`;

        if (actionType === 'approve' && !window.confirm(confirmMessage)) return;
        // Với reject, việc confirm sẽ do nút "Xác nhận Từ chối" đảm nhiệm sau khi nhập lý do

        setIsProcessingAction(true); // <<< SET TRUE
        try {
            const endpoint = `/admin/leave-requests/${currentRequest.id}/${actionType}`;
            // Payload cho PATCH request
            const payload = actionType === 'reject' ? { rejection_reason: data.rejection_reason } : {};

            const response = await axiosInstance.patch(endpoint, payload);
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData();
            handleCloseDetailModal();
        } catch (err) {
            if (err.response?.data?.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    if(Array.isArray(messages)) messages.forEach(msg => toast.error(msg));
                });
            } else {
                toast.error(err.response?.data?.message || `Lỗi khi ${actionType === 'approve' ? 'phê duyệt' : 'từ chối'}.`);
            }
        } finally {
            setIsProcessingAction(false); // <<< SET FALSE
        }
    };

    // Hàm này được gọi khi form lý do từ chối được submit
    const onSubmitRejectForm = (data) => {
        handleApproveReject('reject', data);
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Đơn xin nghỉ phép</h2>

                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={3}><Form.Group><Form.Label>Trạng thái</Form.Label><Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Tất cả</option><option value="PENDING_HOD_APPROVAL">Chờ TK duyệt</option><option value="PENDING_SA_APPROVAL">Chờ SA duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option></Form.Select></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>Nhân viên</Form.Label><Form.Select value={filterUserId} onChange={e => setFilterUserId(e.target.value)}><option value="">Tất cả</option>{users.map(user => (<option key={user.id} value={user.id}>{user.name} ({user.roles?.[0]?.name || 'N/A'})</option>))}</Form.Select></Form.Group></Col>
                        <Col md={2}><Form.Group><Form.Label>Từ ngày</Form.Label><DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable /></Form.Group></Col>
                        <Col md={2}><Form.Group><Form.Label>Đến ngày</Form.Label><DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable /></Form.Group></Col>
                        <Col md={2}><Button variant="secondary" onClick={() => { setFilterStatus(''); setFilterUserId(''); setFilterStartDate(null); setFilterEndDate(null); }} className="w-100">Reset</Button></Col>
                    </Row>
                </Card>
                
                {loading && <div className="text-center my-3"><Spinner size="sm"/> Đang tải...</div>}
                {!loading && error && <Alert variant="danger">{error}</Alert>}

                {!loading && !error && (
                    <Table striped bordered hover responsive className="mt-4 shadow-sm">
                        <thead>
                            <tr><th>ID</th><th>Nhân viên</th><th>Thời gian nghỉ</th><th>Lý do</th><th>Trạng thái</th><th>Người duyệt</th><th>Hành động</th></tr>
                        </thead>
                        <tbody>
                            {leaveRequests.length > 0 ? (
                                leaveRequests.map(request => (
                                    <tr key={request.id}>
                                        <td>{request.id}</td>
                                        <td>{request.user?.name || 'N/A'} {request.user?.roles?.length > 0 ? `(${(typeof request.user.roles[0] === 'string' ? request.user.roles[0] : request.user.roles[0]?.name) || 'N/A'})` : ''}</td>
                                        <td>
                                            {request.start_date ? format(parseISO(request.start_date), 'dd/MM/yyyy HH:mm') : 'N/A'} - <br/>
                                            {request.end_date ? format(parseISO(request.end_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                        </td>
                                        <td>{request.reason ? (request.reason.length > 50 ? request.reason.substring(0, 50) + '...' : request.reason) : 'N/A'}</td>
                                        <td><span className={`badge bg-${request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'}`}>{getStatusLabel(request.status)}</span></td>
                                        <td>{request.approver?.name || 'N/A'}</td>
                                        <td>
                                            <Button variant="primary" size="sm" onClick={() => handleShowDetailModal(request)}>Xem & Duyệt</Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="text-center">Không có đơn nghỉ phép nào.</td></tr>
                            )}
                        </tbody>
                    </Table>
                )}

                <Modal show={!!showDetailModal} onHide={handleCloseDetailModal} size="lg" backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>Chi tiết Đơn xin nghỉ phép #{currentRequest?.id}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {currentRequest && (
                            <Card className="p-3 mb-3">
                                <Card.Text><strong>Nhân viên:</strong> {currentRequest.user?.name} {currentRequest.user?.roles?.length > 0 ? `(${(typeof currentRequest.user.roles[0] === 'string' ? currentRequest.user.roles[0] : currentRequest.user.roles[0]?.name) || 'N/A'})` : ''}</Card.Text>
                                <Card.Text><strong>Thời gian nghỉ:</strong> {currentRequest.start_date ? format(parseISO(currentRequest.start_date), 'dd/MM/yyyy HH:mm') : 'N/A'} đến {currentRequest.end_date ? format(parseISO(currentRequest.end_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</Card.Text>
                                <Card.Text><strong>Lý do:</strong><pre style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{currentRequest.reason}</pre></Card.Text>
                                <Card.Text><strong>Trạng thái:</strong> <span className={`fw-bold text-${currentRequest.status === 'APPROVED' ? 'success' : currentRequest.status === 'REJECTED' ? 'danger' : 'warning'}`}>{getStatusLabel(currentRequest.status)}</span></Card.Text>
                                {currentRequest.approver && <Card.Text><strong>Người duyệt:</strong> {currentRequest.approver.name}</Card.Text>}
                                {currentRequest.rejection_reason && <Card.Text className="text-danger"><strong>Lý do từ chối:</strong> {currentRequest.rejection_reason}</Card.Text>}
                            </Card>
                        )}

                        {currentRequest && (currentRequest.status === 'PENDING_HOD_APPROVAL' || currentRequest.status === 'PENDING_SA_APPROVAL') && (
                            <div className="mt-4">
                                {showDetailModal !== 'rejectForm' && ( // Chỉ hiển thị nút nếu không phải đang ở form từ chối
                                    <>
                                        <h5>Hành động:</h5>
                                        <Button variant="success" className="me-2" onClick={() => handleApproveReject('approve')} disabled={isProcessingAction}>
                                            {isProcessingAction ? <><Spinner size="sm" className="me-1"/>Đang xử lý...</> : 'Phê duyệt'}
                                        </Button>
                                        <Button variant="warning" onClick={() => setShowDetailModal('rejectForm')} disabled={isProcessingAction}>
                                            Từ chối
                                        </Button>
                                    </>
                                )}

                                {showDetailModal === 'rejectForm' && (
                                    <Form onSubmit={handleSubmit(onSubmitRejectForm)} className="mt-3 p-3 border rounded bg-light">
                                        <h5>Lý do từ chối đơn #{currentRequest?.id}</h5>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Lý do từ chối<span className="text-danger">*</span>:</Form.Label>
                                            <Form.Control as="textarea" rows={3} {...register('rejection_reason')} isInvalid={!!errors.rejection_reason} />
                                            <Form.Control.Feedback type="invalid">{errors.rejection_reason?.message}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Button variant="danger" type="submit" disabled={isProcessingAction}>
                                            {isProcessingAction ? <><Spinner size="sm" className="me-1"/>Đang xử lý...</> : 'Xác nhận Từ chối'}
                                        </Button>
                                        <Button variant="outline-secondary" className="ms-2" onClick={() => setShowDetailModal(true)} disabled={isProcessingAction}>
                                            Hủy (quay lại)
                                        </Button>
                                    </Form>
                                )}
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseDetailModal} disabled={isProcessingAction}>Đóng</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
    );
};

export default LeaveRequestManagementPage;