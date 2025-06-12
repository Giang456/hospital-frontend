import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Table, Image } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';

const PaymentProcessingPage = () => {
    const { id: appointmentId } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State cho form xác nhận thanh toán
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amountReceived, setAmountReceived] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [notes, setNotes] = useState('');
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

    // State cho QR Code
    const [qrCodeData, setQrCodeData] = useState(''); // URL hình ảnh QR hoặc payload QR
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);

    // Hàm fetch chi tiết lịch hẹn
    const fetchAppointmentDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            // Yêu cầu backend eager load các mối quan hệ cần thiết cho tính toán chi phí
            // Đường dẫn này giờ sẽ được xử lý bởi method 'show' bạn vừa thêm vào PaymentController
            const response = await axiosInstance.get(`/nurse/appointments/${appointmentId}`, {
                params: { with: 'patient,doctor,clinic,medicalRecord.prescriptions.items.medicine' }
            });
            const fetchedAppointment = response.data.data;
            setAppointment(fetchedAppointment);
            
            // Thiết lập giá trị mặc định cho amountReceived từ tổng tiền thuốc
            // Sử dụng accessor total_prescription_cost từ medical_record nếu có
            let estimatedCost = fetchedAppointment.medical_record?.total_prescription_cost || 0;
            setAmountReceived(estimatedCost > 0 ? estimatedCost.toString() : '');

        } catch (err) {
            toast.error('Lỗi khi tải chi tiết lịch hẹn.');
            console.error('Error fetching appointment details:', err);
            setError('Không thể tải chi tiết lịch hẹn. Vui lòng thử lại.');
            if (err.response && err.response.status === 403) {
                 setError('Bạn không có quyền truy cập lịch hẹn này hoặc không phải lịch hẹn chờ thanh toán.');
            } else if (err.response && err.response.status === 404) {
                 setError('Lịch hẹn không tồn tại.');
            } else if (err.response && err.response.status === 400) {
                 setError(err.response.data.message || 'Lịch hẹn không hợp lệ để xử lý thanh toán.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (appointmentId) {
            fetchAppointmentDetails();
        }
    }, [appointmentId]);

    const formatCurrency = (amount) => {
        // Đảm bảo số tiền là number trước khi format
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) return '0 đ'; // Trả về 0 nếu không phải số
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
    };

    const calculateTotalPrescriptionCost = () => {
        // Vì đã thêm accessor 'total_prescription_cost' ở backend,
        // chúng ta có thể sử dụng trực tiếp nó từ medical_record
        return appointment?.medical_record?.total_prescription_cost || 0;

        // Nếu bạn muốn tính toán ở frontend (ít khuyến khích hơn nếu backend đã cung cấp)
        // let total = 0;
        // if (appointment?.medical_record?.prescriptions) {
        //     appointment.medical_record.prescriptions.forEach(pres => {
        //         pres.items.forEach(item => {
        //             total += (item.quantity || 0) * (item.medicine?.price || 0);
        //         });
        //     });
        // }
        // return total;
    };

    const handleGenerateQrCode = async () => {
        if (!appointment) {
            toast.error('Không có thông tin lịch hẹn để tạo QR.');
            return;
        }
        if (!amountReceived || parseFloat(amountReceived) <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ để tạo QR.');
            return;
        }

        setIsGeneratingQr(true);
        try {
            const response = await axiosInstance.post('/nurse/payments/generate-qr', {
                appointment_id: appointment.id,
                amount: parseFloat(amountReceived),
                bank_id: '970422', // MBBank
                account_no: '0359882040', // STK của bạn
                template: 'compact2',
                description: `Thanh toan LH${appointment.id} - BN ${appointment.patient?.name || ''}`,
                account_name: 'He Thong Kham Benh'
            });
            setQrCodeData(response.data.qr_code_image_url);
            toast.success(response.data.message || 'Mã QR đã được tạo!');
        } catch (err) {
            console.error('Error generating QR:', err);
            if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else if (!err.response) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Lỗi khi tạo mã QR. Vui lòng thử lại.');
            }
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        if (!appointment) return;
        if (!amountReceived || parseFloat(amountReceived) <= 0 || !paymentMethod) {
            toast.error('Vui lòng nhập số tiền và chọn phương thức thanh toán.');
            return;
        }

        setIsConfirmingPayment(true);
        try {
            const payload = {
                amount: parseFloat(amountReceived),
                payment_method: paymentMethod,
                transaction_id: transactionId,
                notes: notes,
            };
            const response = await axiosInstance.post(`/nurse/payments/${appointment.id}/confirm`, payload);
            toast.success(response.data.message || 'Thanh toán đã được xác nhận!');
            navigate('/nurse/appointments');
        } catch (err) {
            console.error('Error confirming payment:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else if (err.response && err.response.data && err.response.data.message) {
                 toast.error(err.response.data.message);
            } else if (!err.response) {
                toast.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } else {
                toast.error('Đã xảy ra lỗi khi xác nhận thanh toán. Vui lòng thử lại.');
            }
        } finally {
            setIsConfirmingPayment(false);
        }
    };

    if (loading) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải chi tiết lịch hẹn...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">{error}</Alert>
                <Button variant="secondary" onClick={() => navigate('/nurse/appointments')} className="mt-3">
                    ← Quay lại danh sách chờ thanh toán
                </Button>
            </Container>
        );
    }

    if (!appointment) {
        return (
            <Container className="my-4">
                <Alert variant="warning">Không tìm thấy lịch hẹn hoặc không có quyền truy cập.</Alert>
                <Button variant="secondary" onClick={() => navigate('/nurse/appointments')} className="mt-3">
                    ← Quay lại danh sách chờ thanh toán
                </Button>
            </Container>
        );
    }

    const totalEstimatedCost = calculateTotalPrescriptionCost();

    return (
        <Container className="my-4">
            <Button variant="secondary" onClick={() => navigate('/nurse/appointments')} className="mb-3">
                ← Quay lại danh sách chờ thanh toán
            </Button>

            <Card className="p-4 shadow-sm mb-4">
                <Card.Title className="mb-3">
                    <h2>Xử lý Thanh toán cho Lịch hẹn #{appointment.id}</h2>
                </Card.Title>
                <Row className="mb-2">
                    <Col md={6}>
                        <p className="mb-1"><strong>Bệnh nhân:</strong> {appointment.patient?.name || 'N/A'}</p>
                        <p className="mb-1"><strong>Bác sĩ:</strong> {appointment.doctor?.name || 'N/A'}</p>
                        <p className="mb-1"><strong>Thời gian:</strong> {appointment.appointment_date} {appointment.appointment_time?.substring(0, 5)}</p>
                    </Col>
                    <Col md={6}>
                        <p className="mb-1"><strong>Phòng khám:</strong> {appointment.clinic?.name || 'N/A'} ({appointment.clinic?.room_number || 'N/A'})</p>
                        <p className="mb-1"><strong>Lý do khám:</strong> {appointment.reason || 'N/A'}</p>
                        <p className="mb-1"><strong>Trạng thái lịch hẹn:</strong> <strong>{appointment.status}</strong></p>
                    </Col>
                </Row>
                <hr />
                {appointment.medical_record?.prescriptions && appointment.medical_record.prescriptions.length > 0 && (
                    <>
                        <h5>Đơn thuốc đã kê:</h5>
                        <Table striped bordered hover responsive size="sm" className="mb-3">
                            <thead>
                                <tr>
                                    <th>Tên thuốc</th>
                                    <th>Hàm lượng</th>
                                    <th>Đơn vị</th>
                                    <th>Giá</th>
                                    <th>Số lượng</th>
                                    <th>Tổng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointment.medical_record.prescriptions.map(pres =>
                                    pres.items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.medicine?.name || 'N/A'}</td>
                                            <td>{item.medicine?.concentration || 'N/A'}</td>
                                            <td>{item.medicine?.unit || 'N/A'}</td>
                                            <td>{formatCurrency(item.medicine?.price || 0)}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency((item.quantity || 0) * (item.medicine?.price || 0))}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </>
                )}
                <Alert variant="info" className="p-2">
                    <strong>Tổng chi phí ước tính (chỉ từ thuốc): {formatCurrency(totalEstimatedCost)}</strong>
                </Alert>
            </Card>

            {appointment.status === 'PAYMENT_PENDING' && (
                <Card className="p-4 shadow-sm">
                    <Card.Title className="mb-3">Xác nhận Thanh toán</Card.Title>
                    <Form onSubmit={handleConfirmPayment}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Số tiền nhận được</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        placeholder="Nhập số tiền đã nhận"
                                        min={0}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Phương thức thanh toán</Form.Label>
                                    <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                        <option value="">Chọn phương thức</option>
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="VIETQR_TRANSFER">Chuyển khoản (VietQR)</option>
                                        <option value="CARD">Thẻ tín dụng/ghi nợ</option>
                                        <option value="OTHER">Khác</option>
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Mã giao dịch (Nếu có)</Form.Label>
                                    <Form.Control type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Nhập mã giao dịch" />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Ghi chú</Form.Label>
                                    <Form.Control as="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú thêm về thanh toán..." />
                                </Form.Group>
                                <Button variant="success" type="submit" disabled={isConfirmingPayment}>
                                    {isConfirmingPayment ? 'Đang xác nhận...' : 'Xác nhận Đã thanh toán'}
                                </Button>
                            </Col>
                            <Col md={6}>
                                <h5 className="mb-3">Tạo Mã QR (Chuyển khoản)</h5>
                                <div className="text-center p-3 border rounded mb-3 bg-white">
                                    {qrCodeData ? (
                                        qrCodeData.startsWith('http') ? (
                                            <Image src={qrCodeData} alt="Mã QR VietQR" fluid />
                                        ) : (
                                            <QRCode value={qrCodeData} size={256} viewBox={`0 0 256 256`} />
                                        )
                                    ) : (
                                        <p className="text-muted">Nhập số tiền và nhấn "Tạo QR" để hiển thị mã.</p>
                                    )}
                                </div>
                                <Button variant="info" onClick={handleGenerateQrCode} disabled={isGeneratingQr || !amountReceived || parseFloat(amountReceived) <= 0}>
                                    {isGeneratingQr ? 'Đang tạo QR...' : 'Tạo Mã QR'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card>
            )}

            {appointment.status === 'PAID' && (
                <Alert variant="success" className="mt-4 p-3">
                    Lịch hẹn này đã được thanh toán hoàn tất.
                </Alert>
            )}
        </Container>
    );
};

export default PaymentProcessingPage;