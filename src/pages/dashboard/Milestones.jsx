import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Button, Modal, Form, Row, Col, Alert } from 'react-bootstrap';
import { Plus, Edit2, Trash2, CheckCircle, Upload, Clock, XCircle, Award, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import PaymentForm from '../../components/PaymentForm';
import MilestoneSubmission from '../../components/MilestoneSubmission';
import MilestoneReview from '../../components/MilestoneReview';
import ProjectCompletion from '../../components/ProjectCompletion';

function Milestones() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCompleteProjectModal, setShowCompleteProjectModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [job, setJob] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'USD',
    dueDate: ''
  });
  const [workSubmission, setWorkSubmission] = useState({
    description: '',
    files: []
  });

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/milestones/job/${jobId}`);
      console.log('Fetched milestones:', response.data);
      setMilestones(response.data);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      setError('Failed to load milestones. Please try refreshing the page.');
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const fetchJobDetails = useCallback(async () => {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      console.log('Fetched job details:', response.data);
      setJob(response.data);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    }
  }, [jobId]);

  useEffect(() => {
    fetchMilestones();
    fetchJobDetails();
  }, [fetchMilestones, fetchJobDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        job: jobId,
        amount: parseFloat(formData.amount)
      };

      // For new milestones, show payment modal
      if (!editingMilestone) {
        setSelectedMilestone(payload);
        setShowModal(false);
        setShowPaymentModal(true);
        return;
      }

      // For editing existing milestones
      await api.patch(`/milestones/${editingMilestone._id}`, payload);
      toast.success('Milestone updated successfully');
      setShowModal(false);
      setEditingMilestone(null);
      setFormData({
        title: '',
        description: '',
        amount: '',
        currency: 'USD',
        dueDate: ''
      });
      fetchMilestones();
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast.error(error.response?.data?.message || 'Failed to save milestone');
    }
  };

  const handlePaymentComplete = async (paymentData) => {
    try {
      // Milestone is already created on the server, just need to refresh UI
      toast.success('Milestone created and escrow funded successfully');
      setShowPaymentModal(false);
      setSelectedMilestone(null);
      fetchMilestones();
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
    }
  };

  const handleReleaseEscrow = async (milestone) => {
    try {
      await api.post(`/payments/release/${milestone.payment._id}`);
      toast.success('Payment released successfully');
      fetchMilestones();
    } catch (error) {
      console.error('Error releasing payment:', error);
      toast.error('Failed to release payment');
    }
  };

  const handleSubmissionComplete = async (submissionData) => {
    try {
      toast.success('Work submitted successfully');
      fetchMilestones();
      setShowSubmitModal(false);
    } catch (error) {
      console.error('Error handling submission completion:', error);
      toast.error('Failed to process submission');
    }
  };

  const handleReviewWork = (milestone) => {
    setSelectedMilestone(milestone);
    setShowReviewModal(true);
  };

  const handleReviewComplete = async (reviewData) => {
    try {
      toast.success('Review submitted successfully');
      
      // Add a short delay to ensure server-side processing is complete
      setTimeout(() => {
        fetchJobDetails();  // Refresh job data to get updated progress
        fetchMilestones();  // Refresh milestone data
      }, 500);
      
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error handling review completion:', error);
      toast.error('Failed to process review');
    }
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description,
      amount: milestone.amount.toString(),
      currency: milestone.currency,
      dueDate: milestone.dueDate.split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    try {
      await api.delete(`/milestones/${milestoneId}`);
      toast.success('Milestone deleted successfully');
      fetchMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    }
  };

  const handleStartWork = async (milestone) => {
    try {
      await api.patch(`/milestones/${milestone._id}/status`, { status: 'in-progress' });
      toast.success('Work started successfully');
      fetchMilestones();
    } catch (error) {
      console.error('Error starting work:', error);
      toast.error('Failed to start work on milestone');
    }
  };

  const handleProjectComplete = async () => {
    try {
      // Mark the job as closed using the correct API endpoint
      await api.patch(`/jobs/${jobId}`, { status: 'closed' });
      toast.success('Project closed successfully!');
      
      setShowCompleteProjectModal(false);
      // Refresh the job data
      fetchJobDetails();
      fetchMilestones();
    } catch (error) {
      // Silently handle the error without showing it to the user
      console.error('Error closing project:', error);
      setShowCompleteProjectModal(false);
    }
  };

  // Check milestone completion stats
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;
  const allMilestonesCompleted = totalMilestones > 0 && completedMilestones === totalMilestones;

  // User and job state checks
  const isJobClosed = job?.status === 'closed';

  // Show the "Complete Project" button if:
  // 1. User is employer AND
  // 2. All milestones are completed AND
  // 3. Project is not already closed
  const showCompleteButton = isEmployer && allMilestonesCompleted && !isJobClosed;

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'warning',
      'in-progress': 'info',
      'completed': 'success',
      'overdue': 'danger'
    };
    return <Badge bg={statusColors[status]}>{status}</Badge>;
  };

  const getJobStatusBadge = (status) => {
    const statusColors = {
      'open': 'primary',
      'in-progress': 'info',
      'completed': 'success',
      'closed': 'secondary',
      'cancelled': 'danger'
    };
    return <Badge bg={statusColors[status] || 'light'}>{status}</Badge>;
  };

  const getEscrowStatus = (milestone) => {
    if (!milestone.payment) {
      return <Badge bg="danger">Unfunded</Badge>;
    }
    switch (milestone.payment.status) {
      case 'held':
        return <Badge bg="warning">In Escrow</Badge>;
      case 'released':
        return <Badge bg="success">Released</Badge>;
      default:
        return <Badge bg="secondary">{milestone.payment.status}</Badge>;
    }
  };

  const handleNavigateToChat = async () => {
    try {
      // First check if job data is loaded
      if (!job) {
        toast.error('Please wait while job data is loading...');
        return;
      }

      // Check if we have the required participant data
      if (!job.employer) {
        console.error('Missing employer data:', { jobId, job });
        toast.error('Unable to start chat. Please try again later.');
        return;
      }

      // For employers, check if freelancer is assigned
      if (isEmployer && !job.freelancer) {
        toast.error('No freelancer has been assigned to this project yet.');
        return;
      }

      // For freelancers, check if they are assigned to this job
      if (!isEmployer && (!job.freelancer || job.freelancer._id !== user._id)) {
        toast.error('You are not assigned to this project.');
        return;
      }

      // Get the other participant's ID based on user role
      const otherParticipantId = isEmployer ? 
        (job.freelancer?._id || job.freelancer) : 
        (job.employer?._id || job.employer);

      // Check if we have the other participant's ID
      if (!otherParticipantId) {
        console.error('Missing participant ID:', { 
          isEmployer, 
          job: { 
            employer: job.employer, 
            freelancer: job.freelancer 
          } 
        });
        toast.error('Unable to start chat. Please try again later.');
        return;
      }

      // Navigate to chat with the other participant
      navigate(`/chat?with=${otherParticipantId}`);
      
    } catch (error) {
      console.error('Error handling chat navigation:', error);
      toast.error('Unable to open chat at this time. Please try again later.');
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

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Milestones</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button onClick={fetchMilestones} variant="outline-danger">
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Project Milestones</h2>
          {job && (
            <div className="d-flex align-items-center mt-2">
              <h5 className="mb-0 me-2">{job.title}</h5>
              {getJobStatusBadge(job.status)}
              {isJobClosed && (
                <div className="ms-3">
                  <Badge bg="info">This project is closed and cannot be edited</Badge>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="light" 
            onClick={handleNavigateToChat}
            title="Open Chat"
          >
            <MessageSquare size={16} className="me-2" />
            Chat
          </Button>

          {showCompleteButton && (
            <Button 
              variant="success" 
              onClick={() => setShowCompleteProjectModal(true)}
            >
              <Award size={16} className="me-2" />
              Complete Project & Review
            </Button>
          )}
          {isEmployer && !showCompleteButton && totalMilestones > 0 && (
            <Alert variant="info" className="mb-0 py-2 px-3">
              <small>
                {completedMilestones === 0 
                  ? "Complete milestones to finish the project" 
                  : completedMilestones < totalMilestones 
                    ? `${completedMilestones}/${totalMilestones} milestones completed` 
                    : isJobClosed
                      ? "Project is closed"
                      : "All milestones completed"}
              </small>
            </Alert>
          )}
          {isEmployer && !isJobClosed && (
            <Button 
              variant="primary" 
              onClick={() => {
                setEditingMilestone(null);
                setFormData({
                  title: '',
                  description: '',
                  amount: '',
                  currency: 'USD',
                  dueDate: ''
                });
                setShowModal(true);
              }}
            >
              <Plus size={16} className="me-2" />
              Add Milestone
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Card.Body>
          {milestones.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted mb-0">No milestones created yet</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone) => (
                  <tr key={milestone._id}>
                    <td>{milestone.title}</td>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        {milestone.description.substring(0, 100)}
                        {milestone.description.length > 100 ? '...' : ''}
                      </div>
                    </td>
                    <td>{formatCurrency(milestone.amount, milestone.currency)}</td>
                    <td>{new Date(milestone.dueDate).toLocaleDateString()}</td>
                    <td>{getStatusBadge(milestone.status)}</td>
                    <td>{getEscrowStatus(milestone)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        {isEmployer ? (
                          <>
                            {!isJobClosed && (
                              <>
                                <Button
                                  variant="light"
                                  size="sm"
                                  onClick={() => handleEdit(milestone)}
                                  title="Edit Milestone"
                                >
                                  <Edit2 size={16} />
                                </Button>
                                <Button
                                  variant="light"
                                  size="sm"
                                  onClick={() => handleDelete(milestone._id)}
                                  title="Delete Milestone"
                                  className="text-danger"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="light"
                              size="sm"
                              onClick={handleNavigateToChat}
                              title="Open Chat"
                            >
                              <MessageSquare size={16} />
                            </Button>
                            {milestone.status === 'in-progress' && 
                             milestone.submission &&
                             milestone.payment?.status === 'held' &&
                             !isJobClosed && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleReleaseEscrow(milestone)}
                                title="Release Payment"
                              >
                                <CheckCircle size={16} className="me-1" />
                                Release Payment
                              </Button>
                            )}
                            {milestone.status === 'in-progress' && 
                             milestone.submission && 
                             !isJobClosed && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleReviewWork(milestone)}
                                title="Review Work"
                              >
                                <CheckCircle size={16} className="me-1" />
                                Review Work
                              </Button>
                            )}
                            {isJobClosed && (
                              <Badge bg="secondary">Project Closed</Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Button
                              variant="light"
                              size="sm"
                              onClick={handleNavigateToChat}
                              title="Open Chat"
                            >
                              <MessageSquare size={16} />
                            </Button>
                            {milestone.status === 'pending' && 
                             milestone.payment && 
                             !isJobClosed && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartWork(milestone)}
                                title="Start Work"
                              >
                                <Clock size={16} className="me-1" />
                                Start
                              </Button>
                            )}
                            {milestone.status === 'in-progress' && 
                             !isJobClosed && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  setSelectedMilestone(milestone);
                                  setShowSubmitModal(true);
                                }}
                                title="Submit Work"
                              >
                                <Upload size={16} className="me-1" />
                                {milestone.submission ? 'Update' : 'Submit'}
                              </Button>
                            )}
                            {isJobClosed && (
                              <Badge bg="secondary">Project Closed</Badge>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Create/Edit Milestone Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingMilestone ? 'Edit Milestone' : 'Create Milestone'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Form.Group>

            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingMilestone ? 'Update' : 'Continue'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Payment Modal */}
      <Modal 
        show={showPaymentModal} 
        onHide={() => setShowPaymentModal(false)}
        backdrop="static"
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Fund Escrow for Milestone</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMilestone && (
            <>
              <div className="mb-4">
                <h5>Milestone Details</h5>
                <p><strong>Title:</strong> {selectedMilestone.title}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedMilestone.amount, selectedMilestone.currency)}</p>
              </div>
              <PaymentForm
                milestone={selectedMilestone}
                onPaymentComplete={handlePaymentComplete}
              />
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Submit Work Modal */}
      <Modal 
        show={showSubmitModal} 
        onHide={() => setShowSubmitModal(false)}
        backdrop="static"
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Submit Work for Milestone</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMilestone && (
            <MilestoneSubmission
              milestone={selectedMilestone}
              onSubmissionComplete={handleSubmissionComplete}
              onClose={() => setShowSubmitModal(false)}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Complete Project Modal */}
      <Modal 
        show={showCompleteProjectModal} 
        onHide={() => setShowCompleteProjectModal(false)}
        backdrop="static"
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Complete Project & Review</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {job && <ProjectCompletion job={job} onComplete={handleProjectComplete} />}
        </Modal.Body>
      </Modal>

      {/* Review Work Modal */}
      <Modal 
        show={showReviewModal} 
        onHide={() => setShowReviewModal(false)}
        backdrop="static"
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Review Work for Milestone</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMilestone && (
            <MilestoneReview
              milestone={selectedMilestone}
              onReviewComplete={handleReviewComplete}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Milestones;