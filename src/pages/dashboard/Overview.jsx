import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';

function Overview() {
  const { user } = useAuth();
  const isFreelancer = user?.role === 'freelancer';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    earnings: 0,
    totalSpent: 0,
    completedCount: 0,
    activeCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    profileViews: 0,
    successRate: 0,
    hireRate: 0,
    invitationsCount: 0,
    totalHires: 0
  });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/users/dashboard/stats');
        setStats(prevStats => ({
          ...prevStats,
          ...response.data.stats
        }));
        setActivity(response.data.recentActivity || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
      
      {/* Stats */}
      <Row className="mb-4">
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <div className="flex items-center">
                <div className="rounded-full bg-primary-100 p-3 mr-4">
                  <DollarSign size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-gray-600 mb-1">
                    {isFreelancer ? 'Earnings' : 'Total Spent'}
                  </h6>
                  <h4 className="font-bold mb-0">
                    {formatCurrency(isFreelancer ? stats.earnings : stats.totalSpent)}
                  </h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <div className="flex items-center">
                <div className="rounded-full bg-success-100 p-3 mr-4">
                  <CheckCircle size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-gray-600 mb-1">
                    {isFreelancer ? 'Completed Projects' : 'Active Jobs'}
                  </h6>
                  <h4 className="font-bold mb-0">
                    {isFreelancer ? stats.completedCount : stats.activeCount}
                  </h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card>
            <Card.Body>
              <div className="flex items-center">
                <div className="rounded-full bg-warning-100 p-3 mr-4">
                  <Clock size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="text-gray-600 mb-1">
                    {isFreelancer ? 'In Progress' : 'Pending Hires'}
                  </h6>
                  <h4 className="font-bold mb-0">
                    {isFreelancer ? stats.inProgressCount : stats.pendingCount}
                  </h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Activity */}
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">Recent Activity</h5>
            </Card.Header>
            <Card.Body>
              <div className="timeline">
                {activity.length > 0 ? (
                  activity.map((item, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                      <div className="flex items-start">
                        <div className="rounded-full bg-gray-100 p-2 mr-3">
                          <AlertCircle size={20} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-semibold mb-1">{item.title}</p>
                          <p className="text-gray-600 text-sm mb-1">
                            {item.description}
                          </p>
                          <small className="text-gray-500">
                            {formatDate(item.date)}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No recent activity</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Stats */}
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Quick Stats</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Profile Views</span>
                  <div className="flex items-center text-success">
                    <TrendingUp size={16} className="mr-1" />
                    <span>{stats.profileViews}</span>
                  </div>
                </div>
                <h4 className="font-bold">{stats.profileViews}</h4>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">
                    {isFreelancer ? 'Success Rate' : 'Hire Rate'}
                  </span>
                  <div className="flex items-center text-success">
                    <TrendingUp size={16} className="mr-1" />
                    <span>{isFreelancer ? stats.successRate : stats.hireRate}%</span>
                  </div>
                </div>
                <h4 className="font-bold">{isFreelancer ? stats.successRate : stats.hireRate}%</h4>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">
                    {isFreelancer ? 'Job Invitations' : 'Total Hires'}
                  </span>
                  <div className="flex items-center text-success">
                    <Users size={16} className="mr-1" />
                    <span>
                      {isFreelancer ? stats.invitationsCount : stats.totalHires}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold">
                  {isFreelancer ? stats.invitationsCount : stats.totalHires}
                </h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Overview;