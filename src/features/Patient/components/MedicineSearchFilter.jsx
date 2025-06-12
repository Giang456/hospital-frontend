import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

const MedicineSearchFilter = ({ onSearch }) => {
    const [keyword, setKeyword] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        // Lấy danh sách loại thuốc từ backend
        const fetchCategories = async () => {
            try {
                const response = await axiosInstance.get('/medicine-categories-lookup'); // API chung cho tra cứu loại thuốc
                setCategories(response.data.data);
            } catch (error) {
                toast.error('Không thể tải danh sách loại thuốc.');
                console.error('Error fetching medicine categories:', error);
            }
        };

        fetchCategories();
    }, []);

    const handleSearch = () => {
        onSearch({
            keyword,
            category_id: selectedCategory,
        });
    };

    return (
        <Form className="mb-4 p-3 border rounded shadow-sm bg-light">
            <Row className="mb-3">
                <Col md={6}>
                    <Form.Group controlId="searchKeyword">
                        <Form.Label>Tìm kiếm theo tên/hoạt chất</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Nhập tên thuốc hoặc hoạt chất..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group controlId="filterCategory">
                        <Form.Label>Lọc theo loại thuốc</Form.Label>
                        <Form.Select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Tất cả loại thuốc</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
            <Button variant="primary" onClick={handleSearch}>
                Tìm kiếm / Lọc
            </Button>
        </Form>
    );
};

export default MedicineSearchFilter;