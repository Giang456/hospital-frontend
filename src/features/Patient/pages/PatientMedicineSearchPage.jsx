import React, { useState, useEffect } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import MedicineSearchFilter from '../components/MedicineSearchFilter';
import MedicineList from '../components/MedicineList';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';
// import MainLayout from '../../../components/layouts/MainLayout'; // <-- KHÔNG CẦN DÒNG NÀY NỮA

const PatientMedicineSearchPage = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMedicines = async (filters = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/medicines/search', {
                params: { ...filters, with: 'categories' }
            });
            setMedicines(response.data.data);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách thuốc.');
            console.error('Error fetching medicines:', err);
            setError('Không thể tải danh sách thuốc. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedicines(); // Tải danh sách thuốc khi trang được tải lần đầu
    }, []);

    const handleSearch = (filters) => {
        fetchMedicines(filters);
    };

    return (
        // XÓA BỌC MainLayout TRỰC TIẾP TẠI ĐÂY
        <Container className="my-4">
            <h2>Tra cứu thuốc</h2>
            <MedicineSearchFilter onSearch={handleSearch} />
            {loading && <p className="text-center">Đang tải danh sách thuốc...</p>}
            {error && <p className="text-center text-danger">{error}</p>}
            {!loading && !error && <MedicineList medicines={medicines} />}
        </Container>
    );
};

export default PatientMedicineSearchPage;