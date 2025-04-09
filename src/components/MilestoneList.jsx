import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Badge, ProgressBar, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, CheckCircle, Upload, Clock, XCircle, DollarSign } from 'lucide-react';
import MilestoneSubmission from './MilestoneSubmission';
import PaymentForm from './PaymentForm';
import MilestoneReview from './MilestoneReview';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const MilestoneList = ({ jobId }) => {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isEmployer = user?.role === 'employer';

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/milestones/job/${jobId}`);
      console.log('Fetched milestones:', response.data);
      setMilestones(response.data);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Failed to load milestones. Please try again.');
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchMilestones();
    }
  }, [jobId]);

  const handleFundEscrow = async (milestone) => {
    setSelectedMilestone(milestone);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentData) => {
    console.log('Payment completed:', paymentData);
    setShowPaymentModal(false);
    await fetchMilestones();
    toast.success('Escrow funded successfully');
  };

  const handleSubmitWork = (milestone) => {
    setSelectedMilestone(milestone);
    setShowSubmitModal(true);
  };

  const handleReviewWork = (milestone) => {
    setSelectedMilestone(milestone);
    setShowReviewModal(true);
  };

  const handleSubmissionComplete = async (updatedMilestone) => {
    console.log('Submission completed:', updatedMilestone);
    setShowSubmitModal(false);
    await fetchMilestones();
    toast.success('Work submitted successfully');
  };

  const handleReviewComplete = async (reviewData) => {
    console.log('Review completed:', reviewData);
    setShowReviewModal(false);
    await fetchMilestones();
    toast.success('Review submitted successfully');
  };

  const getStatusBadge = (milestone) => {
    let variant = 'secondary';
    let text = milestone.status;

    switch (milestone.status) {
      case 'pending':
        variant = 'warning';
        break;
      case 'in-progress':
        variant = 'primary';
        break;
      case 'completed':
        variant = 'success';
        break;
      case 'overdue':
        variant = 'danger';
        break;
    }

    return <Badge bg={variant}>{text}</Badge>;
  };

  const getEscrowStatus = (milestone) => {
    switch (milestone.escrowStatus) {
      case 'unfunded':
        return <Badge bg="danger">Unfunded</Badge>;
      case 'funded':
        return <Badge bg="success">Funded</Badge>;
      case 'released':
        return <Badge bg="info">Released</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const renderActionButtons = (milestone) => {
    if (isEmployer) {
      return (
        <div className="d-flex gap-2">
          {milestone.escrowStatus === 'unfunded' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleFundEscrow(milestone)}
            >
              <CreditCard size={16} className="me-1" />
              Fund Escrow
            </Button>
          )}
          {milestone.status === 'in-progress' && milestone.submission && (
            <Button
              variant="success"
              size="sm"
              onClick={() => handleReviewWork(milestone)}
            >
              <CheckCircle size={16} className="me-1" />
              Review Work
            </Button>
          )}
        </div>
      );
    } else {
      return (
        <div className="d-flex gap-2">
          {milestone.escrowStatus === 'funded' && milestone.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmitWork(milestone)}
            >
              <Clock size={16} className="me-1" />
              Start Work
            </Button>
          )}
          {milestone.status === 'in-progress' && (
            <Button
              variant="success"
              size="sm"
              onClick={() => handleSubmitWork(milestone)}
            >
              <Upload size={16} className="me-1" />
              {milestone.submission ? 'Update Submission' : 'Submit Work'}
            </Button>
          )}
          {milestone.status === 'completed' && (
            <Badge bg="success">
              <CheckCircle size={16} className="me-1" />
              Completed
            </Badge>
          )}
        </div>
      );
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
      <Table responsive hover>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Escrow</th>
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
              <td>
                <div className="d-flex align-items-center">
                  <DollarSign size={16} className="me-1" />
                  {milestone.amount} {milestone.currency}
                </div>
              </td>
              <td>{new Date(milestone.dueDate).toLocaleDateString()}</td>
              <td>{getStatusBadge(milestone)}</td>
              <td>{getEscrowStatus(milestone)}</td>
              <td>{renderActionButtons(milestone)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Submit Work Modal */}
      <Modal
        show={showSubmitModal}
        onHide={() => setShowSubmitModal(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedMilestone?.status === 'pending' ? 'Start Work' : 'Submit Work'} - {selectedMilestone?.title}
          </Modal.Title>
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

      {/* Payment Modal */}
      <Modal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Fund Escrow - {selectedMilestone?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMilestone && (
            <PaymentForm
              milestone={selectedMilestone}
              onPaymentComplete={handlePaymentComplete}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Review Modal */}
      <Modal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Review Work - {selectedMilestone?.title}
          </Modal.Title>
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
};

export default MilestoneList;