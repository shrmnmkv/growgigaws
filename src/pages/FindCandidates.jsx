import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { Search, MapPin, Briefcase, Star, Award } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { recommender } from '../utils/recommendationSystem';

function FindCandidates() {
  const [freelancers, setFreelancers] = useState([]);
  const [recommendedFreelancers, setRecommendedFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    keyword: '',
    location: '',
    hourlyRate: ''
  });

  const fetchFreelancers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Making request to fetch freelancers...');
      
      const params = new URLSearchParams();
      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.location) params.append('location', filters.location);
      
      if (filters.hourlyRate) {
        const [min, max] = filters.hourlyRate.split('-');
        if (min) params.append('minRate', min);
        if (max && max !== '+') params.append('maxRate', max);
        if (max === '+') params.append('minRate', min);
      }

      const url = `/freelancers?${params.toString()}`;
      console.log('Request URL:', url);

      const response = await api.get(url);
      console.log('Response received:', response.data);
      
      if (Array.isArray(response.data)) {
        setFreelancers(response.data);
        
        // Generate recommendations if we have enough freelancers
        if (response.data.length > 0) {
          // Initialize recommender if needed
          if (!recommender.initialized) {
            await recommender.initialize(100, response.data.length); // Assuming max 100 users
          }

          // Get recommendations based on skills and hourly rate
          const recommendations = recommender.getSimilarFreelancers(
            response.data[0], // Use first freelancer as reference
            response.data,
            5 // Get top 5 recommendations
          );

          setRecommendedFreelancers(recommendations);
        }
      } else {
        console.error('Invalid response format, expected array:', response.data);
        setError('Invalid data received from server');
        setFreelancers([]);
      }
    } catch (error) {
      console.error('Error fetching freelancers:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        setError(`Server error: ${error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('Could not connect to the server. Please try again later.');
      } else {
        console.error('Error setting up request:', error.message);
        setError('An error occurred while setting up the request.');
      }
      setFreelancers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreelancers();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFreelancers();
  };

  const renderFreelancerCard = (freelancer) => (
    <Col key={freelancer._id} md={6} lg={4} className="mb-4">
      <Card className="h-100 hover:shadow-lg transition-shadow">
        <Card.Body>
          <div className="text-center mb-4">
            <img
              src={`https://ui-avatars.com/api/?name=${freelancer.user?.firstName}+${freelancer.user?.lastName}&background=random`}
              alt={`${freelancer.user?.firstName} ${freelancer.user?.lastName}`}
              className="rounded-full w-20 h-20 mx-auto mb-3"
            />
            <h5 className="font-bold mb-1">
              {freelancer.user?.firstName} {freelancer.user?.lastName}
            </h5>
            <p className="text-gray-600 mb-2">{freelancer.title}</p>
          </div>
          <div className="mb-3">
            <div className="flex items-center mb-2">
              <MapPin size={16} className="mr-2 text-gray-500" />
              <span className="text-gray-600">Remote</span>
            </div>
            <div className="flex items-center mb-2">
              <Briefcase size={16} className="mr-2 text-gray-500" />
              <span className="text-gray-600">${freelancer.hourlyRate?.amount}/hr</span>
            </div>
            <div className="flex items-center mb-2">
              <Star size={16} className="mr-2 text-gray-500" />
              <span className="text-gray-600">Available {freelancer.availability}</span>
            </div>
            {freelancer.rating > 0 && (
              <div className="flex items-center">
                <Award size={16} className="mr-2 text-gray-500" />
                <span className="text-gray-600">{freelancer.rating.toFixed(1)} Rating</span>
              </div>
            )}
          </div>
          <div className="mb-3">
            <h6 className="font-semibold mb-2">Skills</h6>
            <div className="flex flex-wrap gap-2">
              {freelancer.skills?.slice(0, 4).map((skill, index) => (
                <span key={index} className="badge bg-light text-dark">
                  {skill}
                </span>
              ))}
              {freelancer.skills?.length > 4 && (
                <span className="badge bg-light text-dark">+{freelancer.skills.length - 4}</span>
              )}
            </div>
          </div>
          <Button
            variant="primary"
            href={`/freelancers/${freelancer._id}`}
            className="w-100"
          >
            View Profile
          </Button>
        </Card.Body>
      </Card>
    </Col>
  );

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-6">Find Candidates</h1>
      
      <Card className="mb-6">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Keyword</Form.Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Form.Control
                      type="text"
                      name="keyword"
                      placeholder="Skills or expertise"
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Hourly Rate</Form.Label>
                  <Form.Select name="hourlyRate" value={filters.hourlyRate} onChange={handleFilterChange}>
                    <option value="">Any Rate</option>
                    <option value="0-25">$0 - $25</option>
                    <option value="25-50">$25 - $50</option>
                    <option value="50-100">$50 - $100</option>
                    <option value="100+">$100+</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col className="text-end">
                <Button type="submit" variant="primary" className="search-candidates-btn">
                  Search Candidates
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* Recommended Freelancers Section */}
          {recommendedFreelancers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
              <Row>
                {recommendedFreelancers.map(freelancer => renderFreelancerCard(freelancer))}
              </Row>
            </div>
          )}

          {/* All Freelancers Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">All Candidates</h2>
            <Row>
              {freelancers.length === 0 ? (
                <Col>
                  <Alert variant="info">
                    No freelancers found matching your criteria. Try adjusting your filters.
                  </Alert>
                </Col>
              ) : (
                freelancers.map(freelancer => renderFreelancerCard(freelancer))
              )}
            </Row>
          </div>
        </>
      )}
    </Container>
  );
}

export default FindCandidates;