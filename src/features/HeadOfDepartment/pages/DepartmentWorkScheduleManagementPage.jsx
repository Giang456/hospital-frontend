import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';

// Schema validation
const workScheduleSchema = z.object({
    user_id: z.preprocess(val => Number(val), z.number().int().positive('Vui lòng chọn nhân viên.')),
    date: z.string().min(1, 'Ngày là bắt buộc.'),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:MM hoặc HH:MM:SS.'),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ kết thúc không đúng định dạng HH:MM hoặc HH:MM:SS.'),
    type: z.enum(['WORKING', 'DAY_OFF'], { message: 'Loại lịch không hợp lệ.' }),
    notes: z.string().optional().nullable().transform(e => e === '' ? null : e),
}).superRefine((data, ctx) => {
    if (data.start_time && data.end_time) {
        const startTimeWithSeconds = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;
        const endTimeWithSeconds = data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time;
        // SỬA LỖI TYPO Ở ĐÂY:
        const startDateTime = new Date(`1970-01-01T${startTimeWithSeconds}`);
        const endDateTime = new Date(`1970-01-01T${endTimeWithSeconds}`);
        if (endDateTime <= startDateTime) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải sau giờ bắt đầu.', path: ['end_time'] });
        }
    }
});


const DepartmentWorkScheduleManagementPage = () => {
    const [schedules, setSchedules] = useState([]);
    const [departmentStaff, setDepartmentStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSchedule, setCurrentSchedule] = useState(null);

    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm({
        resolver: zodResolver(workScheduleSchema),
        defaultValues: {
            user_id: '', date: format(new Date(), 'yyyy-MM-dd'),
            start_time: '08:00', end_time: '17:00', type: 'WORKING', notes: '',
        }
    });

    const fetchDepartmentStaff = useCallback(async () => {
        if (departmentStaff.length === 0) {
            try {
                const staffRes = await axiosInstance.get('/hod/staff');
                setDepartmentStaff(staffRes.data.data || []);
            } catch (err) {
                toast.error('Lỗi khi tải danh sách nhân viên khoa.');
            }
        }
    }, [departmentStaff.length]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { with: 'user.roles' };
            if (filterStartDate) params.start_date = format(filterStartDate, 'yyyy-MM-dd');
            if (filterEndDate) params.end_date = format(filterEndDate, 'yyyy-MM-dd');
            if (searchKeyword.trim()) params.search = searchKeyword.trim(); // Backend cần xử lý 'search'

            const schedulesRes = await axiosInstance.get('/hod/work-schedules', { params });
            setSchedules(schedulesRes.data.data || []);
        } catch (err) {
            toast.error('Lỗi khi tải lịch làm việc khoa.');
            setError(err.response?.data?.message || 'Không thể tải dữ liệu.');
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    }, [filterStartDate, filterEndDate, searchKeyword]);

    useEffect(() => {
        fetchDepartmentStaff();
    }, [fetchDepartmentStaff]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const handleShowModal = (schedule = null) => {
        setIsEditing(!!schedule);
        setCurrentSchedule(schedule);
        if (schedule) {
            reset({
                user_id: String(schedule.user_id),
                date: schedule.date,
                start_time: schedule.start_time?.substring(0, 5),
                end_time: schedule.end_time?.substring(0, 5),
                type: schedule.type,
                notes: schedule.notes || '',
            });
        } else {
            reset({
                user_id: '', date: format(new Date(), 'yyyy-MM-dd'),
                start_time: '08:00', end_time: '17:00', type: 'WORKING', notes: '',
            });
        }
        setShowModal(true);
        clearErrors();
    };

    // handleCloseModal không thay đổi
    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentSchedule(null);
        reset();
        clearErrors();
    };
    // onSubmit không thay đổi
    const onSubmit = async (data) => {
        try {
            const formatTime = (timeStr) => timeStr && (timeStr.length === 5 ? `${timeStr}:00` : timeStr);
            const payload = {
                ...data,
                user_id: Number(data.user_id),
                start_time: formatTime(data.start_time),
                end_time: formatTime(data.end_time),
            };
            let response;
            if (isEditing) {
                response = await axiosInstance.put(`/hod/work-schedules/${currentSchedule.id}`, payload);
            } else {
                response = await axiosInstance.post('/hod/work-schedules', payload);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData();
            handleCloseModal();
        } catch (err) {
            if (err.response?.data?.errors) {
                Object.keys(err.response.data.errors).forEach(key => {
                    setFormError(key, { type: 'server', message: err.response.data.errors[key][0] });
                });
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi.');
            }
        }
    };
    // handleDeleteSchedule không thay đổi
    const handleDeleteSchedule = async (scheduleToDelete) => {
        const userName = scheduleToDelete.user?.name || 'Không rõ';
        if (window.confirm(`Xóa lịch của ${userName} ngày ${scheduleToDelete.date} (${scheduleToDelete.start_time?.substring(0,5)}-${scheduleToDelete.end_time?.substring(0,5)})?`)) {
            try {
                await axiosInstance.delete(`/hod/work-schedules/${scheduleToDelete.id}`);
                toast.success('Lịch làm việc đã được xóa.');
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không thể xóa lịch làm việc.');
            }
        }
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Lịch làm việc Khoa</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm lịch làm việc mới
                </Button>

                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={3}>
                            <Form.Group><Form.Label>Từ ngày</Form.Label><DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable selectsStart startDate={filterStartDate} endDate={filterEndDate} maxDate={filterEndDate || new Date()} /></Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group><Form.Label>Đến ngày</Form.Label><DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} dateFormat="yyyy-MM-dd" className="form-control" isClearable selectsEnd startDate={filterStartDate} endDate={filterEndDate} minDate={filterStartDate} maxDate={new Date()} /></Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="searchKeyword">
                                <Form.Label>Tìm theo tên nhân viên / ghi chú</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nhập từ khóa..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') fetchData(); }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex flex-column">
                             <Button variant="primary" onClick={fetchData} className="w-100 mb-2" disabled={loading}>
                                {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1"/> : null}
                                Tìm
                            </Button>
                            <Button variant="secondary" onClick={() => { setFilterStartDate(null); setFilterEndDate(null); setSearchKeyword(''); }} className="w-100" disabled={loading}>
                                Reset
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* Chỉ hiển thị spinner nếu đang loading và không phải là lần load đầu tiên (có lỗi hoặc chưa có data) */}
                {loading && (schedules.length > 0 || departmentStaff.length > 0) && <div className="text-center my-3"><Spinner size="sm"/> Đang tải...</div>}
                
                {!loading && error && schedules.length === 0 && <Alert variant="danger">{error}</Alert>} {/* Hiển thị lỗi nếu không có schedule nào */}

                {!loading && (
                    <Table striped bordered hover responsive className="mt-4 shadow-sm">
                        <thead>
                            <tr><th>ID</th><th>Nhân viên</th><th>Ngày</th><th>Bắt đầu</th><th>Kết thúc</th><th>Loại</th><th>Ghi chú</th><th>Hành động</th></tr>
                        </thead>
                        <tbody>
                            {schedules.length > 0 ? (
                                schedules.map(schedule => (
                                    <tr key={schedule.id}>
                                        <td>{schedule.id}</td>
                                        <td>{schedule.user?.name || 'N/A'} {schedule.user?.roles?.length > 0 ? `(${(typeof schedule.user.roles[0] === 'string' ? schedule.user.roles[0] : schedule.user.roles[0]?.name) || 'N/A'})` : ''}</td>
                                        <td>{schedule.date ? format(parseISO(schedule.date), 'dd/MM/yyyy') : 'N/A'}</td>
                                        <td>{schedule.start_time?.substring(0, 5)}</td>
                                        <td>{schedule.end_time?.substring(0, 5)}</td>
                                        <td>{schedule.type}</td>
                                        <td>{schedule.notes || 'N/A'}</td>
                                        <td>
                                            <Button variant="info" size="sm" className="me-2 mb-1" onClick={() => handleShowModal(schedule)} disabled={schedule.type === 'APPROVED_LEAVE'}>Sửa</Button>
                                            <Button variant="danger" size="sm" className="mb-1" onClick={() => handleDeleteSchedule(schedule)} disabled={schedule.type === 'APPROVED_LEAVE'}>Xóa</Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="8" className="text-center">Không có lịch làm việc nào phù hợp với bộ lọc.</td></tr>
                            )}
                        </tbody>
                    </Table>
                )}

                <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false}>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isEditing ? 'Sửa Lịch làm việc' : 'Thêm Lịch làm việc mới'}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Nhân viên<span className="text-danger">*</span></Form.Label>
                                <Form.Select {...register('user_id')} isInvalid={!!errors.user_id} disabled={isEditing}>
                                    <option value="">Chọn nhân viên trong khoa</option>
                                    {departmentStaff.map(user => (
                                        <option key={user.id} value={String(user.id)}>
                                            {user.name} {user.roles && user.roles.length > 0 && `(${(typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0]?.name) || 'N/A'})`}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{errors.user_id?.message}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="mb-3"><Form.Label>Ngày<span className="text-danger">*</span></Form.Label><Form.Control type="date" {...register('date')} isInvalid={!!errors.date} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'} /><Form.Control.Feedback type="invalid">{errors.date?.message}</Form.Control.Feedback></Form.Group>
                            <Row>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Giờ bắt đầu<span className="text-danger">*</span></Form.Label><Form.Control type="time" {...register('start_time')} isInvalid={!!errors.start_time} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'} /><Form.Control.Feedback type="invalid">{errors.start_time?.message}</Form.Control.Feedback></Form.Group></Col>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Giờ kết thúc<span className="text-danger">*</span></Form.Label><Form.Control type="time" {...register('end_time')} isInvalid={!!errors.end_time} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'} /><Form.Control.Feedback type="invalid">{errors.end_time?.message}</Form.Control.Feedback></Form.Group></Col>
                            </Row>
                            <Form.Group className="mb-3"><Form.Label>Loại lịch<span className="text-danger">*</span></Form.Label><Form.Select {...register('type')} isInvalid={!!errors.type} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'}><option value="WORKING">WORKING (Làm việc)</option><option value="DAY_OFF">DAY_OFF (Ngày nghỉ)</option></Form.Select><Form.Control.Feedback type="invalid">{errors.type?.message}</Form.Control.Feedback></Form.Group>
                            <Form.Group className="mb-3"><Form.Label>Ghi chú</Form.Label><Form.Control as="textarea" rows={3} {...register('notes')} isInvalid={!!errors.notes} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'}/><Form.Control.Feedback type="invalid">{errors.notes?.message}</Form.Control.Feedback></Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>Đóng</Button>
                            <Button variant="primary" type="submit" disabled={isSubmitting || (isEditing && currentSchedule?.type === 'APPROVED_LEAVE')}>
                                {isSubmitting ? <><Spinner as="span" animation="border" size="sm" className="me-2"/>Đang lưu...</> : 'Lưu'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
    );
};

export default DepartmentWorkScheduleManagementPage;