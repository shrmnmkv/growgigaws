import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { Search, MapPin, Building2, Users } from 'lucide-react';
import axios from 'axios';

function FindEmployers() {
  const [employers, setEmployers] = useState([]);
  const [filters, setFilters] = useState({
    keyword: '',
    location: '',
    industry: ''
  });

  useEffect(() => {
    const fetchEmployers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/employers');
        setEmployers(response.data);
      } catch (error) {
        console.error('Error fetching employers:', error);
      }
    };
    fetchEmployers();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-6">Find Employers</h1>
      
      {/* Search and Filters */}
      <Card className="mb-6">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Keyword</Form.Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Form.Control
                    type="text"
                    name="keyword"
                    placeholder="Company name or keyword"
                    value={filters.keyword}
                    onChange={handleFilterChange}
                    className="pl-10"
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Form.Control
                    type="text"
                    name="location"
                    placeholder="City or country"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="pl-10"
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Industry</Form.Label>
                <Form.Select name="industry" value={filters.industry} onChange={handleFilterChange}>
                  <option value="">All Industries</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Employer Listings */}
      <Row>
        {employers.map((employer) => (
          <Col key={employer._id} md={6} lg={4} className="mb-4">
            <Card className="h-100 hover:shadow-lg transition-shadow">
              <Card.Body>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 size={40} className="text-white" />
                  </div>
                  <h5 className="font-bold mb-1">
                    {employer.firstName} {employer.lastName}
                  </h5>
                  <p className="text-gray-600 mb-2">Company Name</p>
                </div>
                <div className="mb-3">
                  <div className="flex items-center mb-2">
                    <MapPin size={16} className="mr-2 text-gray-500" />
                    <span className="text-gray-600">Location</span>
                  </div>
                  <div className="flex items-center">
                    <Users size={16} className="mr-2 text-gray-500" />
                    <span className="text-gray-600">5-10 employees</span>
                  </div>
                </div>
                <div className="mb-3">
                  <h6 className="font-semibold mb-2">Recent Job Posts</h6>
                  <ul className="list-none p-0">
                    <li className="text-gray-600 mb-1">• Senior Frontend Developer</li>
                    <li className="text-gray-600 mb-1">• UI/UX Designer</li>
                    <li className="text-gray-600">• Project Manager</li>
                  </ul>
                </div>
                <Button
                  variant="primary"
                  href={`/employers/${employer._id}`}
                  className="w-100"
                >
                  View Profile
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default FindEmployers;