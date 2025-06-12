import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Form, Row, Col, Badge, Card } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

const DepartmentStaffManagementPage = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filterRole, setFilterRole] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');

    const fetchStaff = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (filterRole) params.role_name = filterRole;
            if (searchKeyword) params.search = searchKeyword;

            const response = await axiosInstance.get('/hod/staff', { params });
            setStaff(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách nhân viên khoa.');
            console.error('Error fetching staff:', err);
            setError(err.response?.data?.message || 'Không thể tải dữ liệu nhân viên. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [filterRole, searchKeyword]); // Re-fetch when filters change

    return (
            <Container className="my-4">
                <h2>Nhân viên Khoa</h2>

                {/* Filter Section */}
                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row className="align-items-end">
                        <Col md={4}>
                            <Form.Group controlId="filterRole">
                                <Form.Label>Lọc theo vai trò</Form.Label>
                                <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                    <option value="">Tất cả vai trò</option>
                                    <option value="DOCTOR">Bác sĩ</option>
                                    <option value="NURSE_STAFF">Y tá / Điều dưỡng</option>
                                    <option value="HEAD_OF_DEPARTMENT">Trưởng Khoa</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group controlId="searchKeyword">
                                <Form.Label>Tìm kiếm theo tên/email/mã NV</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nhập từ khóa..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') fetchStaff(); }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Button variant="primary" onClick={fetchStaff} className="w-100 me-2" disabled={loading}>
                                {loading ? <Spinner size="sm" className="me-1"/> : null}
                                Tìm kiếm
                            </Button>
                            <Button variant="secondary" onClick={() => { setFilterRole(''); setSearchKeyword(''); }} className="w-100 mt-2 mt-md-0">
                                Reset Lọc
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {loading && (staff.length === 0) && <div className="text-center my-3"><Spinner animation="border" /><p>Đang tải...</p></div>}
                
                {!loading && staff.length > 0 ? (
                    <Table striped bordered hover responsive className="mt-4 shadow-sm">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>SĐT</th>
                                <th>Mã NV</th>
                                <th>Vai trò</th>
                                <th>Phòng khám</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.phone || 'N/A'}</td>
                                    <td>{user.employee_code || 'N/A'}</td>
                                    <td>
                                        {user.roles && user.roles.length > 0 ? (
                                            user.roles.map(role => (
                                                <Badge key={role} bg="info" className="me-1">{role}</Badge>
                                            ))
                                        ) : 'N/A'}
                                    </td>
                                    <td>{user.clinic?.name || 'N/A'}</td>
                                    <td>{user.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    !loading && <Alert variant="info" className="mt-4">Không tìm thấy nhân viên nào.</Alert>
                )}
            </Container>
    );
};

export default DepartmentStaffManagementPage;