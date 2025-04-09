import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { Search, MapPin, Briefcase, DollarSign } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

function FindProjects() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: '',
    location: '',
    type: '',
    salary: ''
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await api.get('/jobs');
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast.error('Failed to load projects. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-6">Find Projects</h1>
      
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
                    placeholder="Job title or keyword"
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
                    placeholder="City or remote"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="pl-10"
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select name="type" value={filters.type} onChange={handleFilterChange}>
                  <option value="">All Types</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Salary Range</Form.Label>
                <Form.Select name="salary" value={filters.salary} onChange={handleFilterChange}>
                  <option value="">Any Range</option>
                  <option value="0-25000">$0 - $25,000</option>
                  <option value="25000-50000">$25,000 - $50,000</option>
                  <option value="50000-75000">$50,000 - $75,000</option>
                  <option value="75000+">$75,000+</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Job Listings */}
      <Row>
        {jobs.map((job) => (
          <Col key={job._id} md={6} lg={4} className="mb-4">
            <Card className="h-100 hover:shadow-lg transition-shadow">
              <Card.Body>
                <div className="flex items-center justify-between mb-3">
                  <span className={`badge ${job.type === 'full-time' ? 'bg-primary' : 'bg-secondary'}`}>
                    {job.type}
                  </span>
                  {job.isRemote && (
                    <span className="badge bg-success">Remote</span>
                  )}
                </div>
                <Card.Title className="font-bold mb-2">{job.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-gray-600">
                  {job.employer?.firstName} {job.employer?.lastName}
                </Card.Subtitle>
                <div className="mb-3 text-gray-600">
                  <div className="flex items-center mb-1">
                    <MapPin size={16} className="mr-2" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <Briefcase size={16} className="mr-2" />
                    <span>{job.category}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2" />
                    <span>${job.salary.min} - ${job.salary.max}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <Button variant="primary" href={`/jobs/${job._id}`} className="w-100">
                    View Details
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default FindProjects;