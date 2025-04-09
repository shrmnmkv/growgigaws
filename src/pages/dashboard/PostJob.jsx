import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

function PostJob() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState({
    title: '',
    description: '',
    category: '',
    type: 'full-time',
    location: '',
    isRemote: false,
    salary: {
      min: 0,
      max: 0,
      currency: 'USD'
    },
    skills: []
  });

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/jobs/${id}`);
        setJob(response.data);
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
      setLoading(true);
      if (id) {
        await api.put(`/jobs/${id}`, job);
        toast.success('Job updated successfully!');
      } else {
        await api.post('/jobs', job);
        toast.success('Job posted successfully!');
      }
      navigate('/dashboard/projects');
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(error.response?.data?.message || `Failed to ${id ? 'update' : 'post'} job`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">{id ? 'Edit Job' : 'Post a New Job'}</h2>

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Body>
            <h3 className="text-xl font-semibold mb-4">Job Details</h3>
            
            <Form.Group className="mb-3">
              <Form.Label>Job Title</Form.Label>
              <Form.Control
                type="text"
                value={job.title}
                onChange={(e) => setJob({ ...job, title: e.target.value })}
                placeholder="e.g., Senior Frontend Developer"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={job.description}
                onChange={(e) => setJob({ ...job, description: e.target.value })}
                placeholder="Describe the job requirements, responsibilities, and qualifications..."
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    as="select"
                    value={job.category}
                    onChange={(e) => setJob({ ...job, category: e.target.value })}
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="web-development">Web Development</option>
                    <option value="mobile-development">Mobile Development</option>
                    <option value="ui-ux-design">UI/UX Design</option>
                    <option value="data-science">Data Science</option>
                    <option value="devops">DevOps</option>
                    <option value="other">Other</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Job Type</Form.Label>
                  <Form.Control
                    as="select"
                    value={job.type}
                    onChange={(e) => setJob({ ...job, type: e.target.value })}
                    required
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={job.location}
                    onChange={(e) => setJob({ ...job, location: e.target.value })}
                    placeholder="e.g., New York, NY"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Remote Work Available"
                    checked={job.isRemote}
                    onChange={(e) => setJob({ ...job, isRemote: e.target.checked })}
                    className="mt-4"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Salary</Form.Label>
                  <Form.Control
                    type="number"
                    value={job.salary.min}
                    onChange={(e) => setJob({
                      ...job,
                      salary: { ...job.salary, min: Number(e.target.value) }
                    })}
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Salary</Form.Label>
                  <Form.Control
                    type="number"
                    value={job.salary.max}
                    onChange={(e) => setJob({
                      ...job,
                      salary: { ...job.salary, max: Number(e.target.value) }
                    })}
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Control
                    as="select"
                    value={job.salary.currency}
                    onChange={(e) => setJob({
                      ...job,
                      salary: { ...job.salary, currency: e.target.value }
                    })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Required Skills</Form.Label>
              <Form.Control
                type="text"
                value={job.skills.join(', ')}
                onChange={(e) => setJob({
                  ...job,
                  skills: e.target.value.split(',').map(skill => skill.trim())
                })}
                placeholder="Add skills separated by commas (e.g., React, Node.js, MongoDB)"
              />
            </Form.Group>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end">
          <Button variant="secondary" className="me-2" onClick={() => navigate('/dashboard/projects')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {id ? 'Update Job' : 'Post Job'}
          </Button>
        </div>
      </Form>
    </>
  );
}

export default PostJob; 