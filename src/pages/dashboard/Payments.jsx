import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Nav, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { List, Clock, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';

function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [currentTab, setCurrentTab] = useState('history');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (currentTab === 'milestones') {
      fetchUserMilestones();
    }
  }, [currentTab]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/history');
      console.log('Fetched payments:', response.data);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserMilestones = async () => {
    try {
      setLoadingMilestones(true);
      let allMilestones = [];
      
      // Different API endpoints based on user role
      if (user?.role === 'freelancer') {
        try {
          // Get projects the freelancer is working on
          const jobsResponse = await api.get('/jobs/my-projects');
          console.log('Freelancer jobs:', jobsResponse.data);
          
          if (jobsResponse.data && jobsResponse.data.length > 0) {
            // Now get milestones for each job
            for (const job of jobsResponse.data) {
              try {
                const milestonesResponse = await api.get(`/milestones/job/${job._id}`);
                // Add job title to each milestone for better context
                const milestonesWithJobInfo = milestonesResponse.data.map(m => ({
                  ...m,
                  jobTitle: job.title
                }));
                allMilestones = [...allMilestones, ...milestonesWithJobInfo];
              } catch (err) {
                console.error(`Error fetching milestones for job ${job._id}:`, err);
              }
            }
          } else {
            console.log('No projects found for freelancer');
          }
        } catch (error) {
          console.error('Error fetching freelancer projects:', error);
          toast.error('Unable to fetch your projects');
        }
      } else if (user?.role === 'employer') {
        try {
          // Get projects the employer created
          const jobsResponse = await api.get('/jobs/my-jobs');
          console.log('Employer jobs:', jobsResponse.data);
          
          if (jobsResponse.data && jobsResponse.data.length > 0) {
            // Now get milestones for each job
            for (const job of jobsResponse.data) {
              try {
                const milestonesResponse = await api.get(`/milestones/job/${job._id}`);
                // Add job title to each milestone for better context
                const milestonesWithJobInfo = milestonesResponse.data.map(m => ({
                  ...m,
                  jobTitle: job.title
                }));
                // For employers, only show milestones that have payments that are not released
                const unreleased = milestonesWithJobInfo.filter(m => 
                  m.payment && m.payment.status !== 'released'
                );
                allMilestones = [...allMilestones, ...unreleased];
              } catch (err) {
                console.error(`Error fetching milestones for job ${job._id}:`, err);
              }
            }
          } else {
            console.log('No projects found for employer');
          }
        } catch (error) {
          console.error('Error fetching employer projects:', error);
          toast.error('Unable to fetch your projects');
        }
      }
      
      console.log('All milestones loaded:', allMilestones.length);
      setMilestones(allMilestones);
    } catch (error) {
      console.error('Error in fetchUserMilestones:', error);
      toast.error('Failed to fetch milestone data');
    } finally {
      setLoadingMilestones(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'warning',
      'in-progress': 'info',
      'completed': 'success',
      'overdue': 'danger'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  const getEscrowStatus = (milestone) => {
    if (!milestone.payment) {
      return <Badge bg="danger">Unfunded</Badge>;
    }
    
    const statusColors = {
      'held': 'info',
      'released': 'success',
      'refunded': 'warning',
      'pending': 'warning'
    };
    
    return <Badge bg={statusColors[milestone.payment.status] || 'secondary'}>
      {milestone.payment.status === 'held' ? 'In Escrow' : milestone.payment.status}
    </Badge>;
  };

  if (loading && currentTab === 'history') {
    return (
      <Container className="py-4">
        <h2 className="mb-4">Payments & Transactions</h2>
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading payment history...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Payments & Transactions</h2>
      
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link 
            active={currentTab === 'history'} 
            onClick={() => setCurrentTab('history')}
          >
            <List size={18} className="me-2" />
            Payment History
          </Nav.Link>
        </Nav.Item>
        {(user?.role === 'freelancer' || user?.role === 'employer') && (
          <Nav.Item>
            <Nav.Link 
              active={currentTab === 'milestones'} 
              onClick={() => setCurrentTab('milestones')}
            >
              <Clock size={18} className="me-2" />
              Milestone Payments
            </Nav.Link>
          </Nav.Item>
        )}
      </Nav>
      
      {currentTab === 'history' && (
        <Row>
          <Col>
            <Card className="mb-4">
              <Card.Header className="bg-white">
                <h4 className="mb-0">
                  <List size={18} className="me-2" />
                  Payment History
                </h4>
              </Card.Header>
              <Card.Body>
                {payments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted mb-0">No payment records found</p>
                  </div>
                ) : (
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>{formatDate(payment.date)}</td>
                          <td>{payment.description}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>
                            <span className={`badge bg-${
                              payment.status === 'completed' || payment.status === 'released' 
                                ? 'success' 
                                : 'warning'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      {currentTab === 'milestones' && (
        <Row>
          <Col>
            <Card className="mb-4">
              <Card.Header className="bg-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="mb-0">
                    <Clock size={18} className="me-2" />
                    {user?.role === 'employer' ? 'Pending Milestone Payments' : 'Milestone Payments'}
                  </h4>
                  <button 
                    className="btn btn-sm btn-outline-primary" 
                    onClick={fetchUserMilestones}
                    disabled={loadingMilestones}
                  >
                    {loadingMilestones ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-1" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={16} className="me-1" />
                        Refresh
                      </>
                    )}
                  </button>
                </div>
              </Card.Header>
              <Card.Body>
                {loadingMilestones ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading milestones...</span>
                    </Spinner>
                    <p className="mt-3">Loading milestone data...</p>
                  </div>
                ) : milestones.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted mb-0">
                      {user?.role === 'employer' 
                        ? "No pending milestone payments found" 
                        : "No milestone payments found for your projects"}
                    </p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Milestone</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Milestone Status</th>
                        <th>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((milestone) => (
                        <tr key={milestone._id}>
                          <td>{milestone.jobTitle}</td>
                          <td>{milestone.title}</td>
                          <td>{formatCurrency(milestone.amount)}</td>
                          <td>{formatDate(milestone.dueDate)}</td>
                          <td>{getStatusBadge(milestone.status)}</td>
                          <td>{getEscrowStatus(milestone)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default Payments;