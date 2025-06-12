import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA
import { useAuth } from '../../../contexts/AuthContext';

const LeaveRequestPage = () => {
    const { user } = useAuth();

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState(null);

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!startDate || !endDate || !reason.trim()) {
            toast.error('Vui lòng điền đầy đủ Ngày bắt đầu, Ngày kết thúc và Lý do.');
            return;
        }

        if (startDate.getTime() >= endDate.getTime()) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu.');
            return;
        }

        setIsSubmitting(true);
        setSubmissionStatus(null);
        try {
            const payload = {
                start_date: format(startDate, 'yyyy-MM-dd HH:mm:ss'),
                end_date: format(endDate, 'yyyy-MM-dd HH:mm:ss'),
                reason: reason,
            };

            const response = await axiosInstance.post('/leave-requests', payload);
            toast.success(response.data.message || 'Đơn xin nghỉ phép đã được gửi!');
            setSubmissionStatus('success');
            setStartDate(null);
            setEndDate(null);
            setReason('');
        } catch (err) {
            console.error('Error submitting leave request:', err);
            setSubmissionStatus('error');
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else if (!err.response) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi khi gửi đơn xin nghỉ phép. Vui lòng thử lại.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // XÓA BỌC MainLayout TRỰC TIẾP TẠI ĐÂY
        <Container className="my-4">
            <h2>Xin nghỉ phép cho bản thân</h2>

            <Card className="p-4 shadow-sm">
                <Card.Title className="mb-3">Tạo đơn xin nghỉ phép mới</Card.Title>
                <Form onSubmit={handleFormSubmit}>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group controlId="startDate">
                                <Form.Label>Ngày bắt đầu nghỉ</Form.Label>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => setStartDate(date)}
                                    showTimeSelect
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    className="form-control"
                                    minDate={new Date()}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="endDate">
                                <Form.Label>Ngày kết thúc nghỉ</Form.Label>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => setEndDate(date)}
                                    showTimeSelect
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    className="form-control"
                                    minDate={startDate || new Date()}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3" controlId="reason">
                        <Form.Label>Lý do xin nghỉ</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nhập lý do xin nghỉ phép..."
                        />
                    </Form.Group>

                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Đang gửi đơn...' : 'Gửi đơn xin nghỉ phép'}
                    </Button>
                    {submissionStatus === 'success' && <Alert variant="success" className="mt-3">Đơn đã được gửi thành công!</Alert>}
                    {submissionStatus === 'error' && <Alert variant="danger" className="mt-3">Có lỗi xảy ra khi gửi đơn. Vui lòng thử lại.</Alert>}
                </Form>
            </Card>
        </Container>
    );
};

export default LeaveRequestPage;