import React, { useEffect } from 'react';
import Header from '../common/Header';
import Footer from '../common/Footer';
import { Outlet } from 'react-router-dom';

const MainLayout = ({ children }) => {
    useEffect(() => {
        const SCRIPT_ID = 'dialogflow-messenger-script';
        const MESSENGER_TAG_NAME = 'df-messenger';

        const initDialogflowMessenger = () => {
            // Kiểm tra xem element df-messenger đã tồn tại trong DOM chưa
            let dfMessengerElement = document.querySelector(MESSENGER_TAG_NAME);

            // 1. Nếu window.dfMessenger đã tồn tại (nghĩa là script đã load và chạy)
            if (window.dfMessenger) {
                console.log('Dialogflow Messenger script đã được load (window.dfMessenger exists).');
                if (!dfMessengerElement) {
                    // Nếu script đã load nhưng element chưa có, tạo và thêm element
                    console.log('df-messenger element không tìm thấy, đang tạo mới...');
                    dfMessengerElement = document.createElement(MESSENGER_TAG_NAME);
                    dfMessengerElement.setAttribute('intent', 'WELCOME');
                    dfMessengerElement.setAttribute('chat-title', 'hospital');
                    dfMessengerElement.setAttribute('agent-id', 'e85a2745-a688-45f6-897d-3af00a8c38a0');
                    dfMessengerElement.setAttribute('language-code', 'vi');
                    document.body.appendChild(dfMessengerElement);
                    console.log('df-messenger element được thêm vào vì script đã được load trước đó.');
                } else {
                    console.log('df-messenger element đã tồn tại.');
                    // Nếu muốn, có thể đảm bảo nó hiển thị nếu trước đó bị ẩn
                    // dfMessengerElement.style.display = '';
                }
                return;
            }

            // 2. Nếu script chưa load (window.dfMessenger chưa có), kiểm tra xem thẻ script đã được thêm vào DOM chưa
            if (document.getElementById(SCRIPT_ID)) {
                console.log('Thẻ script Dialogflow Messenger đã có trong DOM, đang chờ load...');
                // Script đã được thêm nhưng có thể chưa load xong.
                // Hàm onload của script đó sẽ xử lý việc tạo element.
                return;
            }

            // 3. Nếu script chưa được thêm, thì tiến hành thêm script
            console.log('Script Dialogflow Messenger chưa được load. Đang thêm thẻ script...');
            const script = document.createElement('script');
            script.id = SCRIPT_ID;
            script.src = 'https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1';
            script.async = true;

            script.onload = () => {
                console.log('Script Dialogflow Messenger đã load thành công.');
                // Sau khi script tải xong, window.dfMessenger sẽ có sẵn.
                // Kiểm tra lại và tạo element df-messenger nếu chưa có.
                if (!document.querySelector(MESSENGER_TAG_NAME)) {
                    console.log('df-messenger element không tìm thấy sau khi script load, đang tạo mới...');
                    const newDfMessengerElement = document.createElement(MESSENGER_TAG_NAME);
                    newDfMessengerElement.setAttribute('intent', 'WELCOME');
                    newDfMessengerElement.setAttribute('chat-title', 'hospital');
                    newDfMessengerElement.setAttribute('agent-id', 'e85a2745-a688-45f6-897d-3af00a8c38a0');
                    newDfMessengerElement.setAttribute('language-code', 'vi');
                    document.body.appendChild(newDfMessengerElement);
                    console.log('df-messenger element được thêm sau khi script load.');
                }
            };

            script.onerror = () => {
                console.error('Lỗi khi tải script Dialogflow Messenger.');
                // Xóa thẻ script bị lỗi để có thể thử lại ở lần sau (nếu component mount lại)
                const failedScript = document.getElementById(SCRIPT_ID);
                if (failedScript) {
                    failedScript.remove();
                }
            };

            document.body.appendChild(script);
            console.log('Thẻ script Dialogflow Messenger đã được thêm vào body.');
        };

        initDialogflowMessenger();

        // Cleanup function khi component unmount
        return () => {
            // Chỉ xóa element <df-messenger> khỏi DOM.
            // KHÔNG xóa thẻ script, vì nó đã đăng ký custom elements ở mức global.
            // Nếu xóa script và thêm lại, sẽ gây lỗi "already registered".
            const dfMessengerElement = document.querySelector(MESSENGER_TAG_NAME);
            if (dfMessengerElement) {
                dfMessengerElement.remove();
                console.log('df-messenger element đã được xóa khỏi DOM.');
            }
            // Không làm gì với script#SCRIPT_ID ở đây.
        };
    }, []); // Mảng dependency rỗng đảm bảo effect này chỉ chạy một lần sau initial render và cleanup khi unmount.

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main style={{ flexGrow: 1 }}>
                {children || <Outlet />}
            </main>
            <Footer />
            {/* Không cần khai báo <df-messenger> hay <script> ở đây nữa */}
        </div>
    );
};

export default MainLayout;