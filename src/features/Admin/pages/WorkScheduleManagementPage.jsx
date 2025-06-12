import React, { useState, useEffect, useCallback } from 'react'; // Thêm useCallback
import { Container, Table, Button, Spinner, Alert, Modal, Form, Row, Col, Card, Pagination } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';

// Schema validation (giữ nguyên)
const workScheduleSchema = z.object({
    user_id: z.preprocess(val => Number(val), z.number().int().positive('Vui lòng chọn nhân viên.')), // Đảm bảo user_id là số dương
    date: z.string().min(1, 'Ngày là bắt buộc.'),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ bắt đầu không đúng định dạng HH:MM hoặc HH:MM:SS.'),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Giờ kết thúc không đúng định dạng HH:MM hoặc HH:MM:SS.'),
    type: z.enum(['WORKING', 'DAY_OFF'], { message: 'Loại lịch không hợp lệ.' }), // Bỏ APPROVED_LEAVE nếu không tạo trực tiếp
    notes: z.string().optional().nullable().transform(e => e === '' ? null : e),
}).superRefine((data, ctx) => {
    if (data.start_time && data.end_time) {
        const startDateTime = new Date(`1970-01-01T${data.start_time.length === 5 ? data.start_time + ':00' : data.start_time}`);
        const endDateTime = new Date(`1970-01-01T${data.end_time.length === 5 ? data.end_time + ':00' : data.end_time}`);
        if (endDateTime <= startDateTime) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Giờ kết thúc phải sau giờ bắt đầu.',
                path: ['end_time'],
            });
        }
    }
});


const WorkScheduleManagementPage = () => {
    const [schedules, setSchedules] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSchedule, setCurrentSchedule] = useState(null);

    // Chỉ giữ lại searchKeyword cho filter
    const [searchKeyword, setSearchKeyword] = useState('');

    // Add pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors, setValue } = useForm({
        resolver: zodResolver(workScheduleSchema),
        defaultValues: { // Thêm defaultValues để form được kiểm soát tốt hơn
            user_id: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            start_time: '08:00', // Sử dụng HH:MM cho input type time
            end_time: '17:00',   // Sử dụng HH:MM cho input type time
            type: 'WORKING',
            notes: '',
        }
    });

    const fetchInitialUsers = useCallback(async () => {
        // Chỉ fetch users một lần
        if (users.length === 0) {
            try {
                console.log("Fetching initial users...");
                const usersRes = await axiosInstance.get('/admin/users', { params: { per_page: 1000 } }); // Lấy nhiều user để chọn
                const medicalStaff = usersRes.data.data.filter(u =>
                    u.roles && u.roles.some(role => ['DOCTOR', 'HEAD_OF_DEPARTMENT', 'NURSE_STAFF', 'SUPER_ADMIN'].includes(typeof role === 'string' ? role : role.name))
                );
                setUsers(medicalStaff);
                console.log("Medical staff fetched:", medicalStaff);
            } catch (err) {
                toast.error('Lỗi khi tải danh sách nhân viên.');
                console.error('Error fetching users:', err);
            }
        }
    }, [users.length]); // Chỉ chạy lại nếu users.length thay đổi (thực tế là 1 lần)


    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                per_page: perPage
            };
            if (searchKeyword.trim()) {
                params.search = searchKeyword.trim();
            }
            params.with = 'user.roles';

            console.log("Fetching schedules with params:", params);
            const schedulesRes = await axiosInstance.get('/admin/work-schedules', { params });
            console.log("Schedules response:", schedulesRes.data);
            setSchedules(schedulesRes.data.data || []);
            setTotalItems(schedulesRes.data.total || 0);
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu lịch làm việc.');
            console.error('Error fetching schedules:', err);
            setError('Không thể tải dữ liệu. Vui lòng thử lại.');
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    }, [searchKeyword, currentPage, perPage]);

    // Fetch users khi component mount lần đầu
    useEffect(() => {
        fetchInitialUsers();
    }, [fetchInitialUsers]);

    // Fetch schedules khi component mount và khi searchKeyword thay đổi
    useEffect(() => {
        fetchData();
    }, [fetchData]); // fetchData là dependency ổn định


    const handleShowModal = (schedule = null) => {
        setIsEditing(!!schedule);
        setCurrentSchedule(schedule);
        if (schedule) {
            reset({
                user_id: String(schedule.user_id), // user_id luôn là string cho select
                date: schedule.date, // Giữ nguyên YYYY-MM-DD
                start_time: schedule.start_time?.substring(0, 5), // Lấy HH:MM
                end_time: schedule.end_time?.substring(0, 5),     // Lấy HH:MM
                type: schedule.type,
                notes: schedule.notes || '',
            });
        } else {
            reset({ // Giá trị mặc định cho form thêm mới
                user_id: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                start_time: '08:00',
                end_time: '17:00',
                type: 'WORKING',
                notes: '',
            });
        }
        setShowModal(true);
        clearErrors();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentSchedule(null);
        reset(); // Reset về defaultValues
    };

    const onSubmit = async (data) => {
        try {
            // Đảm bảo thời gian có dạng HH:MM:SS nếu backend yêu cầu, hoặc giữ HH:MM nếu backend chấp nhận
            const formatTime = (timeStr) => {
                if (!timeStr) return null;
                return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
            };

            const payload = {
                ...data,
                user_id: Number(data.user_id),
                start_time: formatTime(data.start_time),
                end_time: formatTime(data.end_time),
            };
            console.log("Submitting schedule payload:", payload);

            let response;
            if (isEditing) {
                response = await axiosInstance.put(`/admin/work-schedules/${currentSchedule.id}`, payload);
            } else {
                response = await axiosInstance.post('/admin/work-schedules', payload);
            }
            toast.success(response.data.message || 'Thao tác thành công!');
            fetchData();
            handleCloseModal();
        } catch (err) {
            console.error('Error submitting form:', err.response?.data || err);
            if (err.response?.data?.errors) {
                Object.keys(err.response.data.errors).forEach(key => {
                    setFormError(key, { type: 'server', message: err.response.data.errors[key][0] });
                });
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi.');
            }
        }
    };

    const handleDeleteSchedule = async (scheduleToDelete) => {
        const userName = scheduleToDelete.user?.name || 'Không rõ';
        if (window.confirm(`Xóa lịch của ${userName} ngày ${scheduleToDelete.date} (${scheduleToDelete.start_time?.substring(0,5)}-${scheduleToDelete.end_time?.substring(0,5)})?`)) {
            try {
                await axiosInstance.delete(`/admin/work-schedules/${scheduleToDelete.id}`);
                toast.success('Lịch làm việc đã được xóa.');
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không thể xóa lịch làm việc.');
            }
        }
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handlePerPageChange = (e) => {
        setPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset to first page when changing items per page
    };

    return (
            <Container className="my-4">
                <h2>Quản lý Lịch làm việc</h2>
                <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                    Thêm lịch làm việc mới
                </Button>

                <Card className="mb-4 p-3 shadow-sm bg-light">
                    <Row>
                        <Col md={9}> {/* Tăng độ rộng cho ô search */}
                            <Form.Group controlId="searchKeyword">
                                <Form.Label>Tìm kiếm theo tên nhân viên hoặc ghi chú</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Nhập từ khóa..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') fetchData(); }} // Tìm khi nhấn Enter
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Button variant="primary" onClick={fetchData} className="w-100">
                                Tìm kiếm
                            </Button>
                            {/* <Button variant="secondary" onClick={() => setSearchKeyword('')} className="w-100 ms-2">
                                Reset
                            </Button> */}
                        </Col>
                    </Row>
                </Card>

                {loading && <div className="text-center my-3"><Spinner animation="border" size="sm" /> Đang tải...</div>}
                {error && !loading && <Alert variant="danger">{error}</Alert>}
                
                {!loading && !error && (
                    <>
                        <Table striped bordered hover responsive className="mt-4 shadow-sm">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Nhân viên</th><th>Ngày</th>
                                    <th>Bắt đầu</th><th>Kết thúc</th><th>Loại</th>
                                    <th>Ghi chú</th><th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.length > 0 ? (
                                    schedules.map((schedule) => (
                                        <tr key={schedule.id}>
                                            <td>{schedule.id}</td>
                                            <td>
                                                {schedule.user?.name || 'Không rõ'}
                                                {schedule.user?.roles && schedule.user.roles.length > 0 &&
                                                    ` (${(typeof schedule.user.roles[0] === 'string' ? schedule.user.roles[0] : schedule.user.roles[0]?.name) || 'N/A'})`
                                                }
                                            </td>
                                            <td>{schedule.date ? format(parseISO(schedule.date), 'dd/MM/yyyy') : 'N/A'}</td>
                                            <td>{schedule.start_time?.substring(0, 5)}</td>
                                            <td>{schedule.end_time?.substring(0, 5)}</td>
                                            <td>{schedule.type}</td>
                                            <td>{schedule.notes || 'N/A'}</td>
                                            <td>
                                                <Button variant="info" size="sm" className="me-2 mb-1" onClick={() => handleShowModal(schedule)}>Sửa</Button>
                                                <Button variant="danger" size="sm" className="mb-1" onClick={() => handleDeleteSchedule(schedule)}>Xóa</Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="8" className="text-center">Không có lịch làm việc nào phù hợp.</td></tr>
                                )}
                            </tbody>
                        </Table>

                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="d-flex align-items-center">
                                <span className="me-2">Hiển thị:</span>
                                <Form.Select
                                    value={perPage}
                                    onChange={handlePerPageChange}
                                    style={{ width: 'auto' }}
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </Form.Select>
                                <span className="ms-2">mục</span>
                            </div>
                            
                            <Pagination>
                                <Pagination.First 
                                    onClick={() => handlePageChange(1)} 
                                    disabled={currentPage === 1}
                                />
                                <Pagination.Prev 
                                    onClick={() => handlePageChange(currentPage - 1)} 
                                    disabled={currentPage === 1}
                                />
                                
                                {[...Array(Math.ceil(totalItems / perPage))].map((_, index) => {
                                    const pageNumber = index + 1;
                                    // Show current page, first page, last page, and pages around current page
                                    if (
                                        pageNumber === 1 ||
                                        pageNumber === Math.ceil(totalItems / perPage) ||
                                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                    ) {
                                        return (
                                            <Pagination.Item
                                                key={pageNumber}
                                                active={pageNumber === currentPage}
                                                onClick={() => handlePageChange(pageNumber)}
                                            >
                                                {pageNumber}
                                            </Pagination.Item>
                                        );
                                    } else if (
                                        pageNumber === currentPage - 2 ||
                                        pageNumber === currentPage + 2
                                    ) {
                                        return <Pagination.Ellipsis key={pageNumber} disabled />;
                                    }
                                    return null;
                                })}
                                
                                <Pagination.Next 
                                    onClick={() => handlePageChange(currentPage + 1)} 
                                    disabled={currentPage === Math.ceil(totalItems / perPage)}
                                />
                                <Pagination.Last 
                                    onClick={() => handlePageChange(Math.ceil(totalItems / perPage))} 
                                    disabled={currentPage === Math.ceil(totalItems / perPage)}
                                />
                            </Pagination>
                        </div>
                    </>
                )}

                <Modal show={showModal} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false}>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isEditing ? 'Sửa Lịch làm việc' : 'Thêm Lịch làm việc mới'}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>Nhân viên<span className="text-danger">*</span></Form.Label>
                                <Form.Select {...register('user_id')} isInvalid={!!errors.user_id} disabled={isEditing}>
                                    <option value="">Chọn nhân viên</option>
                                    {users.map(user => (
                                        <option key={user.id} value={String(user.id)}>
                                            {user.name}
                                            {user.roles && user.roles.length > 0 && ` (${(typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0]?.name) || 'N/A'})`}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{errors.user_id?.message}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Ngày<span className="text-danger">*</span></Form.Label>
                                {/* Sử dụng input type="date" cho trình duyệt xử lý DatePicker */}
                                <Form.Control type="date" {...register('date')} isInvalid={!!errors.date} disabled={isEditing} />
                                <Form.Control.Feedback type="invalid">{errors.date?.message}</Form.Control.Feedback>
                            </Form.Group>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Giờ bắt đầu<span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="time" {...register('start_time')} isInvalid={!!errors.start_time} />
                                        <Form.Control.Feedback type="invalid">{errors.start_time?.message}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Giờ kết thúc<span className="text-danger">*</span></Form.Label>
                                        <Form.Control type="time" {...register('end_time')} isInvalid={!!errors.end_time} />
                                        <Form.Control.Feedback type="invalid">{errors.end_time?.message}</Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Loại lịch<span className="text-danger">*</span></Form.Label>
                                <Form.Select {...register('type')} isInvalid={!!errors.type}>
                                    <option value="WORKING">WORKING (Làm việc)</option>
                                    <option value="DAY_OFF">DAY_OFF (Ngày nghỉ)</option>
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{errors.type?.message}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Ghi chú</Form.Label>
                                <Form.Control as="textarea" rows={3} {...register('notes')} isInvalid={!!errors.notes}/>
                                <Form.Control.Feedback type="invalid">{errors.notes?.message}</Form.Control.Feedback>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>Đóng</Button>
                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Spinner as="span" animation="border" size="sm" className="me-2"/>Đang lưu...</> : 'Lưu'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
    );
};

export default WorkScheduleManagementPage;