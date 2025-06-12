import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import MainLayout from '../../../components/layouts/MainLayout';
// import { format } from 'date-fns'; // Không thấy sử dụng format ở đây, có thể bỏ nếu không cần
// import { useAuth } from '../../../contexts/AuthContext'; // Không thấy sử dụng user ở đây, có thể bỏ nếu không cần
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema validation cho hồ sơ bệnh án
const medicalRecordCreateSchema = z.object({
    symptoms: z.string().min(1, 'Triệu chứng là bắt buộc.'),
    diagnosis: z.string().min(1, 'Chẩn đoán là bắt buộc.'),
    treatment_plan: z.string().optional().nullable().transform(e => e === '' ? null : e),
    doctor_notes: z.string().optional().nullable().transform(e => e === '' ? null : e),

    // Thông tin sinh hiệu
    vitals_pulse: z.string().optional().nullable().transform(e => e === '' ? null : e),
    vitals_temperature: z.string().optional().nullable().transform(e => e === '' ? null : e),
    vitals_blood_pressure: z.string().optional().nullable().transform(e => e === '' ? null : e),
    vitals_weight: z.string().optional().nullable().transform(e => e === '' ? null : e),
    vitals_height: z.string().optional().nullable().transform(e => e === '' ? null : e),
});

const MedicalRecordCreatePage = () => {
    const { id: appointmentIdFromUrl } = useParams(); // Đổi tên để rõ ràng hơn, đây là ID từ URL
    const navigate = useNavigate();
    // const { user } = useAuth(); // Bỏ nếu không dùng

    const [appointment, setAppointment] = useState(null); // Sẽ chứa thông tin lịch hẹn đầy đủ
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmittingMedicalRecord, setIsSubmittingMedicalRecord] = useState(false);

    // Form cho Hồ sơ bệnh án
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        // setError: setFormError, // Bỏ nếu không dùng
    } = useForm({
        resolver: zodResolver(medicalRecordCreateSchema),
    });

    // Fetch thông tin lịch hẹn
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get(`/doctor/appointments/${appointmentIdFromUrl}/medical-record-form-data`);
            
            // SỬA Ở ĐÂY:
            const fetchedAppointment = response.data.appointment; 
            const fetchedMedicalRecord = response.data.medical_record;

            if (fetchedMedicalRecord) {
                // Nếu lịch hẹn đã có hồ sơ bệnh án, điều hướng sang trang chỉnh sửa
                toast.info('Lịch hẹn này đã có hồ sơ bệnh án. Bạn sẽ được chuyển hướng đến trang chỉnh sửa.');
                navigate(`/doctor/medical-records/${fetchedMedicalRecord.id}/form`, { replace: true });
                return; 
            }

            if (!fetchedAppointment) {
                // Trường hợp API trả về 200 nhưng không có appointment data
                setError('Không tìm thấy thông tin chi tiết cho lịch hẹn này.');
                setLoading(false);
                return;
            }

            setAppointment(fetchedAppointment);
            reset(); 

        } catch (err) {
            toast.error('Lỗi khi tải thông tin lịch hẹn.');
            console.error('Error fetching data:', err);
            let errorMessage = 'Không thể tải dữ liệu. Vui lòng thử lại.';
            if (err.response) {
                if (err.response.status === 403) {
                    errorMessage = 'Bạn không có quyền truy cập lịch hẹn này.';
                } else if (err.response.status === 404) {
                    errorMessage = 'Lịch hẹn không tồn tại.';
                } else if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [appointmentIdFromUrl, reset, navigate]);

    useEffect(() => {
        if (appointmentIdFromUrl) {
            fetchData();
        }
    }, [appointmentIdFromUrl, fetchData]);

    // Xử lý submit Form Hồ sơ bệnh án (Tạo mới)
    const onMedicalRecordFormSubmit = async (formData) => { // Đổi tên 'data' thành 'formData' cho rõ
        if (!appointment) {
            toast.error("Không có thông tin lịch hẹn để tạo hồ sơ. Vui lòng tải lại trang.");
            return;
        }
        setIsSubmittingMedicalRecord(true);
        try {
            // --- BƯỚC 1: TẠO HỒ SƠ BỆNH ÁN (POST) ---
            const payloadMedicalRecord = {
                ...formData,
                appointment_id: appointment.id, 
            };

            const responseMedicalRecord = await axiosInstance.post(
                `/doctor/appointments/${appointment.id}/medical-records`, 
                payloadMedicalRecord
            );
            
            // SỬA Ở ĐÂY:
            const newMedicalRecordId = responseMedicalRecord.data.medical_record.id; 
            toast.success(responseMedicalRecord.data.message || 'Hồ sơ bệnh án đã được tạo thành công!');

            // --- BƯỚC 2: CẬP NHẬT TRẠNG THÁI LỊCH HẸN (PATCH) ---
            try {
                // Backend có thể tự động chuyển COMPLETED -> PAYMENT_PENDING
                // Hoặc bạn gửi 'IN_PROGRESS' nếu đó là trạng thái mong muốn ngay sau khi tạo hồ sơ
                const payloadUpdateStatus = {
                    status: "COMPLETED" // Hoặc "IN_PROGRESS" tùy theo luồng của bạn
                };

                const responseUpdateStatus = await axiosInstance.patch(
                    `/doctor/appointments/${appointment.id}/status`, 
                    payloadUpdateStatus
                );
                toast.success(responseUpdateStatus.data.message || 'Trạng thái lịch hẹn đã được cập nhật!');

            } catch (errUpdateStatus) {
                console.error('Error updating appointment status:', errUpdateStatus);
                toast.error(
                    errUpdateStatus.response?.data?.message || 'Lỗi khi cập nhật trạng thái lịch hẹn.'
                );
                // Vẫn tiếp tục điều hướng dù bước này lỗi, vì hồ sơ đã tạo.
            }

            // --- BƯỚC 3: ĐIỀU HƯỚNG ---
            navigate(`/doctor/medical-records/${newMedicalRecordId}/form`, { replace: true });

        } catch (errCreateMedicalRecord) {
            console.error('Error saving medical record:', errCreateMedicalRecord);
            if (errCreateMedicalRecord.response?.data?.errors) {
                Object.values(errCreateMedicalRecord.response.data.errors).forEach((messages) => {
                    if (Array.isArray(messages)) {
                        messages.forEach(msg => toast.error(msg));
                    }
                });
            } else if (errCreateMedicalRecord.response?.data?.message) {
                toast.error(errCreateMedicalRecord.response.data.message);
            }
            else {
                toast.error('Đã xảy ra lỗi khi lưu hồ sơ bệnh án.');
            }
        } finally {
            setIsSubmittingMedicalRecord(false);
        }
    };

    if (loading) {
        return (
            <Container className="my-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p>Đang tải thông tin...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <MainLayout>
                <Container className="my-4">
                    <Alert variant="danger">{error}</Alert>
                    <Button variant="secondary" onClick={() => navigate('/doctor/appointments')} className="mt-3">
                        ← Quay lại lịch hẹn
                    </Button>
                </Container>
            </MainLayout>
        );
    }

    // `appointment` được kiểm tra sau `loading` và `error`
    // Nếu `fetchData` bị lỗi và set `error`, hoặc không fetch được `appointment`
    // thì `appointment` vẫn là `null`.
    if (!appointment) { 
        return (
            <MainLayout>
                <Container className="my-4">
                    <Alert variant="warning">Không tìm thấy thông tin lịch hẹn hoặc có lỗi xảy ra. Vui lòng thử lại.</Alert>
                    <Button variant="secondary" onClick={() => navigate('/doctor/appointments')} className="mt-3">
                        ← Quay lại lịch hẹn
                    </Button>
                </Container>
            </MainLayout>
        );
    }

    // Chỉ hiển thị thông tin nếu appointment đã được fetch thành công
    const patientInfo = appointment.patient?.name || 'N/A';
    const doctorInfo = appointment.doctor?.name || 'N/A';
    const clinicInfo = appointment.clinic?.name || 'N/A';
    const appointmentDateTime = appointment.appointment_date 
        ? `${appointment.appointment_date} ${appointment.appointment_time?.substring(0, 5) || ''}` 
        : 'N/A';

    return (

            <Container className="my-4">
                <Button variant="secondary" onClick={() => navigate('/doctor/appointments')} className="mb-3">
                    ← Quay lại lịch hẹn
                </Button>

                <h2>Khám bệnh cho Bệnh nhân: {patientInfo}</h2>
                <Card className="p-4 shadow-sm mb-4">
                    <Card.Title className="mb-3">Thông tin Lịch hẹn</Card.Title>
                    <Row>
                        <Col md={6}>
                            <p><strong>Bác sĩ:</strong> {doctorInfo}</p>
                            <p><strong>Thời gian:</strong> {appointmentDateTime}</p>
                        </Col>
                        <Col md={6}>
                            <p><strong>Phòng khám:</strong> {clinicInfo}</p>
                            <p><strong>Lý do khám:</strong> {appointment.reason || 'N/A'}</p>
                            <p><strong>Trạng thái hiện tại:</strong> <strong>{appointment.status}</strong></p>
                        </Col>
                    </Row>
                </Card>

                <Card className="p-4 shadow-sm mb-4">
                    <Card.Title className="mb-3">
                        <h4>Hồ sơ bệnh án (Tạo mới)</h4>
                    </Card.Title>
                    <Form onSubmit={handleSubmit(onMedicalRecordFormSubmit)}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Triệu chứng (bắt buộc)</Form.Label>
                                    <Form.Control as="textarea" rows={3} {...register('symptoms')} isInvalid={!!errors.symptoms} />
                                    <Form.Control.Feedback type="invalid">{errors.symptoms?.message}</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Chẩn đoán (bắt buộc)</Form.Label>
                                    <Form.Control as="textarea" rows={3} {...register('diagnosis')} isInvalid={!!errors.diagnosis} />
                                    <Form.Control.Feedback type="invalid">{errors.diagnosis?.message}</Form.Control.Feedback>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Kế hoạch điều trị</Form.Label>
                            <Form.Control as="textarea" rows={3} {...register('treatment_plan')} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ghi chú của bác sĩ</Form.Label>
                            <Form.Control as="textarea" rows={3} {...register('doctor_notes')} />
                        </Form.Group>

                        <h5 className="mt-4">Thông tin sinh hiệu (do điều dưỡng hoặc bác sĩ cập nhật):</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Mạch (bpm)</Form.Label>
                                    <Form.Control type="text" {...register('vitals_pulse')} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nhiệt độ (°C)</Form.Label>
                                    <Form.Control type="text" {...register('vitals_temperature')} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Huyết áp (mmHg)</Form.Label>
                                    <Form.Control type="text" {...register('vitals_blood_pressure')} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Cân nặng (kg)</Form.Label>
                                    <Form.Control type="text" {...register('vitals_weight')} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Chiều cao (cm)</Form.Label>
                            <Form.Control type="text" {...register('vitals_height')} />
                        </Form.Group>

                        <Button variant="primary" type="submit" disabled={isSubmittingMedicalRecord}>
                            {isSubmittingMedicalRecord ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                    Đang xử lý...
                                </>
                            ) : 'Tạo Hồ sơ và Hoàn tất Khám'}
                        </Button>
                    </Form>
                </Card>
            </Container>

    );
};

export default MedicalRecordCreatePage;