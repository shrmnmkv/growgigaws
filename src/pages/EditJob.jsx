import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState({
    title: '',
    description: '',
    category: 'web-development',
    type: 'full-time',
    location: '',
    isRemote: false,
    skills: [],
    salary: {
      min: '',
      max: '',
      currency: 'USD'
    }
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await api.get(`/jobs/${id}`);
        // Convert skills array to string for the form
        const jobData = response.data;
        jobData.skills = jobData.skills.join(', ');
        setJob(jobData);
      } catch (error) {
        console.error('Error fetching job:', error);
        toast.error('Failed to load job details');
        navigate('/dashboard/projects');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);

      // Validate required fields
      const requiredFields = ['title', 'description', 'category', 'type', 'location'];
      const missingFields = requiredFields.filter(field => !job[field]);
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Validate salary
      if (!job.salary.min || !job.salary.max) {
        toast.error('Please specify salary range');
        return;
      }

      // Convert salary values to numbers
      const minSalary = Number(job.salary.min);
      const maxSalary = Number(job.salary.max);

      if (isNaN(minSalary) || isNaN(maxSalary)) {
        toast.error('Salary must be a valid number');
        return;
      }

      if (minSalary <= 0 || maxSalary <= 0) {
        toast.error('Salary must be greater than 0');
        return;
      }

      if (minSalary >= maxSalary) {
        toast.error('Maximum salary must be greater than minimum salary');
        return;
      }

      // Convert skills string to array
      const skillsArray = job.skills.split(',').map(skill => skill.trim()).filter(Boolean);
      
      if (skillsArray.length === 0) {
        toast.error('Please specify at least one skill');
        return;
      }

      // Prepare job data
      const jobData = {
        ...job,
        skills: skillsArray,
        salary: {
          ...job.salary,
          min: minSalary,
          max: maxSalary
        }
      };

      await api.put(`/jobs/${id}`, jobData);
      toast.success('Job updated successfully');
      navigate('/dashboard/projects');
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error(error.response?.data?.message || 'Failed to update job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('salary.')) {
      const field = name.split('.')[1];
      setJob(prev => ({
        ...prev,
        salary: {
          ...prev.salary,
          [field]: value
        }
      }));
    } else {
      setJob(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex align-items-center mb-4">
        <Button 
          variant="link" 
          className="p-0 me-3" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={24} />
        </Button>
        <h2 className="mb-0">Edit Job</h2>
      </div>

      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Job Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={job.title}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                name="description"
                value={job.description}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    name="category"
                    value={job.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="web-development">Web Development</option>
                    <option value="mobile-development">Mobile Development</option>
                    <option value="design">Design</option>
                    <option value="writing">Writing</option>
                    <option value="admin-support">Admin Support</option>
                    <option value="customer-service">Customer Service</option>
                    <option value="marketing">Marketing</option>
                    <option value="accounting">Accounting</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Select
                    name="type"
                    value={job.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={job.location}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Remote Work Available"
                    name="isRemote"
                    checked={job.isRemote}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Required Skills (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                name="skills"
                value={job.skills}
                onChange={handleInputChange}
                placeholder="e.g. JavaScript, React, Node.js"
                required
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Salary</Form.Label>
                  <Form.Control
                    type="number"
                    name="salary.min"
                    value={job.salary.min}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Salary</Form.Label>
                  <Form.Control
                    type="number"
                    name="salary.max"
                    value={job.salary.max}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    name="salary.currency"
                    value={job.salary.currency}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-2 justify-content-end">
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard/projects')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
              >
                {submitting ? 'Updating...' : 'Update Job'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default EditJob; 