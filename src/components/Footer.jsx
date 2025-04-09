import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-50 py-8 mt-auto">
      <Container>
        <Row className="mb-4">
          <Col md={3}>
            <h5 className="text-primary font-bold mb-3">GrowGig</h5>
            <p className="text-gray-600">
              Connect with top freelancers and employers worldwide.
            </p>
          </Col>
          <Col md={3}>
            <h6 className="font-semibold mb-3">For Freelancers</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-gray-600 hover:text-primary">Find Projects</a></li>
              <li><a href="#" className="text-gray-600 hover:text-primary">Create Profile</a></li>
              <li><a href="#" className="text-gray-600 hover:text-primary">Find Employers</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h6 className="font-semibold mb-3">For Employers</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-gray-600 hover:text-primary">Post a Job</a></li>
              <li><a href="#" className="text-gray-600 hover:text-primary">Find Candidates</a></li>
              <li><a href="#" className="text-gray-600 hover:text-primary">Pricing</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h6 className="font-semibold mb-3">Connect With Us</h6>
            <div className="flex gap-3">
              <a href="#" className="text-gray-600 hover:text-primary"><Facebook size={20} /></a>
              <a href="#" className="text-gray-600 hover:text-primary"><Twitter size={20} /></a>
              <a href="#" className="text-gray-600 hover:text-primary"><Instagram size={20} /></a>
              <a href="#" className="text-gray-600 hover:text-primary"><Linkedin size={20} /></a>
            </div>
          </Col>
        </Row>
        <hr className="my-4" />
        <div className="text-center text-gray-600">
          © {new Date().getFullYear()} GrowGig. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}

export default Footer;