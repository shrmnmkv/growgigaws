import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function JobApplications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    fetchJobAndApplications();
  }, [id]);

  const fetchJobAndApplications = async () => {
    try {
      const jobResponse = await api.get(`/jobs/${id}`);
      setJob(jobResponse.data);

      const applicationsResponse = await api.get(`/jobs/${id}/applications`);
      setApplications(applicationsResponse.data);
    } catch (error) {
      console.error('Error fetching job applications:', error);
      toast.error('Failed to load applications');
      navigate('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (applicationId) => {
    try {
      await api.put(`/jobs/${id}/applications/${applicationId}/status`, {
        status: 'accepted'
      });
      toast.success('Application accepted');
      fetchJobAndApplications();
    } catch (error) {
      console.error('Error accepting application:', error);
      toast.error('Failed to accept application');
    }
  };

  const handleReject = async (applicationId) => {
    try {
      await api.put(`/jobs/${id}/applications/${applicationId}/status`, {
        status: 'rejected'
      });
      toast.success('Application rejected');
      fetchJobAndApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'warning',
      'accepted': 'success',
      'rejected': 'danger'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
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
        <div>
          <h2 className="mb-0">Applications for {job?.title}</h2>
          <p className="text-muted mb-0">
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <Card>
        <Card.Body>
          {applications.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted mb-0">No applications yet</p>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Freelancer</th>
                  <th>Cover Letter</th>
                  <th>Expected Rate</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application._id}>
                    <td>
                      <div className="font-semibold">
                        {application.freelancer?.firstName} {application.freelancer?.lastName}
                      </div>
                      <small className="text-muted">
                        {application.freelancer?.email}
                      </small>
                    </td>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        {application.coverLetter.substring(0, 100)}
                        {application.coverLetter.length > 100 ? '...' : ''}
                      </div>
                    </td>
                    <td>
                      {application.expectedRate.currency} {application.expectedRate.amount}
                    </td>
                    <td>{getStatusBadge(application.status)}</td>
                    <td>{new Date(application.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="d-flex gap-2">
                        {application.status === 'pending' && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleAccept(application._id)}
                              title="Accept Application"
                            >
                              <CheckCircle size={16} />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleReject(application._id)}
                              title="Reject Application"
                            >
                              <XCircle size={16} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/chat?with=${application.freelancer._id}`)}
                          title="Message Freelancer"
                        >
                          <MessageSquare size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default JobApplications; 