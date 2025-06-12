import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Alert, Tabs, Tab, Form, Row, Col, Button, Table, Card } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO, isValid } from 'date-fns'; // Đảm bảo isValid được import nếu dùng trong schema

const DepartmentReportsPage = () => {
    const [activeTab, setActiveTab] = useState('appointmentStats');
    const [loadingReport, setLoadingReport] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [error, setError] = useState(null);

    const [doctorsInDepartment, setDoctorsInDepartment] = useState([]);

    const getFirstDayOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const getCurrentDate = () => new Date();

    const [filterStartDate, setFilterStartDate] = useState(getFirstDayOfMonth());
    const [filterEndDate, setFilterEndDate] = useState(getCurrentDate());
    const [filterDoctorId, setFilterDoctorId] = useState('');

    const [reportData, setReportData] = useState(null);

    const fetchDepartmentDoctors = useCallback(async () => {
        setLoadingFilters(true);
        try {
            const staffRes = await axiosInstance.get('/hod/staff', { params: { with: 'roles', per_page: 1000 } });
            const staffList = staffRes.data.data || [];
            const departmentDoctorsList = staffList.filter(u =>
                u.roles && u.roles.some(role =>
                    ['DOCTOR', 'HEAD_OF_DEPARTMENT'].includes(typeof role === 'string' ? role : role.name)
                )
            );
            setDoctorsInDepartment(departmentDoctorsList);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách bác sĩ khoa.');
            console.error('Error fetching department doctors:', err);
            setDoctorsInDepartment([]);
        } finally {
            setLoadingFilters(false);
        }
    }, []);

    useEffect(() => {
        fetchDepartmentDoctors();
    }, [fetchDepartmentDoctors]);

    const fetchReportData = useCallback(async () => {
        if (!filterStartDate || !filterEndDate) {
            return;
        }
        setLoadingReport(true);
        setError(null);
        setReportData(null);
        try {
            const params = {
                start_date: format(filterStartDate, 'yyyy-MM-dd'),
                end_date: format(filterEndDate, 'yyyy-MM-dd'),
            };
            if (filterDoctorId) params.doctor_id = filterDoctorId;

            const reportEndpoint = '/hod/reports/stats';
            const res = await axiosInstance.get(reportEndpoint, { params });
            setReportData(res.data);
        } catch (err) {
            toast.error('Lỗi khi tải báo cáo khoa.');
            setError(err.response?.data?.message || 'Không thể tải báo cáo. Vui lòng thử lại.');
            setReportData(null);
        } finally {
            setLoadingReport(false);
        }
    }, [filterStartDate, filterEndDate, filterDoctorId]);

    useEffect(() => {
        if (!loadingFilters && filterStartDate && filterEndDate) {
            fetchReportData();
        }
    }, [fetchReportData, loadingFilters, filterStartDate, filterEndDate, activeTab]);


    const handleFilterReset = () => {
        setFilterStartDate(getFirstDayOfMonth());
        setFilterEndDate(getCurrentDate());
        setFilterDoctorId('');
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(parseFloat(amount))) return '0 VND'; // Xử lý kỹ hơn
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(amount));
    };

    const getPrimaryRoleName = (user) => {
        if (user && user.roles && user.roles.length > 0) {
            const firstRole = user.roles[0];
            return typeof firstRole === 'string' ? firstRole : firstRole?.name || 'N/A';
        }
        return 'N/A';
    };

    const renderFilters = () => (
        <Card className="mb-4 p-3 shadow-sm bg-light">
            {loadingFilters && <div className="text-center py-2"><Spinner size="sm"/> Đang tải bộ lọc...</div>}
            {!loadingFilters && (
                <>
                    <Row className="align-items-end">
                        <Col md={4} className="mb-2 mb-md-0">
                            <Form.Group><Form.Label>Từ ngày</Form.Label><DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} dateFormat="yyyy-MM-dd" className="form-control" maxDate={filterEndDate || new Date()} selectsStart startDate={filterStartDate} endDate={filterEndDate} /></Form.Group>
                        </Col>
                        <Col md={4} className="mb-2 mb-md-0">
                            <Form.Group><Form.Label>Đến ngày</Form.Label><DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} dateFormat="yyyy-MM-dd" className="form-control" minDate={filterStartDate} maxDate={new Date()} selectsEnd startDate={filterStartDate} endDate={filterEndDate} /></Form.Group>
                        </Col>
                        <Col md={4} className="mb-2 mb-md-0">
                            <Form.Group controlId="filterDoctorHODReports">
                                <Form.Label>Bác sĩ</Form.Label>
                                <Form.Select value={filterDoctorId} onChange={e => setFilterDoctorId(e.target.value)}>
                                    <option value="">Tất cả bác sĩ</option>
                                    {doctorsInDepartment.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} ({getPrimaryRoleName(doc)})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mt-3">
                        <Col className="text-end">
                            <Button variant="primary" onClick={fetchReportData} className="me-2" disabled={loadingReport || loadingFilters || !filterStartDate || !filterEndDate}>
                                {loadingReport ? <><Spinner size="sm" className="me-1"/>Đang xem...</> : "Xem Báo Cáo"}
                            </Button>
                            <Button variant="secondary" onClick={handleFilterReset} disabled={loadingReport || loadingFilters}>Reset Lọc</Button>
                        </Col>
                    </Row>
                </>
            )}
        </Card>
    );

    const renderRevenueReportContent = () => {
        // Kiểm tra reportData và các key cần thiết cho tab revenue
        if (!reportData || reportData.total_revenue_department === undefined || !reportData.details_appointments) {
            return <Alert variant="info">Không có dữ liệu doanh thu cho lựa chọn này hoặc dữ liệu chưa đúng định dạng.</Alert>;
        }
        // Lọc các lịch hẹn đã thanh toán từ details_appointments chung
        const paidAppointments = reportData.details_appointments.filter(appt => appt.status === 'PAID') || [];

        return (
            <>
                <h4 className="my-3">Tổng doanh thu khoa (từ lịch hẹn đã thanh toán): {formatCurrency(reportData.total_revenue_department)}</h4>
                {paidAppointments.length > 0 ? (
                     <Table striped bordered hover responsive className="shadow-sm">
                        <thead>
                            <tr>
                                <th>ID Lịch hẹn</th>
                                <th>Bệnh nhân</th>
                                <th>Bác sĩ</th>
                                <th>Chuyên khoa</th>
                                <th>Ngày Thanh Toán</th>
                                <th>Số tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paidAppointments.map(appt => (
                                <tr key={`revenue-${appt.appointment_id}`}>
                                    <td>{appt.appointment_id}</td>
                                    <td>{appt.patient_name || 'N/A'}</td>
                                    <td>{appt.doctor_name || 'N/A'}</td>
                                    <td>{appt.doctor_specialization || 'N/A'}</td>
                                    {/* Sử dụng payment_date từ API nếu có, nếu không thì dùng appointment_date */}
                                    <td>{appt.payment_date ? format(parseISO(appt.payment_date), 'dd/MM/yyyy HH:mm') : (appt.appointment_date ? format(parseISO(appt.appointment_date), 'dd/MM/yyyy') : 'N/A')}</td>
                                    {/* Đảm bảo backend trả về key chứa số tiền, ví dụ 'payment_amount' */}
                                    <td>{formatCurrency(appt.payment_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (<Alert variant="info">Không có giao dịch thanh toán nào trong khoảng thời gian và bộ lọc đã chọn.</Alert>)}
            </>
        );
    };

    const renderAppointmentStatsReportContent = () => {
        // Kiểm tra reportData và các key cần thiết cho tab appointmentStats
        if (!reportData || reportData.total_completed_appointments === undefined || !reportData.appointments_by_status || !reportData.details_appointments) {
            return <Alert variant="info">Không có dữ liệu thống kê lịch hẹn cho lựa chọn này hoặc dữ liệu chưa đúng định dạng.</Alert>;
        }
        return (
            <>
                <h4 className="my-3">Tổng lượt khám đã xử lý (Hoàn thành/Đã thanh toán): {reportData.total_completed_appointments || 0}</h4>
                <h5 className="mt-4">Thống kê theo trạng thái:</h5>
                <Table striped bordered hover responsive className="shadow-sm mb-4">
                    <thead><tr><th>Trạng thái</th><th>Số lượng</th></tr></thead>
                    <tbody>
                        {Object.keys(reportData.appointments_by_status).length > 0 ?
                            Object.entries(reportData.appointments_by_status).map(([status, count]) => (
                                <tr key={`status-${status}`}><td>{status}</td><td>{count}</td></tr>
                            )) :
                            <tr><td colSpan="2" className="text-center">Không có dữ liệu.</td></tr>
                        }
                    </tbody>
                </Table>
                <h5 className="mt-4">Chi tiết lịch hẹn (tất cả trạng thái theo bộ lọc):</h5>
                {reportData.details_appointments.length > 0 ? (
                    <Table striped bordered hover responsive className="shadow-sm">
                        <thead><tr><th>ID Lịch hẹn</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Chuyên khoa</th><th>Ngày hẹn</th><th>Trạng thái</th></tr></thead>
                        <tbody>
                            {reportData.details_appointments.map(appt => (
                                <tr key={`detail-${appt.appointment_id}`}>
                                    <td>{appt.appointment_id}</td>
                                    <td>{appt.patient_name || 'N/A'}</td>
                                    <td>{appt.doctor_name || 'N/A'}</td>
                                    <td>{appt.doctor_specialization || 'N/A'}</td>
                                    <td>{appt.appointment_date ? format(parseISO(appt.appointment_date), 'dd/MM/yyyy') : 'N/A'}</td>
                                    <td>{appt.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (<Alert variant="info">Không có chi tiết lịch hẹn nào.</Alert>)}
            </>
        );
    };

    const renderContentByTab = () => {
        if (loadingReport) return <div className="text-center my-3"><Spinner animation="border" /><p>Đang tải báo cáo...</p></div>;
        if (!reportData && !error && !loadingFilters) return <Alert variant="info">Vui lòng chọn bộ lọc và nhấn "Xem Báo Cáo" để tải dữ liệu.</Alert>;
        if (error && !reportData) return null; // Lỗi tổng thể đã được hiển thị ở trên bởi <Alert variant="danger">{error}</Alert>

        if (activeTab === 'revenue') {
            return renderRevenueReportContent();
        }
        if (activeTab === 'appointmentStats') {
            return renderAppointmentStatsReportContent();
        }
        return null;
    };

    return (
            <Container className="my-4">
                <h2>Báo cáo Khoa</h2>
                {renderFilters()}
                {/* Hiển thị lỗi tổng nếu có và không đang loading report */}
                {!loadingReport && error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => {
                        setActiveTab(k);
                        // Không cần setReportData(null) ở đây vì fetchReportData đã làm
                        // useEffect sẽ tự động gọi fetchReportData khi activeTab thay đổi
                    }}
                    className="mb-3 mt-4"
                >
                    <Tab eventKey="revenue" title="Báo cáo Doanh thu Khoa">
                        {renderContentByTab()}
                    </Tab>
                    <Tab eventKey="appointmentStats" title="Thống kê Lịch hẹn Khoa">
                        {renderContentByTab()}
                    </Tab>
                </Tabs>
            </Container>
    );
};

export default DepartmentReportsPage;