import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Card, Row, Col, Form, Badge } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

const DispensingPage = () => {
    const [pendingPrescriptions, setPendingPrescriptions] = useState([]); // Đổi tên để rõ ràng hơn
    const [dispensedPrescriptions, setDispensedPrescriptions] = useState([]); // Danh sách đã cấp phát
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);

    // Filter states
    const [filterDoctorId, setFilterDoctorId] = useState('');
    const [filterPatientId, setFilterPatientId] = useState('');
    const [filterDate, setFilterDate] = useState(null); // Dùng chung cho cả hai tab
    const [activeTab, setActiveTab] = useState('pending'); // State mới để quản lý tab

    // Fetch doctors and patients for filters once on component mount
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const response = await axiosInstance.get('/nurse/filter-users');
                setDoctors(response.data.doctors);
                setPatients(response.data.patients);
            } catch (err) {
                console.error('Error fetching filter options:', err);
                toast.error(err.response?.data?.message || 'Lỗi khi tải dữ liệu lọc.');
            }
        };
        fetchFilterOptions();
    }, []);

    // Hàm chung để fetch prescriptions dựa trên activeTab
    const fetchPrescriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (filterDoctorId) params.doctor_id = filterDoctorId;
            if (filterPatientId) params.patient_id = filterPatientId;

            // Date filter sẽ áp dụng khác nhau cho mỗi tab
            if (activeTab === 'pending' && filterDate) {
                params.date = format(filterDate, 'yyyy-MM-dd'); // Lọc theo ngày kê đơn cho Pending
            } else if (activeTab === 'dispensed' && filterDate) {
                params.date = format(filterDate, 'yyyy-MM-dd'); // Lọc theo ngày cấp phát cho Dispensed
            }

            let url = `/nurse/prescriptions/pending-dispense`;
            if (activeTab === 'dispensed') {
                url = `/nurse/prescriptions/dispensed`;
            }

            const response = await axiosInstance.get(url, {
                params: { ...params, with: 'medicalRecord.patient,doctor,items.medicine' }
            });

            if (activeTab === 'pending') {
                setPendingPrescriptions(response.data.data);
            } else {
                setDispensedPrescriptions(response.data.data);
            }

        } catch (err) {
            toast.error(`Lỗi khi tải danh sách đơn thuốc ${activeTab === 'pending' ? 'chờ cấp phát' : 'đã cấp phát'}.`);
            console.error(`Error fetching ${activeTab} prescriptions:`, err);
            setError(err.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetchPrescriptions khi tab hoặc filter thay đổi
    useEffect(() => {
        fetchPrescriptions();
    }, [activeTab, filterDoctorId, filterPatientId, filterDate]); // Thêm activeTab vào dependency array

    const handleConfirmDispensed = async (prescription) => {
        if (window.confirm(`Bạn có chắc chắn muốn xác nhận đã cấp phát thuốc cho đơn này của bệnh nhân ${prescription.medical_record?.patient?.name}?`)) {
            try {
                const response = await axiosInstance.post(`/nurse/prescriptions/${prescription.id}/confirm-dispensed`);
                toast.success(response.data.message || 'Xác nhận cấp phát thành công!');

                // Cập nhật UI ngay lập tức: xóa khỏi pending, thêm vào dispensed
                setPendingPrescriptions(prev => prev.filter(p => p.id !== prescription.id));
                setDispensedPrescriptions(prev => [
                    { ...prescription, is_dispensed: true, dispensed_at: response.data.dispensed_at }, // Thêm dữ liệu mới nhận được
                    ...prev
                ].sort((a,b) => new Date(b.dispensed_at) - new Date(a.dispensed_at))); // Sắp xếp lại nếu cần

            } catch (err) {
                console.error('Error confirming dispensed:', err);
                toast.error(err.response?.data?.message || 'Không thể xác nhận cấp phát.');
            }
        }
    };

    // Hàm render hàng cho danh sách CHỜ CẤP PHÁT
    const renderPendingPrescriptionRow = (prescription) => (
        <tr key={prescription.id}>
            <td>{prescription.id}</td>
            <td>{prescription.medical_record?.patient?.name || 'N/A'}</td>
            <td>{prescription.doctor?.name || 'N/A'}</td>
            <td>{prescription.date_prescribed ? format(new Date(prescription.date_prescribed), 'dd/MM/yyyy') : 'N/A'}</td>
            <td>
                {prescription.items && prescription.items.length > 0 ? (
                    prescription.items.map(item => (
                        <div key={item.id}>
                            {item.medicine?.name || 'N/A'} ({item.quantity} {item.medicine?.unit || 'N/A'}) - {item.dosage}
                        </div>
                    ))
                ) : 'N/A'}
            </td>
            <td>{prescription.notes || 'N/A'}</td>
            <td>
                <Button variant="success" size="sm" onClick={() => handleConfirmDispensed(prescription)}>
                    Xác nhận cấp phát
                </Button>
            </td>
        </tr>
    );

    // Hàm render hàng cho danh sách ĐÃ CẤP PHÁT
    const renderDispensedPrescriptionRow = (prescription) => (
        <tr key={prescription.id}>
            <td>{prescription.id}</td>
            <td>{prescription.medical_record?.patient?.name || 'N/A'}</td>
            <td>{prescription.doctor?.name || 'N/A'}</td>
            <td>{prescription.date_prescribed ? format(new Date(prescription.date_prescribed), 'dd/MM/yyyy') : 'N/A'}</td>
            <td>
                {prescription.items && prescription.items.length > 0 ? (
                    prescription.items.map(item => (
                        <div key={item.id}>
                            {item.medicine?.name || 'N/A'} ({item.quantity} {item.medicine?.unit || 'N/A'}) - {item.dosage}
                        </div>
                    ))
                ) : 'N/A'}
            </td>
            <td>{prescription.notes || 'N/A'}</td>
        </tr>
    );

    return (
            <Container className="my-4">
                <h2>Quản lý Cấp phát Thuốc</h2>

                {/* Tabs for switching between Pending and Dispensed */}
                <div className="mb-3">
                    <Button
                        variant={activeTab === 'pending' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('pending')}
                        className="me-2"
                    >
                        Chờ cấp phát
                    </Button>
                    <Button
                        variant={activeTab === 'dispensed' ? 'primary' : 'outline-primary'}
                        onClick={() => setActiveTab('dispensed')}
                    >
                        Đã cấp phát
                    </Button>
                </div>

                {/* Filter Section */}
                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={3}>
                            <Form.Group controlId="filterDoctor">
                                <Form.Label>Bác sĩ kê đơn</Form.Label>
                                <Form.Select value={filterDoctorId} onChange={(e) => setFilterDoctorId(e.target.value)}>
                                    <option value="">Tất cả</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="filterPatient">
                                <Form.Label>Bệnh nhân</Form.Label>
                                <Form.Select value={filterPatientId} onChange={(e) => setFilterPatientId(e.target.value)}>
                                    <option value="">Tất cả</option>
                                    {patients.map(pat => (
                                        <option key={pat.id} value={pat.id}>{pat.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="filterDate">
                                <Form.Label>Ngày {activeTab === 'pending' ? 'kê đơn' : 'cấp phát'}</Form.Label>
                                <DatePicker
                                    selected={filterDate}
                                    onChange={(date) => setFilterDate(date)}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control"
                                    isClearable
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Button variant="secondary" onClick={() => { setFilterDoctorId(''); setFilterPatientId(''); setFilterDate(null); }} className="w-100">
                                Reset Lọc
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* Conditional Rendering for Tables */}
                {activeTab === 'pending' && (
                    pendingPrescriptions.length > 0 ? (
                        <Table striped bordered hover responsive className="mt-4 shadow-sm">
                            <thead>
                                <tr>
                                    <th>ID Đơn</th>
                                    <th>Bệnh nhân</th>
                                    <th>Bác sĩ kê đơn</th>
                                    <th>Ngày kê đơn</th>
                                    <th>Chi tiết thuốc</th>
                                    <th>Ghi chú đơn</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingPrescriptions.map(renderPendingPrescriptionRow)}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert variant="info" className="mt-4">Không có đơn thuốc nào chờ cấp phát.</Alert>
                    )
                )}

                {activeTab === 'dispensed' && (
                    dispensedPrescriptions.length > 0 ? (
                        <Table striped bordered hover responsive className="mt-4 shadow-sm">
                            <thead>
                                <tr>
                                    <th>ID Đơn</th>
                                    <th>Bệnh nhân</th>
                                    <th>Bác sĩ kê đơn</th>
                                    <th>Ngày kê đơn</th>
                                    <th>Chi tiết thuốc</th>
                                    <th>Ghi chú đơn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dispensedPrescriptions.map(renderDispensedPrescriptionRow)}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert variant="info" className="mt-4">Không có đơn thuốc nào đã cấp phát.</Alert>
                    )
                )}
            </Container>
    );
};

export default DispensingPage;