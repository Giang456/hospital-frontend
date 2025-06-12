import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Đảm bảo index.css đã import Bootstrap
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider> {/* Bọc App component bằng AuthProvider */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
);