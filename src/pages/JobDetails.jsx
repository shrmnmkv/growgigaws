import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card, Spinner, Form, Modal, InputGroup, Nav } from 'react-bootstrap';
import { MapPin, Briefcase, DollarSign, Calendar, Clock, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Milestones from './dashboard/Milestones';

function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedRate, setExpectedRate] = useState({ amount: '', currency: 'USD' });
  const [activeTab, setActiveTab] = useState('details');
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/jobs/${id}`);
        console.log('Job details:', response.data);
        
        // Set the job data from the response
        setJob(response.data);
        
        // Set application status flags from response
        if (response.data.hasApplied !== undefined) {
          // The backend now sends explicit hasApplied flag
          setIsAccepted(response.data.isAccepted || false);
        } else if (user && user.role === 'freelancer') {
          // Fallback to old logic if needed
          try {
            const appResponse = await api.get(`/jobs/${id}/applications`);
            console.log('Applications response:', appResponse.data);
            const userApplications = appResponse.data.filter(app => app.freelancer._id === user._id);
            
            if (userApplications.length > 0) {
              setJob(prev => ({ ...prev, hasApplied: true }));
              if (userApplications.some(app => app.status === 'accepted')) {
                setIsAccepted(true);
              }
            }
          } catch (appError) {
            console.error('Error fetching application status:', appError);
          }
        }
        
        setExpectedRate(prev => ({
          ...prev,
          amount: response.data.salary.min,
          currency: response.data.salary.currency
        }));
      } catch (error) {
        console.error('Error fetching job:', error);
        console.error('Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          error: error.message
        });
        toast.error(error.response?.data?.message || 'Failed to load job details');
        if (error.response?.status === 404) {
          navigate('/find-projects');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate, user]);

  // Add an effect to update isAccepted when job changes
  useEffect(() => {
    if (job && job.isAccepted) {
      setIsAccepted(true);
    }
  }, [job]);

  // Add debugging logs for application status
  useEffect(() => {
    if (job) {
      console.log('Application status check:', {
        jobId: job._id,
        hasApplied: job.hasApplied,
        isAccepted: isAccepted,
        applicationStatus: job.applicationStatus,
        userRole: user?.role,
        loggedIn: !!user
      });
    }
  }, [job, isAccepted, user]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to apply for jobs');
      navigate('/login');
      return;
    }

    if (user.role !== 'freelancer') {
      toast.error('Only freelancers can apply for jobs');
      return;
    }

    // Validate application data
    if (!coverLetter?.trim()) {
      toast.error('Please provide a cover letter');
      return;
    }

    if (!expectedRate?.amount || expectedRate.amount <= 0) {
      toast.error('Please provide a valid expected rate');
      return;
    }

    // Validate expected rate is within job's salary range
    if (expectedRate.amount < job.salary.min || expectedRate.amount > job.salary.max) {
      toast.error(`Expected rate must be between ${job.salary.currency} ${job.salary.min} and ${job.salary.max}`);
      return;
    }

    try {
      setApplying(true);
      console.log('Attempting to submit application:', {
        jobId: id,
        fullJobId: job._id,
        application: {
          coverLetter: coverLetter.trim(),
          expectedRate
        },
        user
      });
      
      const response = await api.post(`/jobs/${job._id}/apply`, {
        coverLetter: coverLetter.trim(),
        expectedRate
      });
      console.log('Application submission response:', response);
      
      // Update the job state to reflect that the user has applied
      setJob(prev => ({
        ...prev,
        hasApplied: true,
        applicationStatus: 'pending'
      }));
      
      setShowApplyModal(false);
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying for job:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.message,
        config: error.config,
        jobId: id,
        fullJobId: job._id
      });
      
      if (error.response?.status === 404) {
        toast.error('Job not found or has been removed');
        navigate('/find-projects');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to apply for this job');
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('Only freelancers can apply for jobs');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Invalid application data');
      } else {
        toast.error('Failed to submit application. Please try again later.');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('expectedRate.')) {
      const field = name.split('.')[1];
      setExpectedRate(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      setCoverLetter(value);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container className="py-5">
        <Card>
          <Card.Body className="text-center">
            <h2 className="mb-4">Job Not Found</h2>
            <p className="text-muted mb-4">The job you're looking for doesn't exist or has been removed.</p>
            <Button variant="primary" onClick={() => navigate('/find-projects')}>
              Browse Projects
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const isEmployer = user?.role === 'employer';
  const isJobOwner = job.employer?._id === user?._id;

  return (
    <>
      <Container className="py-5">
        <Row>
          <Col lg={8}>
            <Nav variant="tabs" className="mb-4">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                >
                  Job Details
                </Nav.Link>
              </Nav.Item>
              {(isEmployer || job?.status === 'in-progress' || job?.status === 'completed') && (
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'milestones'}
                    onClick={() => setActiveTab('milestones')}
                  >
                    Milestones
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>

            {activeTab === 'details' ? (
              <>
                {/* Job Details Card */}
                <Card className="mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h1 className="h2 mb-0">{job.title}</h1>
                      <span className={`badge ${job.type === 'full-time' ? 'bg-primary' : 'bg-secondary'}`}>
                        {job.type}
                      </span>
                    </div>
                    
                    <Row className="mb-4 g-3">
                      <Col sm={6} md={3}>
                        <div className="d-flex align-items-center">
                          <Building2 size={20} className="me-2 text-muted" />
                          <span className="text-muted">{job.employer?.firstName} {job.employer?.lastName}</span>
                        </div>
                      </Col>
                      <Col sm={6} md={3}>
                        <div className="d-flex align-items-center">
                          <MapPin size={20} className="me-2 text-muted" />
                          <span className="text-muted">{job.location}</span>
                        </div>
                      </Col>
                      <Col sm={6} md={3}>
                        <div className="d-flex align-items-center">
                          <DollarSign size={20} className="me-2 text-muted" />
                          <span className="text-muted">
                            {job.salary.currency} {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
                          </span>
                        </div>
                      </Col>
                      <Col sm={6} md={3}>
                        <div className="d-flex align-items-center">
                          <Clock size={20} className="me-2 text-muted" />
                          <span className="text-muted">{job.type}</span>
                        </div>
                      </Col>
                    </Row>

                    <div className="mb-4">
                      <h2 className="h4 mb-3">Job Description</h2>
                      <p className="text-muted white-space-pre-line">{job.description}</p>
                    </div>

                    {job.skills?.length > 0 && (
                      <div className="mb-4">
                        <h2 className="h4 mb-3">Required Skills</h2>
                        <div className="d-flex flex-wrap gap-2">
                          {job.skills.map((skill, index) => (
                            <span key={index} className="badge bg-light text-dark">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </>
            ) : (
              <Milestones />
            )}
          </Col>

          <Col lg={4}>
            {/* Application Card */}
            <Card className="sticky-top" style={{ top: '2rem' }}>
              <Card.Body>
                <h3 className="h4 mb-4">Apply for this position</h3>
                <div className="mb-4">
                  <Calendar size={20} className="me-2 text-muted" />
                  <span className="text-muted">
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {/* 
                  Button display logic:
                  - For non-freelancers or employers: no button
                  - For freelancers who haven't applied: "Apply Now"
                  - For freelancers who applied but not accepted: "Already Applied"
                  - For freelancers who are accepted: "Go to Project Dashboard"
                */}
                {!isEmployer && user?.role === 'freelancer' && (
                  <>
                    {/* Show Apply button only if not applied */}
                    {!job.hasApplied && !isAccepted && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-100 mb-3"
                        onClick={() => setShowApplyModal(true)}
                      >
                        Apply Now
                      </Button>
                    )}
                    
                    {/* Show Already Applied button if applied but not accepted */}
                    {job.hasApplied && !isAccepted && (
                      <Button
                        variant="success"
                        size="lg"
                        className="w-100 mb-3"
                        disabled
                      >
                        Already Applied
                      </Button>
                    )}
                    
                    {/* Show Working on Project button if accepted */}
                    {isAccepted && (
                      <div className="mb-3">
                        <div className="alert alert-success mb-2 text-center">
                          <strong>You're working on this project!</strong>
                        </div>
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-100"
                          onClick={() => navigate('/dashboard/projects')}
                        >
                          Go to Project Dashboard
                        </Button>
                      </div>
                    )}
                  </>
                )}
                {isJobOwner && (
                  <Button
                    variant="outline-primary"
                    size="lg"
                    className="w-100"
                    onClick={() => navigate(`/jobs/${id}/applications`)}
                  >
                    View Applications
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Apply Modal */}
      <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Apply for {job.title}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleApply}>
          <Modal.Body>
            <Form.Group className="mb-4">
              <Form.Label>Cover Letter</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                name="coverLetter"
                value={coverLetter}
                onChange={handleInputChange}
                placeholder="Introduce yourself and explain why you're a great fit for this position..."
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Expected Rate</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      name="expectedRate.amount"
                      value={expectedRate.amount}
                      onChange={handleInputChange}
                      min={job.salary.min}
                      max={job.salary.max}
                      required
                    />
                    <InputGroup.Text>{expectedRate.currency}</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Control
                    as="select"
                    name="expectedRate.currency"
                    value={expectedRate.currency}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={applying}
            >
              {applying ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

export default JobDetails;