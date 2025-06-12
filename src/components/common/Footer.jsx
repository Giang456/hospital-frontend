import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
    return (
        <footer className="bg-dark text-white mt-auto py-3"> {/* mt-auto để footer luôn ở cuối */}
            <Container className="text-center">
                <p>© {new Date().getFullYear()} Hospital Management System. All rights reserved.</p>
            </Container>
        </footer>
    );
};

export default Footer;