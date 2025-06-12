import React, { useState, useEffect } from 'react';
import { Container, Alert, Spinner, Card, Table, Button, Form, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

const PatientPaymentHistoryPage = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const fetchPaymentHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
            if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');

            const response = await axiosInstance.get('/patient/payments/history', {
                params: { ...params, with: 'appointment.doctor,appointment.clinic' }
            });
            setPayments(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải lịch sử giao dịch.');
            console.error('Error fetching payment history:', err);
            setError('Không thể tải lịch sử giao dịch. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentHistory();
    }, [startDate, endDate]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const renderPaymentRow = (payment) => (
        <tr key={payment.id}>
            <td>{payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</td>
            <td>
                {payment.appointment?.appointment_date || 'N/A'} {payment.appointment?.appointment_time?.substring(0,5) || 'N/A'}
            </td>
            <td>{payment.appointment?.doctor?.name || 'N/A'}</td>
            <td>{payment.appointment?.clinic?.name || 'N/A'}</td>
            <td>{formatCurrency(payment.amount)}</td>
            <td>{payment.payment_method}</td>
            <td>{payment.status}</td>
            <td>{payment.transaction_id || 'N/A'}</td>
        </tr>
    );

    return (
        // XÓA BỌC MainLayout TRỰC TIẾP TẠY ĐÂY
        <Container className="my-4">
            <h2>Lịch sử giao dịch & Hóa đơn</h2>

            <Card className="mb-4 p-3 shadow-sm bg-light">
                <Row className="align-items-end"> {/* Thêm align-items-end */}
                    <Col md={4}>
                        <Form.Group controlId="startDate">
                            <Form.Label>Từ ngày</Form.Label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                dateFormat="dd/MM/yyyy" /* <-- Đổi định dạng hiển thị cho đẹp hơn */
                                className="form-control"
                                isClearable
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group controlId="endDate">
                            <Form.Label>Đến ngày</Form.Label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                dateFormat="dd/MM/yyyy" /* <-- Đổi định dạng hiển thị cho đẹp hơn */
                                className="form-control"
                                isClearable
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                        <Button variant="primary" onClick={fetchPaymentHistory} className="w-100">
                            Lọc
                        </Button>
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <div className="text-center"><Spinner animation="border" /></div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : payments.length > 0 ? (
                <Table striped bordered hover responsive className="shadow-sm">
                    <thead>
                        <tr>
                            <th>Ngày giao dịch</th>
                            <th>Ngày/Giờ khám</th>
                            <th>Bác sĩ</th>
                            <th>Phòng khám</th>
                            <th>Số tiền</th>
                            <th>Phương thức</th>
                            <th>Trạng thái</th>
                            <th>Mã giao dịch</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map(renderPaymentRow)}
                    </tbody>
                </Table>
            ) : (
                <Alert variant="info">Bạn không có giao dịch nào.</Alert>
            )}
        </Container>
    );
};

export default PatientPaymentHistoryPage;