import React from 'react';
import { Card, Button, Row, Col, Alert, Badge } from 'react-bootstrap'; // Import Badge

const MedicineList = ({ medicines }) => {
    // Không có chức năng "Xem chi tiết" riêng nếu API show() chỉ trả về cùng thông tin
    // Mà chỉ hiển thị thông tin ngay trong card.
    // Nếu bạn muốn một trang chi tiết riêng, sẽ cần route và page mới.

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (!medicines || medicines.length === 0) {
        return <Alert variant="info">Không tìm thấy thuốc nào phù hợp.</Alert>;
    }

    return (
        <Row xs={1} md={2} lg={3} className="g-4">
            {medicines.map((medicine) => (
                <Col key={medicine.id}>
                    <Card className="h-100 shadow-sm d-flex flex-column"> {/* flex-column để card có chiều cao bằng nhau */}
                        <Card.Body className="d-flex flex-column">
                            <Card.Title className="mb-2">{medicine.name}</Card.Title>
                            <Card.Subtitle className="mb-2 text-muted">
                                Hoạt chất: {medicine.active_ingredient || 'N/A'} - Hàm lượng: {medicine.concentration || 'N/A'}
                            </Card.Subtitle>
                            <Card.Text className="flex-grow-1"> {/* flex-grow-1 để text chiếm đủ không gian */}
                                Đơn vị: {medicine.unit} <br />
                                Giá: <strong>{formatCurrency(medicine.price)}</strong> <br />
                                Nhà sản xuất: {medicine.manufacturer || 'N/A'}
                                {medicine.status === 'discontinued' && (
                                    <Badge bg="warning" className="ms-2">Ngừng kinh doanh</Badge>
                                )}
                                <br />
                                Hướng dẫn: {medicine.instructions || 'N/A'}
                            </Card.Text>
                            {medicine.categories && medicine.categories.length > 0 && (
                                <div className="mt-2">
                                    {medicine.categories.map(cat => (
                                        <Badge key={cat.id} bg="secondary" className="me-1">{cat.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                        {/* Không có nút nếu không có trang chi tiết riêng */}
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default MedicineList;