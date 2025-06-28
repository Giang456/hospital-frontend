import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Button, Alert, Spinner, Form } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

const DoctorAvailabilityPage = () => {
    const { id: doctorId } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [isBooking, setIsBooking] = useState(false);

    // Fetch thông tin bác sĩ và lịch trống
    useEffect(() => {
        const fetchDoctorAndAvailability = async () => {
            setLoading(true);
            setError(null);
            try {
                const doctorRes = await axiosInstance.get(`/patient/doctors/${doctorId}/availability`, {
                    params: {
                        start_date: format(selectedDate, 'yyyy-MM-dd'),
                    }
                });
                setDoctor(doctorRes.data.doctor);
                setAvailableSlots(doctorRes.data.available_slots);
                setSelectedSlot(null); // Reset slot khi ngày thay đổi
            } catch (err) {
                toast.error('Lỗi khi tải thông tin bác sĩ hoặc lịch trống.');
                console.error('Error fetching doctor availability:', err);
                setError('Không thể tải thông tin. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        if (doctorId) {
            fetchDoctorAndAvailability();
        }
    }, [doctorId, selectedDate]);

    // Hàm xử lý đặt lịch
    const handleBookAppointment = async () => {
        if (!selectedSlot || !doctor) {
            toast.error('Vui lòng chọn một khung giờ trống hợp lệ.');
            return;
        }

        if (!reason.trim()) {
            toast.error('Lý do khám là bắt buộc.');
            return;
        }

        setIsBooking(true);
        try {
            const payload = {
                doctor_id: doctor.id,
                appointment_date: selectedSlot.date,
                appointment_time: selectedSlot.start_time,
                reason: reason,
                notes_patient: notes,
            };

            const response = await axiosInstance.post('/patient/appointments', payload);
            toast.success(response.data.message || 'Đặt lịch thành công và đang chờ phê duyệt!');
            navigate('/patient/appointments');
        } catch (err) {
            console.error('Error booking appointment:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else if (!err.response) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi không xác định khi đặt lịch. Vui lòng thử lại.');
            }
        } finally {
            setIsBooking(false);
        }
    };

    if (loading) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải thông tin bác sĩ...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">
                    <Alert.Heading>Đã xảy ra lỗi</Alert.Heading>
                    <p>{error}</p>
                </Alert>
                <Button variant="secondary" onClick={() => navigate(-1)}>Quay lại</Button>
            </Container>
        );
    }

    return (
        <Container className="my-4">
            <Button variant="secondary" onClick={() => navigate('/patient/doctors')} className="mb-3">
                ← Quay lại danh sách bác sĩ
            </Button>

            <Card className="p-4 shadow-sm mb-4">
                {doctor && (
                    <>
                        <Card.Title className="mb-3">
                            <h2>Lịch làm việc của {doctor.name}</h2>
                        </Card.Title>
                        <Row className="mb-2">
                            <Col xs={12} md={6}>
                                <p className="mb-1"><strong>Chuyên khoa:</strong> {doctor.doctor_profile?.specialization || 'Đang cập nhật'}</p>
                            </Col>
                            <Col xs={12} md={6}>
                                <p className="mb-1"><strong>Phòng khám:</strong> {doctor.clinic?.name || 'Đang cập nhật'} ({doctor.clinic?.room_number ? `Phòng ${doctor.clinic.room_number}` : 'N/A'})</p>
                            </Col>
                        </Row>
                        <p className="mb-0"><strong>Email:</strong> {doctor.email}</p>
                    </>
                )}
            </Card>

            <Card className="p-4 shadow-sm">
                <h3>Chọn ngày và khung giờ</h3>
                <Row className="mb-3 align-items-center">
                    <Col md={4}>
                        <Form.Group controlId="selectDate">
                            <Form.Label className="mb-2">Chọn ngày</Form.Label>
                            <DatePicker
                                selected={selectedDate}
                                onChange={(date) => {
                                    setSelectedDate(date);
                                    setSelectedSlot(null); // Reset lựa chọn khi đổi ngày
                                }}
                                dateFormat="yyyy-MM-dd"
                                className="form-control"
                                minDate={new Date()}
                                popperPlacement="bottom-start"
                                showPopperArrow={false}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={8}>
                        <Form.Group>
                            <Form.Label className="mb-2">Khung giờ</Form.Label>
                            {availableSlots.length > 0 ? (
                                <div className="d-flex flex-wrap gap-2">
                                    {availableSlots.map((slot, index) => (
                                        <Button
                                            key={index}
                                            variant={
                                                slot.is_booked
                                                    ? 'outline-secondary'
                                                    : (selectedSlot && selectedSlot.start_time === slot.start_time ? 'success' : 'outline-primary')
                                            }
                                            onClick={() => !slot.is_booked && setSelectedSlot(slot)}
                                            size="sm"
                                            disabled={slot.is_booked}
                                            title={slot.is_booked ? 'Khung giờ này đã có người đặt' : 'Chọn khung giờ'}
                                            style={slot.is_booked ? { cursor: 'not-allowed', textDecoration: 'line-through' } : {}}
                                        >
                                            {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <Alert variant="warning" className="mt-2 p-2">Bác sĩ không có lịch làm việc hoặc tất cả các lịch đã được đặt cho ngày này.</Alert>
                            )}
                        </Form.Group>
                    </Col>
                </Row>

                {selectedSlot && !selectedSlot.is_booked && doctor && (
                    <Card className="mt-4 p-3 shadow-sm bg-light">
                        <h4>Xác nhận đặt lịch</h4>
                        <p><strong>Bác sĩ:</strong> {doctor.name}</p>
                        <p><strong>Thời gian:</strong> {selectedSlot.date} từ {selectedSlot.start_time.substring(0, 5)} đến {selectedSlot.end_time.substring(0, 5)}</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Lý do khám (bắt buộc)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Nhập lý do khám bệnh..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                isInvalid={!reason.trim()}
                            />
                            <Form.Control.Feedback type="invalid">
                                Lý do khám là bắt buộc.
                            </Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ghi chú cho phòng khám (tùy chọn)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Ghi chú thêm..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </Form.Group>
                        <Button
                            variant="success"
                            onClick={handleBookAppointment}
                            disabled={isBooking || !reason.trim()}
                        >
                            {isBooking ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
                        </Button>
                    </Card>
                )}
            </Card>
        </Container>
    );
};

export default DoctorAvailabilityPage;