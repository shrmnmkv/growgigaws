import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'freelancer'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const success = await register(formData);
      if (success) {
        toast.success('Account created successfully!');
        navigate('/dashboard');
      } else {
        toast.error('Failed to create account. Please try again.');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-16">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Body className="p-5">
              <h2 className="text-2xl font-bold text-center mb-4">Create an Account</h2>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>I want to</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="freelancer">Work as a Freelancer</option>
                    <option value="employer">Hire Freelancers</option>
                  </Form.Select>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>

                <p className="text-center mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary">
                    Sign in
                  </Link>
                </p>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Register;