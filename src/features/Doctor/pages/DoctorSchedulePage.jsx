import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Modal } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

const DoctorSchedulePage = () => {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [selectedDateForNewSchedule, setSelectedDateForNewSchedule] = useState(new Date());
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [scheduleType, setScheduleType] = useState('WORKING');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const doctorId = user?.id;

    const fetchSchedules = async () => {
        if (!doctorId) return;
        setLoading(true);
        setError(null);
        try {
            const startDate = format(currentWeek, 'yyyy-MM-dd');
            const endDate = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');

            const response = await axiosInstance.get('/doctor/schedules', {
                params: { start_date: startDate, end_date: endDate, user_id: doctorId }
            });
            setSchedules(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải lịch làm việc.');
            console.error('Error fetching schedules:', err);
            setError('Không thể tải lịch làm việc. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [doctorId, currentWeek]);

    const handleAddSchedule = (date) => {
        setEditingSchedule(null);
        setSelectedDateForNewSchedule(date);
        setStartTime('');
        setEndTime('');
        setScheduleType('WORKING');
        setNotes('');
        setShowScheduleModal(true);
    };

    const handleEditSchedule = (schedule) => {
        setEditingSchedule(schedule);
        setSelectedDateForNewSchedule(new Date(schedule.date));
        setStartTime(schedule.start_time);
        setEndTime(schedule.end_time);
        setScheduleType(schedule.type);
        setNotes(schedule.notes || '');
        setShowScheduleModal(true);
    };

    const handleSubmitSchedule = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                user_id: doctorId,
                date: format(selectedDateForNewSchedule, 'yyyy-MM-dd'),
                start_time: startTime,
                end_time: endTime,
                type: scheduleType,
                notes: notes,
            };

            let response;
            if (editingSchedule) {
                response = await axiosInstance.put(`/doctor/schedules/${editingSchedule.id}`, payload);
            } else {
                response = await axiosInstance.post('/doctor/schedules', payload);
            }
            toast.success(response.data.message || 'Lịch làm việc đã được lưu thành công!');
            fetchSchedules();
            setShowScheduleModal(false);
        } catch (err) {
            console.error('Error saving schedule:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else {
                toast.error('Đã xảy ra lỗi khi lưu lịch làm việc. Vui lòng thử lại.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa lịch làm việc này không?')) {
            try {
                const response = await axiosInstance.delete(`/doctor/schedules/${scheduleId}`);
                toast.success(response.data.message || 'Lịch làm việc đã được xóa thành công!');
                fetchSchedules();
            } catch (err) {
                console.error('Error deleting schedule:', err);
                 if (err.response && err.response.data && err.response.data.message) {
                    toast.error(err.response.data.message);
                } else {
                    toast.error('Đã xảy ra lỗi khi xóa lịch làm việc. Vui lòng thử lại.');
                }
            }
        }
    };

    const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const currentWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

    const renderDailySchedule = (date) => {
        const dailySchedules = schedules.filter(s => isSameDay(parseISO(s.date), date));
        const today = new Date();
        const isPastDay = date < today && !isSameDay(date, today);

        return (
            <Col key={date.toISOString()} className="mb-3">
                <Card className="h-100 shadow-sm">
                    <Card.Header className={`fw-bold ${isSameDay(date, today) ? 'text-primary' : ''}`}>
                        {format(date, 'dd/MM')} - {daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                    </Card.Header>
                    <Card.Body className="d-flex flex-column gap-2">
                        {dailySchedules.length > 0 ? (
                            dailySchedules.map(s => (
                                <Alert key={s.id} variant={s.type === 'WORKING' ? 'success' : s.type === 'DAY_OFF' ? 'warning' : 'info'} className="p-2 mb-0">
                                    {s.type === 'WORKING' ? (
                                        `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`
                                    ) : s.type === 'DAY_OFF' ? 'NGHỈ CÁ NHÂN' : 'NGHỈ PHÉP ĐƯỢC DUYỆT'}
                                    {s.notes && <br />}
                                    {s.notes && <small>{s.notes}</small>}
                                    {!isPastDay && s.type !== 'APPROVED_LEAVE' && (
                                        <div className="mt-1">
                                            <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => handleEditSchedule(s)}>Sửa</Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteSchedule(s.id)}>Xóa</Button>
                                        </div>
                                    )}
                                </Alert>
                            ))
                        ) : (
                            <Alert variant="secondary" className="p-2 mb-0">Trống</Alert>
                        )}
                        {/* Kiểm tra nếu không phải ngày trong quá khứ thì mới hiện nút thêm lịch */}
                        {!isPastDay && (
                            <Button variant="outline-primary" size="sm" className="mt-auto" onClick={() => handleAddSchedule(date)}>
                                Thêm lịch
                            </Button>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        );
    };

    if (loading) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải lịch làm việc...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container className="my-4">
            <h2>Lịch làm việc cá nhân của Bác sĩ {user?.name}</h2>

            <Row className="mb-3 align-items-center">
                <Col>
                    <Button variant="outline-secondary" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>
                        ← Tuần trước
                    </Button>
                </Col>
                <Col className="text-center">
                    <h4 className="mb-0">Tuần từ {format(currentWeek, 'dd/MM/yyyy')} đến {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd/MM/yyyy')}</h4>
                </Col>
                <Col className="text-end">
                    <Button variant="outline-secondary" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>
                        Tuần sau →
                    </Button>
                </Col>
            </Row>

            <Row xs={1} md={2} lg={4} className="g-4">
                {currentWeekDays.map(renderDailySchedule)}
            </Row>

            {/* Modal thêm/sửa lịch */}
            <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingSchedule ? 'Sửa lịch làm việc' : 'Thêm lịch làm việc mới'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Ngày</Form.Label>
                            <DatePicker
                                selected={selectedDateForNewSchedule}
                                onChange={(date) => setSelectedDateForNewSchedule(date)}
                                dateFormat="yyyy-MM-dd"
                                className="form-control"
                                minDate={new Date()}
                                disabled={!!editingSchedule}
                            />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Giờ bắt đầu</Form.Label>
                                    <Form.Control type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Giờ kết thúc</Form.Label> {/* <-- THÊM DÒNG NÀY (Đóng tag) */}
                                    <Form.Control type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Loại lịch</Form.Label> {/* <-- THÊM DÒNG NÀY (Đóng tag) */}
                            <Form.Select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                                <option value="WORKING">Làm việc</option>
                                <option value="DAY_OFF">Nghỉ cá nhân</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ghi chú</Form.Label>
                            <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
                        Hủy
                    </Button>
                    <Button variant="primary" onClick={handleSubmitSchedule} disabled={isSubmitting}>
                        {isSubmitting ? 'Đang lưu...' : 'Lưu lịch'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DoctorSchedulePage;