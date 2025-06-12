import React from 'react';
import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast'; // Import toast

const Header = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const userRole = user?.roles?.[0]; // Lấy vai trò chính của user

    const getDashboardPath = (role) => {
        switch (role) {
            case 'SUPER_ADMIN': return '/admin/dashboard';
            case 'HEAD_OF_DEPARTMENT': return '/hod/dashboard';
            case 'DOCTOR': return '/doctor/dashboard';
            case 'NURSE_STAFF': return '/nurse/dashboard';
            case 'PATIENT': return '/patient/dashboard';
            default: return '/dashboard';
        }
    };

    // CHỈNH SỬA HÀM NÀY ĐỂ ĐIỀU HƯỚNG ĐẾN TRANG PROFILE CỤ THỂ
    const handleProfileClick = () => {
        if (!isAuthenticated || !userRole) {
            toast.error('Bạn chưa đăng nhập.');
            navigate('/login');
            return;
        }

        let profilePath = '';
        switch (userRole) {
            case 'PATIENT':
                profilePath = '/patient/profile';
                break;
            case 'DOCTOR':
                profilePath = '/doctor/profile';
                break;
            case 'NURSE_STAFF':
                profilePath = '/nurse/profile';
                break;
            case 'HEAD_OF_DEPARTMENT':
                profilePath = '/hod/profile';
                break;
            case 'SUPER_ADMIN':
                profilePath = '/admin/profile';
                break;
            default:
                toast.info('Chức năng profile chưa được hỗ trợ cho vai trò này.');
                return;
        }
        navigate(profilePath);
    };

    return (
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
            <Container>
                <Navbar.Brand as={Link} to={isAuthenticated ? getDashboardPath(userRole) : '/'}>
                    <img
                        src="/assets/logo-DdaJqqVz.png"
                        alt="Logo"
                        width="30"
                        height="30"
                        className="d-inline-block align-top me-2"
                    />
                    TTHG
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        {/* Always show Dashboard link if authenticated */}
                        {isAuthenticated && (
                            <Nav.Link as={Link} to={getDashboardPath(userRole)}>
                                Dashboard
                            </Nav.Link>
                        )}

                        {/* Patient Specific Links */}
                        {userRole === 'PATIENT' && (
                            <>
                                <Nav.Link as={Link} to="/patient/doctors">
                                    Tìm bác sĩ
                                </Nav.Link>
                                <Nav.Link as={Link} to="/patient/appointments">
                                    Lịch hẹn của tôi
                                </Nav.Link>
                                <Nav.Link as={Link} to="/patient/medical-records">
                                    Hồ sơ sức khỏe
                                </Nav.Link>
                                <Nav.Link as={Link} to="/patient/payments/history">
                                    Lịch sử thanh toán
                                </Nav.Link>
                                <Nav.Link as={Link} to="/patient/medicines">
                                    Tra cứu thuốc
                                </Nav.Link>
                            </>
                        )}

                        {/* Doctor Specific Links */}
                        {userRole === 'DOCTOR' && (
                            <>
                                <Nav.Link as={Link} to="/doctor/schedules">
                                    Lịch làm việc
                                </Nav.Link>
                                <Nav.Link as={Link} to="/doctor/appointments">
                                    Lịch hẹn của tôi
                                </Nav.Link>
                                <Nav.Link as={Link} to="/doctor/prescriptions">
                                    Kê đơn
                                </Nav.Link>
                                <Nav.Link as={Link} to="/doctor/medical-records">
                                    Hồ sơ bệnh án
                                </Nav.Link>
                                <Nav.Link as={Link} to="/doctor/medicines">
                                    Tra cứu thuốc
                                </Nav.Link>
                                <Nav.Link as={Link} to="/doctor/leave-requests">
                                    Xin nghỉ phép
                                </Nav.Link>
                            </>
                        )}

                        {/* Head of Department Specific Links */}
                        {userRole === 'HEAD_OF_DEPARTMENT' && (
                            <NavDropdown title="Quản lý Khoa" id="hod-nav-dropdown">
                                <NavDropdown.Item as={Link} to="/hod/work-schedules">Lịch làm việc Khoa</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/appointments">Lịch hẹn Khoa</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/staff">Nhân viên Khoa</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/leave-requests">Nghỉ phép Khoa</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={Link} to="/hod/reports">Báo cáo Khoa</NavDropdown.Item>
                                {/* Nếu Trưởng khoa cũng khám bệnh */}
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={Link} to="/hod/schedules">Lịch làm việc cá nhân</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/appointments/hod">Lịch hẹn cá nhân</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/prescriptions">Kê đơn (cá nhân)</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/doctor/medical-records">Hồ sơ bệnh án (cá nhân)</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/medicines">Tra cứu thuốc</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/hod/leave-requests/hod">Xin nghỉ phép (cá nhân)</NavDropdown.Item>
                            </NavDropdown>
                        )}

                        {/* Nurse Specific Links */}
                        {userRole === 'NURSE_STAFF' && (
                            <NavDropdown title="Hoạt động Y tá" id="nurse-nav-dropdown">
                                <NavDropdown.Item as={Link} to="/nurse/appointments">Hỗ trợ khám bệnh</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/nurse/dispensing">Cấp phát thuốc</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={Link} to="/nurse/medicines">Tra cứu thuốc</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/nurse/leave-requests">Xin nghỉ phép</NavDropdown.Item>
                            </NavDropdown>
                        )}

                        {/* Super Admin Specific Links */}
                        {userRole === 'SUPER_ADMIN' && (
                            <NavDropdown title="Quản lý Hệ thống" id="admin-nav-dropdown">
                                <NavDropdown.Item as={Link} to="/admin/users">Quản lý Người dùng</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/roles">Quản lý Vai trò</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/clinics">Quản lý Phòng khám</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/medicine-categories">Quản lý Loại thuốc</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/medicines">Quản lý Thuốc</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/work-schedules">Quản lý Lịch làm việc</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/leave-requests">Quản lý Nghỉ phép</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={Link} to="/admin/reports">Báo cáo & Thống kê</NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/admin/settings">Cấu hình Hệ thống</NavDropdown.Item>
                            </NavDropdown>
                        )}

                        {/* Public Links (chỉ hiển thị nếu chưa đăng nhập) */}
                        {!isAuthenticated && (
                            <>
                                <Nav.Link as={Link} to="/login">
                                    Đăng nhập
                                </Nav.Link>
                                <Nav.Link as={Link} to="/register">
                                    Đăng ký
                                </Nav.Link>
                            </>
                        )}
                    </Nav>
                    <Nav>
                        {isAuthenticated && (
                            <Navbar.Text
                                className="me-3"
                                style={{ cursor: 'pointer' }}
                                onClick={handleProfileClick} // <-- Dòng này gọi hàm mới
                            >
                                Đã đăng nhập: <span className="fw-bold">{user.name}</span> ({userRole})
                            </Navbar.Text>
                        )}
                        <LogoutButton />
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Header;