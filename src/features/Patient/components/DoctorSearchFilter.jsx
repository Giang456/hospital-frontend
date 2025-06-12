import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

const DoctorSearchFilter = ({ onSearch }) => {
    const [keyword, setKeyword] = useState('');
    const [specializations, setSpecializations] = useState([]);
    const [selectedSpecialization, setSelectedSpecialization] = useState('');
    // const [clinics, setClinics] = useState([]); // <-- Bỏ comment nếu bạn có API /public/clinics
    // const [selectedClinic, setSelectedClinic] = useState('');

    useEffect(() => {
        // Lấy danh sách chuyên khoa độc đáo từ tất cả bác sĩ
        const fetchUniqueSpecializations = async () => {
            try {
                // Tạm thời lấy tất cả bác sĩ và lọc ra chuyên khoa duy nhất
                // Đây không phải là cách tối ưu nhất (nên có API riêng cho chuyên khoa)
                const response = await axiosInstance.get('/patient/doctors/search', { params: { paginate: false } }); // Lấy tất cả, không phân trang
                const uniqueSpecs = [...new Set(response.data.data
                    .map(doctor => doctor.doctor_profile?.specialization)
                    .filter(spec => spec)
                )];
                setSpecializations(uniqueSpecs);
            } catch (error) {
                toast.error('Không thể tải danh sách chuyên khoa.');
                console.error('Error fetching unique specializations:', error);
            }
        };

        // Nếu bạn có API công khai cho phòng khám, hãy thêm vào đây
        // const fetchClinics = async () => {
        //     try {
        //         const response = await axiosInstance.get('/public/clinics'); // API này cần được bạn tạo ở backend
        //         setClinics(response.data.data);
        //     } catch (error) {
        //         toast.error('Không thể tải danh sách phòng khám.');
        //         console.error('Error fetching clinics:', error);
        //     }
        // };

        fetchUniqueSpecializations();
        // fetchClinics(); // Bỏ comment nếu có API /public/clinics
    }, []);

    const handleSearch = () => {
        onSearch({
            keyword,
            specialization: selectedSpecialization,
            // clinic_id: selectedClinic, // Bỏ comment nếu có lọc theo phòng khám
        });
    };

    return (
        <Form className="mb-4 p-3 border rounded shadow-sm bg-light">
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group controlId="searchKeyword">
                        <Form.Label>Tìm kiếm theo tên</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Nhập tên bác sĩ..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group controlId="filterSpecialization">
                        <Form.Label>Lọc theo chuyên khoa</Form.Label>
                        <Form.Select
                            value={selectedSpecialization}
                            onChange={(e) => setSelectedSpecialization(e.target.value)}
                        >
                            <option value="">Tất cả chuyên khoa</option>
                            {specializations.map((spec) => (
                                <option key={spec} value={spec}>
                                    {spec}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
            {/* <Row className="mb-3"> */}
                {/* <Col md={6}> */}
                    {/* <Form.Group controlId="filterClinic"> */}
                        {/* <Form.Label>Lọc theo phòng khám</Form.Label> */}
                        {/* <Form.Select */}
                            {/* value={selectedClinic} */}
                            {/* onChange={(e) => setSelectedClinic(e.target.value)} */}
                        {/* > */}
                            {/* <option value="">Tất cả phòng khám</option> */}
                            {/* {clinics.map((clinic) => ( */}
                                {/* <option key={clinic.id} value={clinic.id}> */}
                                    {/* {clinic.name} */}
                                {/* </option> */}
                            {/* ))} */}
                        {/* </Form.Select> */}
                    {/* </Form.Group> */}
                {/* </Col> */}
            {/* </Row> */}
            <Button variant="primary" onClick={handleSearch}>
                Tìm kiếm / Lọc
            </Button>
        </Form>
    );
};

export default DoctorSearchFilter;