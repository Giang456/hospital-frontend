import React from 'react';
import { Card, Button, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const DoctorList = ({ doctors }) => {
    const navigate = useNavigate();

    const handleViewAvailability = (doctorId) => {
        navigate(`/patient/doctors/${doctorId}/availability`);
    };

    if (!doctors || doctors.length === 0) {
        return <Alert variant="info">Không tìm thấy bác sĩ nào phù hợp.</Alert>;
    }

    return (
        <Row xs={1} md={2} lg={3} className="g-4">
            {doctors.map((doctor) => (
                <Col key={doctor.id}>
                    <Card className="h-100 shadow-sm">
                        <Card.Body>
                            <Card.Title>{doctor.name}</Card.Title>
                            <Card.Subtitle className="mb-2 text-muted">
                                {doctor.doctor_profile?.specialization || 'Chuyên khoa đang cập nhật'}
                            </Card.Subtitle>
                            <Card.Text>
                                Email: {doctor.email} <br />
                                Phòng khám: {doctor.clinic?.name || 'Chưa xác định'} <br />
                                Kinh nghiệm: {doctor.doctor_profile?.experience_years ? `${doctor.doctor_profile.experience_years} năm` : 'N/A'}
                            </Card.Text>
                            <Button variant="outline-primary" onClick={() => handleViewAvailability(doctor.id)}>
                                Xem lịch trống
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default DoctorList;