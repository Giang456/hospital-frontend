import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Spinner, Alert, Form, Card } from 'react-bootstrap';
import { useForm, useFieldArray } from 'react-hook-form'; // <<< THÊM useFieldArray
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axiosInstance from '../../../services/axiosInstance';
import toast from 'react-hot-toast';

// Schema validation
const configItemSchema = z.object({
    id: z.number(), // Giữ lại ID để biết config nào
    key: z.string(), // Giữ lại key để biết config nào
    value: z.string().min(1, 'Giá trị là bắt buộc.').max(1000, 'Giá trị không được quá 1000 ký tự.'),
    description: z.string().optional().nullable(),
});

const systemConfigSchema = z.object({
    configurations: z.array(configItemSchema),
});

const SystemConfigurationManagementPage = () => {
    // Bỏ state `configs` vì useFieldArray sẽ quản lý dữ liệu form
    // const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const {
        control, // <<< Cần control cho useFieldArray
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setError: setFormError,
        // clearErrors // Không thấy dùng
    } = useForm({
        resolver: zodResolver(systemConfigSchema),
        defaultValues: {
            configurations: [] // Khởi tạo là mảng rỗng
        }
    });

    // Sử dụng useFieldArray để quản lý mảng configurations
    const { fields, append, remove } = useFieldArray({
        control,
        name: "configurations"
    });

    // Fetch System Configurations
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/admin/system-configurations');
            const fetchedConfigs = response.data.data || [];
            // Reset form với dữ liệu fetch được, useFieldArray sẽ tự cập nhật `fields`
            reset({ configurations: fetchedConfigs });
        } catch (err) {
            toast.error('Lỗi khi tải cấu hình hệ thống.');
            console.error('Error fetching configurations:', err);
            setError('Không thể tải cấu hình hệ thống. Vui lòng thử lại.');
            reset({ configurations: [] }); // Reset về rỗng nếu lỗi
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Bỏ reset khỏi dependency vì fetchData sẽ gọi reset

    // Handle form submission
    const onSubmit = async (data) => {
        // `data.configurations` giờ sẽ là mảng các object config đã được validate
        // với id, key, value, description
        try {
            // Backend của bạn có thể chỉ cần mảng các object {key: 'some_key', value: 'new_value'}
            // Hoặc có thể cần mảng các object {id: 1, value: 'new_value'} để cập nhật theo ID
            // Hãy điều chỉnh payload cho phù hợp với API của bạn
            const payload = {
                configurations: data.configurations.map(config => ({
                    // Nếu backend cập nhật theo key:
                    key: config.key,
                    value: config.value,
                    // Hoặc nếu backend cập nhật theo ID:
                    // id: config.id,
                    // value: config.value,
                }))
            };
            console.log("Submitting payload:", payload); // Kiểm tra payload

            const response = await axiosInstance.put('/admin/system-configurations', payload);
            toast.success(response.data.message || 'Cập nhật cấu hình thành công!');

            // API có thể trả về danh sách cấu hình đã cập nhật
            // Nếu vậy, reset form với dữ liệu mới đó
            if (response.data.configurations && response.data.configurations.data) {
                reset({ configurations: response.data.configurations.data });
            } else {
                // Hoặc fetch lại nếu API không trả về dữ liệu mới
                fetchData();
            }
        } catch (err) {
            console.error('Error submitting form:', err.response?.data || err);
            if (err.response?.data?.errors) {
                const serverErrors = err.response.data.errors;
                Object.keys(serverErrors).forEach(key => {
                    // Lỗi từ server cho mảng thường có dạng 'configurations.0.value'
                    // setFormError sẽ xử lý đúng nếu path khớp
                    setFormError(key, { type: 'server', message: serverErrors[key][0] });
                });
                toast.error("Có lỗi xảy ra với dữ liệu nhập. Vui lòng kiểm tra lại.");
            } else {
                toast.error(err.response?.data?.message || 'Đã xảy ra lỗi khi cập nhật.');
            }
        }
    };

    return (
            <Container className="my-4">
                <h2>Cấu hình Hệ thống</h2>
                <Card className="p-4 shadow-sm">
                    <Card.Title className="mb-3">Cài đặt chung</Card.Title>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Table striped bordered hover responsive className="mb-4 align-middle">
                            <thead>
                                <tr>
                                    <th style={{ width: '20%' }}>Khóa (Key)</th>
                                    <th style={{ width: '35%' }}>Mô tả</th>
                                    <th style={{ width: '35%' }}>Giá trị</th>
                                    {/* Bỏ cột Hành động nếu không có nút riêng từng dòng */}
                                </tr>
                            </thead>
                            <tbody>
                                {fields.length > 0 ? (
                                    fields.map((field, index) => ( // Lặp qua `fields` từ useFieldArray
                                        <tr key={field.id}> {/* field.id là ID duy nhất do useFieldArray tạo ra */}
                                            <td>
                                                {/* Hiển thị key, không cho sửa */}
                                                {/* Để gửi key lên server, nó phải là một phần của data được submit */}
                                                {/* useFieldArray đã bao gồm các giá trị ban đầu khi reset */}
                                                <code>{field.key}</code>
                                                {/* Đăng ký ẩn key và id để gửi đi nếu backend cần */}
                                                <input type="hidden" {...register(`configurations.${index}.key`)} />
                                                <input type="hidden" {...register(`configurations.${index}.id`)} />
                                            </td>
                                            <td>{field.description || <span className="text-muted">Không có mô tả</span>}</td>
                                            <td>
                                                <Form.Control
                                                    type={field.key === 'MAINTENANCE_MODE' ? 'checkbox' : 'text'} // Ví dụ: kiểu input dựa trên key
                                                    // Nếu là checkbox, cách đăng ký và lấy giá trị sẽ khác
                                                    // {...register(`configurations.${index}.value`)} // Dùng cho text
                                                    // Sửa lại cho phù hợp với kiểu dữ liệu, ví dụ:
                                                    {...(field.key === 'MAINTENANCE_MODE'
                                                        ? { ...register(`configurations.${index}.value`), defaultChecked: field.value === 'true' || field.value === true || field.value === 1 || field.value === '1' }
                                                        : { ...register(`configurations.${index}.value`) }
                                                    )}
                                                    isInvalid={!!errors.configurations?.[index]?.value}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.configurations?.[index]?.value?.message}
                                                </Form.Control.Feedback>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={3} className="text-center">Không có cấu hình nào để hiển thị.</td></tr>
                                )}
                            </tbody>
                        </Table>
                        <Button variant="primary" type="submit" disabled={isSubmitting || loading}>
                            {isSubmitting ? <><Spinner size="sm" className="me-2"/>Đang lưu...</> : 'Lưu tất cả cấu hình'}
                        </Button>
                    </Form>
                </Card>
            </Container>
    );
};

export default SystemConfigurationManagementPage;