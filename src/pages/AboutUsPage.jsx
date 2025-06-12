import React from 'react';
import { Container, Row, Col, Card, Image } from 'react-bootstrap';
import MainLayout from '../components/layouts/MainLayout';
import logo from '../assets/images/logo.png'; // <-- Đảm bảo đường dẫn này đúng với logo của bạn
import hospitalBuilding1 from '../assets/images/hospital_building_1.jpg'; // <-- THÊM DÒNG NÀY (Đảm bảo đường dẫn đúng)
import hospitalBuilding2 from '../assets/images/hospital_building_2.jpg'; // <-- THÊM DÒNG NÀY (Đảm bảo đường dẫn đúng)

const AboutUsPage = () => {
    return (
        <MainLayout>
            <Container className="my-4">
                <h1 className="text-center mb-4">Giới thiệu về Bệnh viện TTHG</h1>

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

                {/* THÊM 2 HÌNH ẢNH MỚI VÀO ĐÂY */}
                <Row className="mb-4">
                    <Col md={6} className="mb-3 mb-md-0"> {/* mb-3 cho khoảng cách trên mobile, mb-md-0 cho desktop */}
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
};

export default AboutUsPage;