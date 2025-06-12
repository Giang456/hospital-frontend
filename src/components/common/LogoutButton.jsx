import React from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth hook
import toast from 'react-hot-toast';

const LogoutButton = () => {
    const { logout, isAuthenticated } = useAuth(); // Lấy hàm logout và trạng thái isAuthenticated từ AuthContext
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (isAuthenticated) {
            await logout(); // Gọi hàm logout từ AuthContext
            toast.success('Bạn đã đăng xuất thành công.');
            // Chuyển hướng sẽ được xử lý trong AuthContext.jsx
            // navigate('/login'); // Có thể bỏ nếu đã chuyển hướng trong AuthContext
        } else {
            toast.error('Bạn chưa đăng nhập.');
            navigate('/login');
        }
    };

    // Chỉ hiển thị nút nếu người dùng đã đăng nhập
    if (!isAuthenticated) {
        return null;
    }

    return (
        <Button variant="danger" onClick={handleLogout} className="ms-2">
            Đăng xuất
        </Button>
    );
};

export default LogoutButton;