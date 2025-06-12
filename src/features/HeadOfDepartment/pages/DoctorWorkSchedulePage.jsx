import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import MainLayout from '../../../components/layouts/MainLayout';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext'; // Import useAuth

// Schema validation cho tạo/sửa lịch làm việc
const workScheduleSchema = z.object({
    // user_id sẽ được lấy từ user đang đăng nhập, không phải từ form
    date: z.string().min(1, 'Ngày là bắt buộc.'),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:MM hoặc HH:MM:SS.'),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ kết thúc không đúng định dạng HH:MM hoặc HH:MM:SS.'),
    type: z.enum(['WORKING', 'DAY_OFF'], { message: 'Loại lịch không hợp lệ.' }), // Bác sĩ không thể tạo APPROVED_LEAVE
    notes: z.string().optional().nullable().transform(e => e === '' ? null : e),
}).superRefine((data, ctx) => {
    if (data.start_time && data.end_time) {
        const startTimeWithSeconds = data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time;
        const endTimeWithSeconds = data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time;
        const startDateTime = new Date(`1970-01-01T${startTimeWithSeconds}`);
        const endDateTime = new Date(`1970-01-01T${endTimeWithSeconds}`);
        if (endDateTime <= startDateTime) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giờ kết thúc phải sau giờ bắt đầu.', path: ['end_time'] });
        }
    }
    // Ngày không được trong quá khứ khi tạo mới (chỉ kiểm tra khi tạo)
    if (ctx.parent.isEditing === false && data.date && new Date(data.date) < new Date(new Date().setHours(0,0,0,0))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày không được trong quá khứ.', path: ['date'] });
    }
});


const DoctorWorkSchedulePage = () => {
    const { user } = useAuth(); // Lấy user đang đăng nhập
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSchedule, setCurrentSchedule] = useState(null);

    const [filterStartDate, setFilterStartDate] = useState(null);
    const [filterEndDate, setFilterEndDate] = useState(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm({
        resolver: zodResolver(workScheduleSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            start_time: '08:00', end_time: '17:00', type: 'WORKING', notes: '',
        }
    });

    // Fetch Work Schedules
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (filterStartDate) params.start_date = format(filterStartDate, 'yyyy-MM-dd');
            if (filterEndDate) params.end_date = format(filterEndDate, 'yyyy-MM-dd');

            const schedulesRes = await axiosInstance.get('/doctor/schedules', { params });
            setSchedules(schedulesRes.data.data);

        } catch (err) {
            toast.error('Lỗi khi tải lịch làm việc cá nhân.');
            console.error('Error fetching schedules:', err);
            setError(err.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterStartDate, filterEndDate]); // Re-fetch when filters change


    // Open Add/Edit Modal
    const handleShowModal = (schedule = null) => {
        setIsEditing(!!schedule);
        setCurrentSchedule(schedule);
        if (schedule) {
            reset({
                date: schedule.date,
                start_time: schedule.start_time?.substring(0, 5),
                end_time: schedule.end_time?.substring(0, 5),
                type: schedule.type,
                notes: schedule.notes || '',
            });
        } else {
            reset({ // Default values for new schedule
                date: format(new Date(), 'yyyy-MM-dd'),
                start_time: '08:00', end_time: '17:00', type: 'WORKING', notes: '',
            });
        }
        setShowModal(true);
        clearErrors();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentSchedule(null);
        reset();
        clearErrors();
    };

    // Handle form submission (Add/Edit Schedule)
    const onSubmit = async (data) => {
        try {
            let response;
            const formatTime = (timeStr) => timeStr && (timeStr.length === 5 ? `${timeStr}:00` : timeStr);
            const payload = {
                ...data,
                user_id: user.id, // Luôn gửi user_id của người dùng đang đăng nhập
                start_time: formatTime(data.start_time),
                end_time: formatTime(data.end_time),
            };

            if (isEditing) {
                response = await axiosInstance.put(`/doctor/schedules/${currentSchedule.id}`, payload);
            } else {
                response = await axiosInstance.post('/doctor/schedules', payload);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData(); // Refresh schedule list
            handleCloseModal();
        } catch (err) {
            console.error('Error submitting form:', err);
            if (err.response?.data?.errors) {
                Object.keys(err.response.data.errors).forEach(key => {
                    setFormError(key, { type: 'server', message: err.response.data.errors[key][0] });
                });
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
            }
        }
    };

    // Handle schedule deletion
    const handleDeleteSchedule = async (scheduleToDelete) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa lịch làm việc này của bạn vào ngày ${scheduleToDelete.date} (${scheduleToDelete.start_time?.substring(0,5)}-${scheduleToDelete.end_time?.substring(0,5)})?`)) {
            try {
                const response = await axiosInstance.delete(`/doctor/schedules/${scheduleToDelete.id}`);
                toast.success(response.data.message || 'Lịch làm việc đã được xóa.');
                fetchData();
            } catch (err) {
                console.error('Error deleting schedule:', err);
                toast.error(err.response?.data?.message || 'Không thể xóa lịch làm việc.');
            }
        }
    };


    if (loading) {
        return (
            <MainLayout><Container className="my-4 text-center"><Spinner animation="border" /><p>Đang tải lịch làm việc cá nhân...</p></Container></MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout><Container className="my-4"><Alert variant="danger">{error}</Alert></Container></MainLayout>
        );
    }

    return (
        <MainLayout>
            <Container className="my-4">
                <h2>Lịch làm việc cá nhân</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm lịch làm việc mới
                </Button>

                {/* Filter Section */}
                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Form.Group controlId="filterStartDate">
                                <Form.Label>Từ ngày</Form.Label>
                                <DatePicker
                                    selected={filterStartDate}
                                    onChange={(date) => setFilterStartDate(date)}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control"
                                    isClearable
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="filterEndDate">
                                <Form.Label>Đến ngày</Form.Label>
                                <DatePicker
                                    selected={filterEndDate}
                                    onChange={(date) => setFilterEndDate(date)}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control"
                                    isClearable
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Button variant="secondary" onClick={() => { setFilterStartDate(null); setFilterEndDate(null); }} className="w-100">
                                Reset Lọc
                            </Button>
                        </Col>
                    </Row>
                </Card>

                <Table striped bordered hover responsive className="mt-4 shadow-sm">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Ngày</th>
                            <th>Bắt đầu</th>
                            <th>Kết thúc</th>
                            <th>Loại</th>
                            <th>Ghi chú</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.length > 0 ? (
                            schedules.map((schedule) => (
                                <tr key={schedule.id}>
                                    <td>{schedule.id}</td>
                                    <td>{schedule.date}</td>
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
                            <tr>
                                <td colSpan="7" className="text-center">Không có lịch làm việc nào.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                {/* Add/Edit Work Schedule Modal */}
                <Modal show={showModal} onHide={handleCloseModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Sửa Lịch làm việc' : 'Thêm Lịch làm việc mới'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleSubmit(onSubmit)}>
                            {/* user_id không cần chọn trong form vì lấy từ user đang đăng nhập */}
                            <Form.Group className="mb-3">
                                <Form.Label>Ngày<span className="text-danger">*</span></Form.Label>
                                <Form.Control type="date" {...register('date')} isInvalid={!!errors.date} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'} />
                                <Form.Control.Feedback type="invalid">{errors.date?.message}</Form.Control.Feedback>
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Giờ bắt đầu<span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="time" step="1" {...register('start_time')} isInvalid={!!errors.start_time} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'} />
                                        <Form.Control.Feedback type="invalid">{errors.start_time?.message}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Giờ kết thúc<span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="time" step="1" {...register('end_time')} isInvalid={!!errors.end_time} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'} />
                                        <Form.Control.Feedback type="invalid">{errors.end_time?.message}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Loại lịch<span className="text-danger">*</span></Form.Label>
                                <Form.Select {...register('type')} isInvalid={!!errors.type} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'}>
                                    <option value="WORKING">WORKING (Làm việc)</option>
                                    <option value="DAY_OFF">DAY_OFF (Ngày nghỉ)</option>
                                </Form.Select>
                                {errors.type && <Alert variant="danger" className="mt-2 p-2">{errors.type.message}</Alert>}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Ghi chú</Form.Label>
                                <Form.Control as="textarea" rows={3} {...register('notes')} isInvalid={!!errors.notes} disabled={isEditing && currentSchedule?.type === 'APPROVED_LEAVE'}/>
                                {errors.notes && <Alert variant="danger" className="mt-2 p-2">{errors.notes.message}</Alert>}
                            </Form.Group>
                            <Button variant="primary" type="submit" disabled={isSubmitting || (isEditing && currentSchedule?.type === 'APPROVED_LEAVE')}>
                                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                            </Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </Container>
        </MainLayout>
    );
};

export default DoctorWorkSchedulePage;