import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import RegisterPage from './features/Auth/pages/RegisterPage';
import LoginPage from './features/Auth/pages/LoginPage';
import PrivateRoute from './router/PrivateRoute';
import GuestRoute from './router/GuestRoute';
import RoleBasedRoute from './router/RoleBasedRoute';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layouts/MainLayout';
import { Container, Card, Row, Col, Image } from 'react-bootstrap';

// Import các trang chức năng Patient
import DoctorSearchPage from './features/Patient/pages/DoctorSearchPage';
import DoctorAvailabilityPage from './features/Patient/pages/DoctorAvailabilityPage';
import PatientAppointmentsPage from './features/Patient/pages/PatientAppointmentsPage';
import PatientMedicalRecordsPage from './features/Patient/pages/PatientMedicalRecordsPage';
import MedicalRecordDetailPage from './features/Patient/pages/MedicalRecordDetailPage';
import PatientPaymentHistoryPage from './features/Patient/pages/PatientPaymentHistoryPage';
// import PatientProfilePage from './features/Patient/pages/PatientProfilePage'; // <-- KHÔNG IMPORT DÒNG NÀY NỮA
import PatientMedicineSearchPage from './features/Patient/pages/PatientMedicineSearchPage';
import DoctorSchedulePage from './features/Doctor/pages/DoctorSchedulePage';
import DoctorAppointmentsPage from './features/Doctor/pages/DoctorAppointmentsPage';
import DoctorMedicalRecordsPage from './features/Doctor/pages/DoctorMedicalRecordsPage';
import DoctorMedicalRecordDetailPage from './features/Doctor/pages/MedicalRecordDetailPage';
import DoctorPrescriptionsPage from './features/Doctor/pages/DoctorPrescriptionsPage';
import LeaveRequestPage from './features/Doctor/pages/LeaveRequestPage';

// Import trang Profile chung
import ProfilePage from './features/Auth/pages/ProfilePage'; // <-- THÊM DÒNG NÀY (ProfilePage đã được di chuyển)
import NurseAppointmentsPage from './features/Nurse/pages/NurseAppointmentsPage';
import PaymentProcessingPage from './features/Nurse/pages/PaymentProcessingPage';
import DispensingPage from './features/Nurse/pages/DispensingPage';

import MedicalRecordFormPage from './features/Doctor/pages/MedicalRecordFormPage';
import MedicalRecordCreatePage from './features/Doctor/pages/MedicalRecordCreatePage';

//admin
import UserManagementPage from './features/Admin/pages/UserManagementPage';
import RoleManagementPage from './features/Admin/pages/RoleManagementPage';
import ClinicManagementPage from './features/Admin/pages/ClinicManagementPage';
import MedicineCategoryManagementPage from './features/Admin/pages/MedicineCategoryManagementPage';
import MedicineManagementPage from './features/Admin/pages/MedicineManagementPage';
import WorkScheduleManagementPage from './features/Admin/pages/WorkScheduleManagementPage';
import LeaveRequestManagementPage from './features/Admin/pages/LeaveRequestManagementPage';
import ReportAndStatisticsPage from './features/Admin/pages/ReportAndStatisticsPage';
import SystemConfigurationManagementPage from './features/Admin/pages/SystemConfigurationManagementPage';


// trưởng khoa
import DepartmentWorkScheduleManagementPage from './features/HeadOfDepartment/pages/DepartmentWorkScheduleManagementPage';
import DepartmentAppointmentManagementPage from './features/HeadOfDepartment/pages/DepartmentAppointmentManagementPage';
import DepartmentStaffManagementPage from './features/HeadOfDepartment/pages/DepartmentStaffManagementPage';
import DepartmentLeaveRequestManagementPage from './features/HeadOfDepartment/pages/DepartmentLeaveRequestManagementPage';
import DepartmentReportsPage from './features/HeadOfDepartment/pages/DepartmentReportsPage';
// Import các component Bootstrap cần thiết cho Dashboard



// ==========================================================================================================
// ĐỊNH NGHĨA CÁC TRANG DASHBOARD & COMPONENT RIÊNG (KHÔNG LỒNG TRONG HÀM APP)
// ==========================================================================================================

import logo from './assets/images/logo.png';
import hospitalBuilding1 from './assets/images/hospital_building_1.jpg';
import hospitalBuilding2 from './assets/images/hospital_building_2.jpg';
const WelcomePage = () => (
  <MainLayout> {/* Bọc WelcomePage bằng MainLayout */}
    <Container className="my-4">
      <h1 className="text-center mb-4">Chào mừng bạn đến với Hệ thống Đặt khám Trực tuyến</h1>

      <Row className="mb-4 text-center">
        <Col>
          <p className="lead">Vui lòng đăng nhập hoặc đăng ký để tiếp tục.</p>
          <Link to="/login" className="btn btn-primary me-2">Đăng nhập</Link>
          <Link to="/register" className="btn btn-secondary">Đăng ký</Link>
        </Col>
      </Row>

      {/* NỘI DUNG GIỚI THIỆU TỪ AboutUsPage */}
      <Row className="mb-4 align-items-center">
          <Col md={3} className="text-center">
              <Image src={logo} alt="Hospital Logo" fluid style={{ maxWidth: '150px' }} />
          </Col>
          <Col md={9}>
              <Card className="p-3 shadow-sm">
                  <Card.Body>
                      <Card.Text>
                          Bệnh viện TTHG được thành lập với định hướng trở thành một trong những cơ sở y tế hàng đầu khu vực,
                          mang đến dịch vụ chăm sóc sức khỏe chất lượng cao, hiện đại và toàn diện cho cộng đồng.
                          Với đội ngũ y bác sĩ giàu kinh nghiệm, trang thiết bị tiên tiến và môi trường khám chữa bệnh thân thiện,
                          chúng tôi không ngừng nỗ lực để phục vụ người bệnh một cách tận tâm và hiệu quả nhất.
                      </Card.Text>
                  </Card.Body>
              </Card>
          </Col>
      </Row>

      <Row className="mb-4">
          <Col md={6} className="mb-3 mb-md-0">
              <Card className="shadow-sm h-100">
                  <Card.Body>
                      <Image src={hospitalBuilding1} alt="Tòa nhà bệnh viện 1" fluid rounded className="mb-3" />
                      <Card.Text className="text-muted text-center">Tòa nhà chính của Bệnh viện TTHG</Card.Text>
                  </Card.Body>
              </Card>
          </Col>
          <Col md={6}>
              <Card className="shadow-sm h-100">
                  <Card.Body>
                      <Image src={hospitalBuilding2} alt="Tòa nhà bệnh viện 2" fluid rounded className="mb-3" />
                      <Card.Text className="text-muted text-center">Khuôn viên và mặt tiền hiện đại</Card.Text>
                  </Card.Body>
              </Card>
          </Col>
      </Row>

      <Row className="mb-4">
          <Col md={6}>
              <Card className="p-3 shadow-sm h-100">
                  <Card.Body className="d-flex flex-column">
                      <Card.Title className="mb-3"><h3>Tầm nhìn</h3></Card.Title>
                      <Card.Text className="flex-grow-1">
                          Bệnh viện TTHG hướng đến trở thành trung tâm y tế uy tín và chuẩn mực,
                          tiên phong trong việc ứng dụng công nghệ y học tiên tiến, nâng cao chất lượng điều trị và chăm sóc sức khỏe,
                          đáp ứng nhu cầu ngày càng cao của người dân.
                      </Card.Text>
                  </Card.Body>
              </Card>
          </Col>
          <Col md={6}>
              <Card className="p-3 shadow-sm h-100">
                  <Card.Body className="d-flex flex-column">
                      <Card.Title className="mb-3"><h3>Sứ mệnh</h3></Card.Title>
                      <Card.Text className="flex-grow-1">
                          Chúng tôi cam kết cung cấp dịch vụ y tế an toàn, chuyên nghiệp và nhân văn.
                          Bệnh viện TTHG lấy người bệnh làm trung tâm trong mọi hoạt động, không ngừng nâng cao năng lực chuyên môn,
                          đầu tư cơ sở vật chất và phát triển đội ngũ nhằm mang lại kết quả điều trị tốt nhất cho cộng đồng.
                      </Card.Text>
                  </Card.Body>
              </Card>
          </Col>
      </Row>

      <Card className="p-4 shadow-sm mb-4">
          <Card.Title className="mb-3"><h3>Giá trị cốt lõi</h3></Card.Title>
          <Row>
              <Col md={6}>
                  <ul>
                      <li><strong>Tận tâm:</strong> Phục vụ người bệnh với lòng yêu nghề và tinh thần trách nhiệm cao.</li>
                      <li><strong>Chuyên nghiệp:</strong> Duy trì chuẩn mực trong quy trình điều trị, giao tiếp và phục vụ.</li>
                      <li><strong>Hiệu quả:</strong> Tối ưu hóa kết quả điều trị dựa trên bằng chứng y học và công nghệ hiện đại.</li>
                  </ul>
              </Col>
              <Col md={6}>
                  <ul>
                      <li><strong>Hợp tác:</strong> Xây dựng môi trường làm việc đoàn kết, hỗ trợ và cùng phát triển.</li>
                      <li><strong>Đổi mới:</strong> Luôn cập nhật kiến thức, kỹ thuật mới nhằm nâng cao chất lượng dịch vụ y tế.</li>
                  </ul>
              </Col>
          </Row>
      </Card>
    </Container>
  </MainLayout>
);

const DashboardPage = () => {
  const { user, isAuthenticated, redirectToDashboardByRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const specificDashboardPath = redirectToDashboardByRole(user.roles);
      if (specificDashboardPath !== '/dashboard') {
        navigate(specificDashboardPath, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, redirectToDashboardByRole]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Container className="my-4">
      <h1 className="mb-4">Chào mừng, {user.name}!</h1>
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Tổng quan</Card.Title>
          <Card.Text>
            Bạn đang đăng nhập với vai trò: <strong>{user.roles && user.roles.join(', ')}</strong>
          </Card.Text>
          <p>Sử dụng thanh điều hướng phía trên để truy cập các chức năng.</p>
        </Card.Body>
      </Card>
    </Container>
  );
};

const AdminDashboard = () => (
  <Container className="my-4">
    <h1 className="mb-4">Admin Dashboard</h1>
    <p>Chào mừng Super Admin!</p>
    <Row>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Quản lý Người dùng</Card.Title>
            <Card.Text>Quản lý tất cả tài khoản người dùng trong hệ thống.</Card.Text>
            <Link to="/admin/users" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Báo cáo & Thống kê</Card.Title>
            <Card.Text>Xem các báo cáo tổng quan về hoạt động hệ thống.</Card.Text>
            <Link to="/admin/reports" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

const HodDashboard = () => (
  <Container className="my-4">
    <h1 className="mb-4">Trưởng Khoa Dashboard</h1>
    <p>Chào mừng Trưởng Khoa!</p>
    <Row>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Quản lý Lịch hẹn Khoa</Card.Title>
            <Card.Text>Duyệt và quản lý lịch hẹn của các bác sĩ trong khoa.</Card.Text>
            <Link to="/hod/appointments" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Quản lý Nghỉ phép Khoa</Card.Title>
            <Card.Text>Duyệt đơn xin nghỉ phép của nhân viên trong khoa.</Card.Text>
            <Link to="/hod/leave-requests" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

const DoctorDashboard = () => (
  <Container className="my-4">
    <h1 className="mb-4">Bác Sĩ Dashboard</h1>
    <p>Chào mừng Bác Sĩ!</p>
    <Row>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Lịch hẹn của tôi</Card.Title>
            <Card.Text>Xem và quản lý các lịch hẹn đã đặt với bạn.</Card.Text>
            <Link to="/doctor/appointments" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Hồ sơ bệnh án & Kê đơn</Card.Title>
            <Card.Text>Truy cập hồ sơ bệnh án và kê đơn thuốc cho bệnh nhân.</Card.Text>
            <Link to="/doctor/medical-records" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

const NurseDashboard = () => (
  <Container className="my-4">
    <h1 className="mb-4">Y Tá Dashboard</h1>
    <p>Chào mừng Y Tá!</p>
    <Row>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Hỗ trợ khám bệnh</Card.Title>
            <Card.Text>Xem lịch hẹn, cập nhật sinh hiệu bệnh nhân.</Card.Text>
            <Link to="/nurse/appointments" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6} lg={4}>
        <Card className="shadow-sm">
          <Card.Body>
            <Card.Title>Quản lý Thanh toán</Card.Title>
            <Card.Text>Xử lý các giao dịch thanh toán của bệnh nhân.</Card.Text>
            <Link to="/nurse/payments/pending" className="btn btn-primary">Truy cập</Link>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);

const PatientDashboard = () => {
  const { user } = useAuth();
  return (
    <Container className="my-4">
      <h1 className="mb-4">Bệnh Nhân Dashboard</h1>
      <p className="lead mb-4">Chào mừng {user.name} ({user.roles && user.roles.join(', ')})! Bạn có thể bắt đầu khám phá các chức năng dưới đây.</p>
      <Row className="g-4">
        <Col md={6} lg={4}>
          <Card className="shadow-sm h-100 d-flex flex-column">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="mb-2">Tìm kiếm Bác sĩ</Card.Title>
              <Card.Text className="text-muted flex-grow-1">
                Tìm kiếm bác sĩ theo chuyên khoa hoặc tên để đặt lịch hẹn.
              </Card.Text>
              <Link to="/patient/doctors" className="btn btn-primary mt-auto">Đặt lịch ngay</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="shadow-sm h-100 d-flex flex-column">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="mb-2">Lịch hẹn của tôi</Card.Title>
              <Card.Text className="text-muted flex-grow-1">
                Xem và quản lý các lịch hẹn đã đặt của bạn.
                <br /><br />
                Lời khuyên: Luôn kiểm tra tình trạng lịch hẹn thường xuyên.
              </Card.Text>
              <Link to="/patient/appointments" className="btn btn-primary mt-auto">Xem lịch hẹn</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="shadow-sm h-100 d-flex flex-column">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="mb-2">Hồ sơ sức khỏe</Card.Title>
              <Card.Text className="text-muted flex-grow-1">
                Xem lại lịch sử khám bệnh và hồ sơ sức khỏe cá nhân của bạn.
                <br /><br />
                Lời khuyên: Duy trì thói quen ăn uống khoa học và tập thể dục đều đặn.
              </Card.Text>
              <Link to="/patient/medical-records" className="btn btn-primary mt-auto">Xem hồ sơ</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="shadow-sm h-100 d-flex flex-column">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="mb-2">Lịch sử thanh toán</Card.Title>
              <Card.Text className="text-muted flex-grow-1">
                Xem các giao dịch thanh toán và hóa đơn đã thực hiện.
                <br /><br />
                Lời khuyên: Đừng quên kiểm tra bảo hiểm y tế định kỳ.
              </Card.Text>
              <Link to="/patient/payments/history" className="btn btn-primary mt-auto">Xem lịch sử</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="shadow-sm h-100 d-flex flex-column">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="mb-2">Thông tin cá nhân</Card.Title>
              <Card.Text className="text-muted flex-grow-1">
                Cập nhật thông tin profile và đổi mật khẩu của bạn.
                <br /><br />
                Lời khuyên: Đảm bảo thông tin liên hệ luôn được cập nhật.
              </Card.Text>
              <Link to="/patient/profile" className="btn btn-primary mt-auto">Cập nhật</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={4}>
          <Card className="shadow-sm h-100 d-flex flex-column">
            <Card.Body className="d-flex flex-column">
              <Card.Title className="mb-2">Tra cứu thuốc</Card.Title>
              <Card.Text className="text-muted flex-grow-1">
                Tra cứu thông tin về các loại thuốc và dược phẩm.
                <br /><br />
                Lời khuyên: Luôn tham khảo ý kiến bác sĩ hoặc dược sĩ trước khi dùng thuốc.
              </Card.Text>
              <Link to="/patient/medicines" className="btn btn-primary mt-auto">Tra cứu</Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

const UnauthorizedPage = () => (
  <div className="container mt-5 text-center text-danger">
    <h1>403 - Truy cập bị từ chối</h1>
    <p>Bạn không có quyền truy cập trang này.</p>
    <Link to="/dashboard" className="btn btn-primary">Về Dashboard</Link>
  </div>
);


function App() {
  return (
    <Router>
      <div className="App">
        <Toaster />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<WelcomePage />} />

          {/* Guest Routes (chỉ cho người chưa đăng nhập) */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Các route yêu cầu MainLayout */}
          <Route element={<MainLayout />}>

            {/* Private Routes (yêu cầu đăng nhập) */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Patient Routes */}
              <Route element={<RoleBasedRoute allowedRoles={['PATIENT']} />}>
                <Route path="/patient/dashboard" element={<PatientDashboard />} />
                <Route path="/patient/doctors" element={<DoctorSearchPage />} />
                <Route path="/patient/doctors/:id/availability" element={<DoctorAvailabilityPage />} />
                <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
                <Route path="/patient/medical-records" element={<PatientMedicalRecordsPage />} />
                <Route path="/patient/medical-records/:id" element={<MedicalRecordDetailPage />} />
                <Route path="/patient/payments/history" element={<PatientPaymentHistoryPage />} />
                <Route path="/patient/profile" element={<ProfilePage />} /> {/* <-- SỬA DÒNG NÀY */}
                <Route path="/patient/medicines" element={<PatientMedicineSearchPage />} />
              </Route>

              {/* Role-Based Routes khác (Admin, HOD, Doctor, Nurse) */}
              <Route element={<RoleBasedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/roles" element={<RoleManagementPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/clinics" element={<ClinicManagementPage />} />
                <Route path="/admin/medicine-categories" element={<MedicineCategoryManagementPage />} />
                <Route path="/admin/medicines" element={<MedicineManagementPage />} />
                <Route path="/admin/work-schedules" element={<WorkScheduleManagementPage />} />
                <Route path="/admin/leave-requests" element={<LeaveRequestManagementPage />} />
                <Route path="/admin/reports" element={<ReportAndStatisticsPage />} />
                <Route path="/admin/settings" element={<SystemConfigurationManagementPage />} />
              </Route>

              <Route element={<RoleBasedRoute allowedRoles={['HEAD_OF_DEPARTMENT']} />}>
                <Route path="/hod/dashboard" element={<HodDashboard />} />
                <Route path="/hod/work-schedules" element={<DepartmentWorkScheduleManagementPage />} />
                <Route path="/hod/appointments" element={<DepartmentAppointmentManagementPage />} />
                <Route path="/hod/staff" element={<DepartmentStaffManagementPage />} />
                <Route path="/hod/leave-requests" element={<DepartmentLeaveRequestManagementPage />} />

                <Route path="/hod/reports" element={<DepartmentReportsPage />} />

                <Route path="/hod/schedules" element={<DoctorSchedulePage />} />
                <Route path="/hod/appointments/hod" element={<DoctorAppointmentsPage />} />
                <Route path="/hod/prescriptions" element={<DoctorPrescriptionsPage />} />
                <Route path="/hod/medicines" element={<PatientMedicineSearchPage />} />
                <Route path="/hod/leave-requests/hod" element={<LeaveRequestPage />} />

              </Route>

              <Route element={<RoleBasedRoute allowedRoles={['DOCTOR', 'HEAD_OF_DEPARTMENT']} />}>
                <Route path="/doctor/medical-records" element={<DoctorMedicalRecordsPage />} />
                <Route path="/doctor/medical-records/:id/form" element={<DoctorMedicalRecordDetailPage />} />
                <Route path="/doctor/medical-records/:id/create" element={<MedicalRecordCreatePage />} />
            </Route>

              <Route element={<RoleBasedRoute allowedRoles={['DOCTOR']} />}>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/schedules" element={<DoctorSchedulePage />} />
                <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
                <Route path="/doctor/prescriptions" element={<DoctorPrescriptionsPage />} />
                <Route path="/doctor/medicines" element={<PatientMedicineSearchPage />} />
                <Route path="/doctor/leave-requests" element={<LeaveRequestPage />} />
                <Route path="/doctor/profile" element={<ProfilePage />} />
              </Route>

              <Route element={<RoleBasedRoute allowedRoles={['NURSE_STAFF']} />}>
                <Route path="/nurse/dashboard" element={<NurseDashboard />} />
                <Route path="/nurse/appointments" element={<NurseAppointmentsPage />} /> {/* <-- ĐÃ SỬA DÒNG NÀY */}
                <Route path="/nurse/payments/pending" element={<PaymentProcessingPage />} />
                <Route path="/nurse/profile" element={<ProfilePage />} />
                <Route path="/nurse/payments/:id/process" element={<PaymentProcessingPage />} />
                <Route path="/nurse/dispensing" element={<DispensingPage />} />
                <Route path="/nurse/medicines" element={<PatientMedicineSearchPage />} />
                <Route path="/nurse/leave-requests" element={<LeaveRequestPage />} />
              </Route>
              
              {/* Profile cho Admin và HOD */}
              <Route element={<RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'HEAD_OF_DEPARTMENT']} />}>
                <Route path="/admin/profile" element={<ProfilePage />} /> {/* <-- THÊM DÒNG NÀY */}
                <Route path="/hod/profile" element={<ProfilePage />} /> {/* <-- THÊM DÒNG NÀY */}
              </Route>

            </Route> {/* End Private Routes */}
          </Route> {/* End MainLayout */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;