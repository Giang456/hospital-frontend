import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-center-container">
      <div className="auth-form-card">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;