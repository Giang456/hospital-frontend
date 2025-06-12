import React, { useState, useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap'; // Import Alert
import DoctorSearchFilter from '../components/DoctorSearchFilter';
import DoctorList from '../components/DoctorList';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA

const DoctorSearchPage = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchDoctors = async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/patient/doctors/search', { params: filters });
            setDoctors(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách bác sĩ.');
            console.error('Error fetching doctors:', err);
            setError('Không thể tải danh sách bác sĩ. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    const handleSearch = (filters) => {
        fetchDoctors(filters);
    };

    return (
        // XÓA BỌC MainLayout TRỰC TIẾP TẠI ĐÂY
        <Container className="my-4">
            <h2>Tìm kiếm Bác sĩ</h2>
            <DoctorSearchFilter onSearch={handleSearch} />
            {loading && <p className="text-center">Đang tải danh sách bác sĩ...</p>}
            {error && <p className="text-center text-danger">{error}</p>}
            {!loading && !error && <DoctorList doctors={doctors} />}
        </Container>
    );
};

export default DoctorSearchPage;