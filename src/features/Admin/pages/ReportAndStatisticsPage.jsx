import React, { useState, useEffect, useCallback } from 'react'; // Thêm useCallback
import { Container, Spinner, Alert, Tabs, Tab, Form, Row, Col, Button, Table, Card } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';

const ReportAndStatisticsPage = () => {
    const [activeTab, setActiveTab] = useState('revenue');
    const [loadingReport, setLoadingReport] = useState(false); // Loading cho báo cáo chính
    const [loadingFilters, setLoadingFilters] = useState(true); // Loading cho dữ liệu filter
    const [error, setError] = useState(null);

    const [doctors, setDoctors] = useState([]);
    const [specializations, setSpecializations] = useState([]);

    const defaultStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const defaultEndDate = new Date();

    const [filterStartDate, setFilterStartDate] = useState(defaultStartDate);
    const [filterEndDate, setFilterEndDate] = useState(defaultEndDate);
    const [filterDoctorId, setFilterDoctorId] = useState('');
    const [filterSpecialization, setFilterSpecialization] = useState('');

    const [revenueData, setRevenueData] = useState(null);
    const [appointmentStatsData, setAppointmentStatsData] = useState(null);

    // Hàm dịch trạng thái sang tiếng Việt
    const translateStatus = (status) => {
        const statusMap = {
            'PENDING_APPROVAL': 'Chờ phê duyệt',
            'APPROVED': 'Đã phê duyệt',
            'CANCELLED_BY_PATIENT': 'Bệnh nhân hủy',
            'PAYMENT_PENDING': 'Chờ thanh toán',
            'PAID': 'Đã thanh toán'
        };
        return statusMap[status] || status;
    };

    const fetchFilterData = useCallback(async () => {
        setLoadingFilters(true);
        try {
            const usersRes = await axiosInstance.get('/admin/users', {
                params: { role_names: 'DOCTOR,HEAD_OF_DEPARTMENT', per_page: 1000, with: 'doctorProfile,roles' } // Eager load
            });
            const fetchedUsers = usersRes.data.data || [];
            const doctorsList = fetchedUsers.filter(u =>
                u.roles && u.roles.some(role =>
                    ['DOCTOR', 'HEAD_OF_DEPARTMENT'].includes(typeof role === 'string' ? role : role.name)
                )
            );
            setDoctors(doctorsList);

            const specs = new Set();
            doctorsList.forEach(doc => {
                if (doc.doctor_profile && doc.doctor_profile.specialization) {
                    specs.add(doc.doctor_profile.specialization);
                }
            });
            setSpecializations(Array.from(specs).sort());
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu bác sĩ/chuyên khoa.');
            console.error('Error fetching filter data:', err);
        } finally {
            setLoadingFilters(false);
        }
    }, []); // Chỉ chạy 1 lần

    useEffect(() => {
        fetchFilterData();
    }, [fetchFilterData]);


    const fetchReportData = useCallback(async () => {
        if (!filterStartDate || !filterEndDate) {
            // toast.info("Vui lòng chọn khoảng thời gian để xem báo cáo.");
            return;
        }
        setLoadingReport(true);
        setError(null);
        setRevenueData(null); // Reset data cũ
        setAppointmentStatsData(null); // Reset data cũ
        try {
            const params = {
                start_date: format(filterStartDate, 'yyyy-MM-dd'),
                end_date: format(filterEndDate, 'yyyy-MM-dd'),
            };
            if (filterDoctorId) params.doctor_id = filterDoctorId;
            if (filterSpecialization) params.specialization = filterSpecialization;

            let reportEndpoint = '';
            if (activeTab === 'revenue') {
                reportEndpoint = '/admin/reports/revenue';
            } else if (activeTab === 'appointmentStats') {
                reportEndpoint = '/admin/reports/appointment-stats';
            }

            if (reportEndpoint) {
                const res = await axiosInstance.get(reportEndpoint, { params });
                if (activeTab === 'revenue') setRevenueData(res.data);
                if (activeTab === 'appointmentStats') setAppointmentStatsData(res.data);
            }
        } catch (err) {
            toast.error(`Lỗi khi tải báo cáo ${activeTab === 'revenue' ? 'doanh thu' : 'lịch hẹn'}.`);
            setError('Không thể tải báo cáo. Vui lòng thử lại.');
        } finally {
            setLoadingReport(false);
        }
    }, [activeTab, filterStartDate, filterEndDate, filterDoctorId, filterSpecialization]);


    // Fetch report data when tab or filters change
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]); // fetchData là dependency đã được useCallback


    const handleFilterReset = () => {
        setFilterStartDate(defaultStartDate);
        setFilterEndDate(defaultEndDate);
        setFilterDoctorId('');
        setFilterSpecialization('');
        // fetchReportData sẽ tự chạy lại do dependencies thay đổi
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const renderFilters = () => (
        <Card className="mb-4 p-3 shadow-sm bg-light">
            {loadingFilters && <div className="text-center"><Spinner size="sm"/> Đang tải bộ lọc...</div>}
            {!loadingFilters && (
                <>
                    <Row className="align-items-end">
                        <Col md={3}><Form.Group><Form.Label>Từ ngày</Form.Label><DatePicker selected={filterStartDate} onChange={date => setFilterStartDate(date)} dateFormat="yyyy-MM-dd" className="form-control" maxDate={filterEndDate || new Date()} selectsStart startDate={filterStartDate} endDate={filterEndDate} /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>Đến ngày</Form.Label><DatePicker selected={filterEndDate} onChange={date => setFilterEndDate(date)} dateFormat="yyyy-MM-dd" className="form-control" minDate={filterStartDate} maxDate={new Date()} selectsEnd startDate={filterStartDate} endDate={filterEndDate} /></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>Bác sĩ</Form.Label><Form.Select value={filterDoctorId} onChange={e => setFilterDoctorId(e.target.value)}><option value="">Tất cả bác sĩ</option>{doctors.map(doc => (<option key={doc.id} value={doc.id}>{doc.name} {doc.roles && doc.roles.length > 0 && `(${(typeof doc.roles[0] === 'string' ? doc.roles[0] : doc.roles[0]?.name)})`}</option>))}</Form.Select></Form.Group></Col>
                        <Col md={3}><Form.Group><Form.Label>Chuyên khoa</Form.Label><Form.Select value={filterSpecialization} onChange={e => setFilterSpecialization(e.target.value)}><option value="">Tất cả chuyên khoa</option>{specializations.map(spec => (<option key={spec} value={spec}>{spec}</option>))}</Form.Select></Form.Group></Col>
                    </Row>
                    <Row className="mt-3">
                        <Col className="text-end">
                            <Button variant="primary" onClick={fetchReportData} className="me-2" disabled={loadingReport}>
                                {loadingReport ? <><Spinner size="sm" className="me-1"/>Đang tải...</> : "Xem Báo Cáo"}
                            </Button>
                            <Button variant="secondary" onClick={handleFilterReset} disabled={loadingReport}>Reset Lọc</Button>
                        </Col>
                    </Row>
                </>
            )}
        </Card>
    );

    const renderRevenueReport = () => {
        if (loadingReport) return <div className="text-center my-3"><Spinner animation="border" /><p>Đang tải báo cáo doanh thu...</p></div>;
        if (!revenueData && !error) return <Alert variant="info">Chọn bộ lọc và nhấn "Xem Báo Cáo" để tải dữ liệu.</Alert>;
        if (error && !revenueData) return null; // Lỗi đã được hiển thị ở trên
        if (!revenueData) return <Alert variant="info">Không có dữ liệu doanh thu cho lựa chọn này.</Alert>;

        return (
            <>
                <h4 className="my-3">Tổng doanh thu: {formatCurrency(revenueData.total_revenue)}</h4>
                {revenueData.payments && revenueData.payments.length > 0 ? (
                    <Table striped bordered hover responsive className="shadow-sm">
                        <thead><tr><th>ID Giao dịch</th><th>Ngày thanh toán</th><th>Bác sĩ</th><th>Chuyên khoa</th><th>Số tiền</th><th>Phương thức</th></tr></thead>
                        <tbody>
                            {revenueData.payments.map(p => (<tr key={p.payment_id}><td>{p.payment_id}</td><td>{p.payment_date ? format(parseISO(p.payment_date), 'dd/MM/yyyy HH:mm') : 'N/A'}</td><td>{p.doctor_name || 'N/A'}</td><td>{p.doctor_specialization || 'N/A'}</td><td>{formatCurrency(p.amount)}</td><td>{p.payment_method || 'N/A'}</td></tr>))}
                        </tbody>
                    </Table>
                ) : (<Alert variant="info">Không có giao dịch thanh toán nào trong khoảng thời gian và bộ lọc đã chọn.</Alert>)}
            </>
        );
    };

    const renderAppointmentStatsReport = () => {
        if (loadingReport) return <div className="text-center my-3"><Spinner animation="border" /><p>Đang tải thống kê lịch hẹn...</p></div>;
        if (!appointmentStatsData && !error) return <Alert variant="info">Chọn bộ lọc và nhấn "Xem Báo Cáo" để tải dữ liệu.</Alert>;
        if (error && !appointmentStatsData) return null;
        if (!appointmentStatsData) return <Alert variant="info">Không có dữ liệu thống kê lịch hẹn cho lựa chọn này.</Alert>;

        return (
            <>
                <h4 className="my-3">Tổng lượt khám (Hoàn thành/Đã thanh toán): {appointmentStatsData.total_completed_appointments}</h4>
                <h5 className="mt-4">Thống kê theo trạng thái:</h5>
                <Table striped bordered hover responsive className="shadow-sm mb-4">
                    <thead><tr><th>Trạng thái</th><th>Số lượng</th></tr></thead>
                    <tbody>
                        {Object.keys(appointmentStatsData.appointments_by_status || {}).length > 0 ? Object.entries(appointmentStatsData.appointments_by_status).map(([status, count]) => (<tr key={status}><td>{translateStatus(status)}</td><td>{count}</td></tr>)) : <tr><td colSpan="2" className="text-center">Không có dữ liệu.</td></tr>}
                    </tbody>
                </Table>
                <h5 className="mt-4">Chi tiết lịch hẹn:</h5>
                {appointmentStatsData.details_appointments && appointmentStatsData.details_appointments.length > 0 ? (
                    <Table striped bordered hover responsive className="shadow-sm">
                        <thead><tr><th>ID Lịch hẹn</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Chuyên khoa</th><th>Ngày hẹn</th><th>Trạng thái</th></tr></thead>
                        <tbody>
                            {appointmentStatsData.details_appointments.map(appt => (<tr key={appt.appointment_id}><td>{appt.appointment_id}</td><td>{appt.patient_name || 'N/A'}</td><td>{appt.doctor_name || 'N/A'}</td><td>{appt.doctor_specialization || 'N/A'}</td><td>{appt.appointment_date ? format(parseISO(appt.appointment_date), 'dd/MM/yyyy') : 'N/A'}</td><td>{translateStatus(appt.status)}</td></tr>))}
                        </tbody>
                    </Table>
                ) : (<Alert variant="info">Không có chi tiết lịch hẹn.</Alert>)}
            </>
        );
    };

    return (
            <Container className="my-4">
                <h2>Báo cáo & Thống kê</h2>
                {renderFilters()}
                {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                <Tabs activeKey={activeTab} onSelect={(k) => {setActiveTab(k); /* fetchReportData sẽ tự chạy khi activeTab thay đổi */}} className="mb-3 mt-4">
                    <Tab eventKey="revenue" title="Báo cáo Doanh thu">{renderRevenueReport()}</Tab>
                    <Tab eventKey="appointmentStats" title="Thống kê Lịch hẹn">{renderAppointmentStatsReport()}</Tab>
                </Tabs>
            </Container>
    );
};

export default ReportAndStatisticsPage;