import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import MainLayout from '../../../components/layouts/MainLayout';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import PrescriptionForm from '../components/PrescriptionForm';

// Schema validation cho hồ sơ bệnh án
const medicalRecordSchema = z.object({
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

const MedicalRecordFormPage = () => {
    const { id: appointmentId } = useParams(); // Lấy appointmentId từ URL
    const navigate = useNavigate();
    const { user } = useAuth();

    const [appointment, setAppointment] = useState(null);
    const [medicalRecord, setMedicalRecord] = useState(null); // Hồ sơ bệnh án hiện tại (nếu có)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmittingMedicalRecord, setIsSubmittingMedicalRecord] = useState(false);
    const [isCompletingAppointment, setIsCompletingAppointment] = useState(false);

    // Form cho Hồ sơ bệnh án
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setError: setFormError,
        setValue // <-- THÊM setValue để điền giá trị
    } = useForm({
        resolver: zodResolver(medicalRecordSchema),
    });

    // Hàm format tiền tệ
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Fetch thông tin lịch hẹn và hồ sơ bệnh án (nếu có)
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get(`/doctor/appointments/${appointmentId}/medical-record-form-data`);
            const fetchedAppointment = response.data.appointment.data;
            const fetchedMedicalRecord = response.data.medical_record?.data;

            setAppointment(fetchedAppointment);
            setMedicalRecord(fetchedMedicalRecord);

            // Điền form với dữ liệu hồ sơ bệnh án hiện có nếu tồn tại
            if (fetchedMedicalRecord) {
                // Sử dụng setValue để điền các trường form
                setValue('symptoms', fetchedMedicalRecord.symptoms || '');
                setValue('diagnosis', fetchedMedicalRecord.diagnosis || '');
                setValue('treatment_plan', fetchedMedicalRecord.treatment_plan || '');
                setValue('doctor_notes', fetchedMedicalRecord.doctor_notes || '');
                setValue('vitals_pulse', fetchedMedicalRecord.vitals_pulse || '');
                setValue('vitals_temperature', fetchedMedicalRecord.vitals_temperature || '');
                setValue('vitals_blood_pressure', fetchedMedicalRecord.vitals_blood_pressure || '');
                setValue('vitals_weight', fetchedMedicalRecord.vitals_weight || '');
                setValue('vitals_height', fetchedMedicalRecord.vitals_height || '');
            } else {
                reset(); // Reset form về trạng thái rỗng nếu chưa có MR
            }

        } catch (err) {
            toast.error('Lỗi khi tải thông tin lịch hẹn hoặc hồ sơ bệnh án.');
            console.error('Error fetching data:', err);
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
            if (err.response && err.response.status === 403) {
                 setError('Bạn không có quyền truy cập lịch hẹn này.');
            } else if (err.response && err.response.status === 404) {
                 setError('Lịch hẹn không tồn tại.');
            }
        } finally {
            setLoading(false);
        }
    }, [appointmentId, reset, setValue]); // Thêm setValue vào dependency array

    useEffect(() => {
        if (appointmentId) {
            fetchData();
        }
    }, [appointmentId, fetchData]);

    // Xử lý submit form Hồ sơ bệnh án (Tạo mới hoặc Cập nhật)
    const onMedicalRecordFormSubmit = async (data) => {
        if (!appointment) return;
        setIsSubmittingMedicalRecord(true);
        try {
            const payload = {
                ...data,
                appointment_id: appointment.id,
            };

            let response;
            if (medicalRecord) {
                // Cập nhật hồ sơ bệnh án (PATCH)
                response = await axiosInstance.patch(`/doctor/medical-records/${medicalRecord.id}`, payload);
                toast.success(response.data.message || 'Hồ sơ bệnh án đã được cập nhật!');
            } else {
                // Tạo mới hồ sơ bệnh án (POST)
                response = await axiosInstance.post(`/doctor/appointments/${appointment.id}/medical-records`, payload);
                toast.success(response.data.message || 'Hồ sơ bệnh án đã được tạo!');
            }
            setMedicalRecord(response.data.medical_record.data); // Cập nhật state medicalRecord

        } catch (err) {
            console.error('Error saving medical record:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else {
                toast.error(err.response.data.message || 'Đã xảy ra lỗi khi lưu hồ sơ bệnh án.');
            }
        } finally {
            setIsSubmittingMedicalRecord(false);
        }
    };

    // Xử lý submit đơn thuốc (được gọi từ PrescriptionForm)
    const handlePrescriptionSubmit = async (prescriptionPayload) => {
        if (!medicalRecord) {
            toast.error('Vui lòng lưu hồ sơ bệnh án trước khi kê đơn.');
            return;
        }
        setIsSubmittingMedicalRecord(true); // Dùng lại state submit
        try {
            const response = await axiosInstance.post(`/doctor/medical-records/${medicalRecord.id}/prescriptions`, prescriptionPayload);
            toast.success(response.data.message || 'Đơn thuốc đã được kê thành công!');
            fetchData(); // Fetch lại toàn bộ dữ liệu trang để cập nhật đơn thuốc
        } catch (err) {
            console.error('Error submitting prescription:', err);
            if (err.response && err.response.data && err.response.data.errors) {
                Object.values(err.response.data.errors).forEach(messages => {
                    messages.forEach(msg => toast.error(msg));
                });
            } else {
                toast.error(err.response.data.message || 'Đã xảy ra lỗi khi kê đơn.');
            }
        } finally {
            setIsSubmittingMedicalRecord(false);
        }
    };

    // Xử lý nút "Hoàn tất khám"
    const handleCompleteAppointment = async () => {
        if (!appointment) return;
        if (!medicalRecord) { // Yêu cầu phải có MR trước khi hoàn tất khám
            toast.error('Vui lòng tạo hồ sơ bệnh án trước khi hoàn tất khám.');
            return;
        }
        setIsCompletingAppointment(true);
        try {
            const payload = { status: 'COMPLETED' };
            const response = await axiosInstance.patch(`/doctor/appointments/${appointment.id}/status`, payload);
            toast.success(response.data.message || 'Lịch hẹn đã được hoàn tất và chuyển sang chờ thanh toán!');
            navigate('/doctor/appointments');
        } catch (err) {
            console.error('Error completing appointment:', err);
            toast.error(err.response?.data?.message || 'Đã xảy ra lỗi khi hoàn tất khám.');
        } finally {
            setIsCompletingAppointment(false);
        }
    };


    if (loading) {
        return (
            <MainLayout>
                <Container className="my-4 text-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                    <p>Đang tải thông tin...</p>
                </Container>
            </MainLayout>
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

    if (!appointment) {
        return (
            <MainLayout>
                <Container className="my-4">
                    <Alert variant="warning">Không tìm thấy lịch hẹn hoặc không có quyền truy cập.</Alert>
                    <Button variant="secondary" onClick={() => navigate('/doctor/appointments')} className="mt-3">
                        ← Quay lại lịch hẹn
                    </Button>
                </Container>
            </MainLayout>
        );
    }

    const patientInfo = appointment.patient?.name || 'N/A';
    const doctorInfo = appointment.doctor?.name || 'N/A';
    const clinicInfo = appointment.clinic?.name || 'N/A';
    const appointmentDateTime = appointment.appointment_date ? `${appointment.appointment_date} ${appointment.appointment_time?.substring(0, 5)}` : 'N/A';

    return (
        <MainLayout>
            <Container className="my-4">
                <Button variant="secondary" onClick={() => navigate('/doctor/appointments')} className="mb-3">
                    ← Quay lại lịch hẹn
                </Button>

                <h2>Khám bệnh cho Bệnh nhân {patientInfo}</h2>
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
                            <p><strong>Trạng thái:</strong> <strong>{appointment.status}</strong></p>
                        </Col>
                    </Row>
                </Card>

                {/* Form Hồ sơ bệnh án */}
                <Card className="p-4 shadow-sm mb-4">
                    <Card.Title className="mb-3">
                        <h4>Hồ sơ bệnh án {medicalRecord ? '(Đã có)' : '(Tạo mới)'}</h4>
                    </Card.Title>
                    <Form onSubmit={handleSubmit(onMedicalRecordFormSubmit)}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Triệu chứng (bắt buộc)</Form.Label>
                                    <Form.Control as="textarea" rows={3} {...register('symptoms')} />
                                    {errors.symptoms && <Alert variant="danger" className="mt-2 p-2">{errors.symptoms.message}</Alert>}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Chẩn đoán (bắt buộc)</Form.Label>
                                    <Form.Control as="textarea" rows={3} {...register('diagnosis')} />
                                    {errors.diagnosis && <Alert variant="danger" className="mt-2 p-2">{errors.diagnosis.message}</Alert>}
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

                        {/* Thông tin sinh hiệu */}
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

                        {/* Nút lưu/cập nhật hồ sơ bệnh án */}
                        <Button variant="primary" type="submit" disabled={isSubmittingMedicalRecord}>
                            {isSubmittingMedicalRecord ? 'Đang lưu Hồ sơ...' : (medicalRecord ? 'Cập nhật Hồ sơ bệnh án' : 'Lưu Hồ sơ bệnh án')}
                        </Button>
                    </Form>
                </Card>

                {/* Hiển thị các đơn thuốc đã kê (nếu có) */}
                {medicalRecord?.prescriptions && medicalRecord.prescriptions.length > 0 && (
                    <Card className="p-4 shadow-sm mb-4">
                        <h4>Đơn thuốc đã kê</h4>
                        {medicalRecord.prescriptions.map((prescription) => (
                            <div key={prescription.id} className="mb-4">
                                <p className="mb-2"><em>Kê đơn ngày: {prescription.date_prescribed ? format(new Date(prescription.date_prescribed), 'dd/MM/yyyy') : 'N/A'}</em></p>
                                {prescription.notes && <p className="mb-2"><em>Ghi chú đơn thuốc: {prescription.notes}</em></p>}
                                <Table striped bordered hover responsive size="sm">
                                    <thead>
                                        <tr>
                                            <th>Tên thuốc</th>
                                            <th>Hàm lượng</th>
                                            <th>Đơn vị</th>
                                            <th>Giá</th>
                                            <th>Liều dùng</th>
                                            <th>Số lượng</th>
                                            <th>Tổng tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {prescription.items && prescription.items.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.medicine?.name || 'N/A'}</td>
                                                <td>{item.medicine?.concentration || 'N/A'}</td>
                                                <td>{item.medicine?.unit || 'N/A'}</td>
                                                <td>{formatCurrency(item.medicine?.price || 0)}</td>
                                                <td>{item.dosage}</td>
                                                <td>{item.quantity}</td>
                                                <td>{formatCurrency((item.quantity || 0) * (item.medicine?.price || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ))}
                    </Card>
                )}

                {/* Form kê đơn thuốc mới (chỉ hiển thị nếu đã có medicalRecord) */}
                {medicalRecord && (
                    <Card className="p-4 shadow-sm mb-4">
                        <Card.Title className="mb-3">Kê đơn thuốc mới</Card.Title>
                        <PrescriptionForm
                            medicalRecordId={medicalRecord.id}
                            onSubmit={handlePrescriptionSubmit}
                            isSubmitting={isSubmittingMedicalRecord}
                        />
                    </Card>
                )}
                
                {/* Nút Hoàn tất khám (nếu lịch hẹn là APPROVED và MR đã có) */}
                {appointment.status === 'APPROVED' && medicalRecord && (
                    <div className="text-end mt-4">
                        <Button variant="success" onClick={handleCompleteAppointment} disabled={isCompletingAppointment}>
                            {isCompletingAppointment ? 'Đang hoàn tất...' : 'Hoàn tất khám'}
                        </Button>
                    </div>
                )}
            </Container>
        </MainLayout>
    );
};

export default MedicalRecordFormPage;