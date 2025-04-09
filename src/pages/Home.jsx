import React from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { Search, Briefcase, Users, Building2, Grid3X3 } from 'lucide-react';

function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-primary-50 py-16">
        <Container>
          <Row className="align-items-center">
            <Col md={8} className="mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">Find Your Next Opportunity</h1>
              <p className="text-xl text-gray-600 mb-8">
                Connect with top freelancers and employers worldwide
              </p>
              <Form className="bg-white p-4 rounded-lg shadow-sm">
                <Row>
                  <Col md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Job title or keyword"
                      className="mb-2 mb-md-0"
                    />
                  </Col>
                  <Col md={5}>
                    <Form.Control
                      type="text"
                      placeholder="Location"
                      className="mb-2 mb-md-0"
                    />
                  </Col>
                  <Col md={2}>
                    <Button variant="primary" className="w-100">
                      <Search size={20} className="me-2" />
                      Search
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Stats Section */}
      <section className="py-12">
        <Container>
          <Row>
            <Col md={3} className="text-center mb-4">
              <div className="text-primary mb-2">
                <Briefcase size={32} className="mx-auto" />
              </div>
              <h3 className="text-2xl font-bold">1,234</h3>
              <p className="text-gray-600">Live Jobs</p>
            </Col>
            <Col md={3} className="text-center mb-4">
              <div className="text-primary mb-2">
                <Users size={32} className="mx-auto" />
              </div>
              <h3 className="text-2xl font-bold">5,678</h3>
              <p className="text-gray-600">Freelancers</p>
            </Col>
            <Col md={3} className="text-center mb-4">
              <div className="text-primary mb-2">
                <Building2 size={32} className="mx-auto" />
              </div>
              <h3 className="text-2xl font-bold">890</h3>
              <p className="text-gray-600">Companies</p>
            </Col>
            <Col md={3} className="text-center mb-4">
              <div className="text-primary mb-2">
                <Grid3X3 size={32} className="mx-auto" />
              </div>
              <h3 className="text-2xl font-bold">12</h3>
              <p className="text-gray-600">Categories</p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-50 py-16">
        <Container>
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <Row>
            {[
              {
                title: 'Create an Account',
                description: 'Sign up as a freelancer or employer in minutes',
                icon: '1'
              },
              {
                title: 'Post or Apply for Jobs',
                description: 'Find the perfect opportunity or talent',
                icon: '2'
              },
              {
                title: 'Collaborate & Work',
                description: 'Work together seamlessly on projects',
                icon: '3'
              },
              {
                title: 'Get Paid Securely',
                description: 'Payments protected through escrow',
                icon: '4'
              }
            ].map((step, index) => (
              <Col key={index} md={3} className="mb-4">
                <Card className="border-0 h-100 shadow-sm">
                  <Card.Body className="text-center">
                    <div className="bg-primary text-white rounded-circle w-12 h-12 flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold">{step.icon}</span>
                    </div>
                    <Card.Title className="font-bold mb-3">{step.title}</Card.Title>
                    <Card.Text className="text-gray-600">{step.description}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <Container>
          <Row className="g-4">
            <Col md={6}>
              <Card className="bg-primary text-white p-4">
                <Card.Body className="text-center">
                  <h3 className="text-2xl font-bold mb-4">For Employers</h3>
                  <p className="mb-4">Find the perfect freelancer for your project</p>
                  <Button variant="light" size="lg">Post a Job</Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="bg-primary-100 p-4">
                <Card.Body className="text-center">
                  <h3 className="text-2xl font-bold mb-4">For Freelancers</h3>
                  <p className="mb-4">Find your next opportunity</p>
                  <Button variant="primary" size="lg">Find Projects</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
}

export default Home;