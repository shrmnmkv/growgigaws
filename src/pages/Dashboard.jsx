import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Container, Row, Col, Nav, Card, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Settings,
  CreditCard,
  Users,
  PlusCircle,
  Target
} from 'lucide-react';

// Dashboard components
import Overview from './dashboard/Overview';
import Projects from './dashboard/Projects';
import Messages from './dashboard/Messages';
import Profile from './dashboard/Profile';
import Payments from './dashboard/Payments';
import PostJob from './dashboard/PostJob';
import Milestones from './dashboard/Milestones';
import JobDetails from './JobDetails';
import JobApplications from './JobApplications';

function Dashboard() {
  const { user } = useAuth();
  const isFreelancer = user?.role === 'freelancer';

  return (
    <Container fluid className="py-4">
      <Row>
        {/* Sidebar */}
        <Col md={3} lg={2} className="mb-4">
          <Card>
            <Card.Body className="p-2">
              <Nav className="flex-column">
                <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center p-3">
                  <LayoutDashboard size={18} className="me-3" />
                  Overview
                </Nav.Link>
                <Nav.Link as={Link} to="/dashboard/projects" className="d-flex align-items-center p-3">
                  <Briefcase size={18} className="me-3" />
                  {isFreelancer ? 'My Projects' : 'Posted Jobs'}
                </Nav.Link>
                {isFreelancer && (
                  <Nav.Link as={Link} to="/find-projects" className="d-flex align-items-center p-3">
                    <Target size={18} className="me-3" />
                    Find Projects
                  </Nav.Link>
                )}
                {!isFreelancer && (
                  <>
                    <Nav.Link as={Link} to="/find-candidates" className="d-flex align-items-center p-3">
                      <Users size={18} className="me-3" />
                      Find Candidates
                    </Nav.Link>
                    <Nav.Link as={Link} to="/dashboard/post-job" className="d-flex align-items-center p-3">
                      <PlusCircle size={18} className="me-3" />
                      Post Job
                    </Nav.Link>
                  </>
                )}
                <Nav.Link as={Link} to="/dashboard/messages" className="d-flex align-items-center p-3">
                  <MessageSquare size={18} className="me-3" />
                  Messages
                </Nav.Link>
                <Nav.Link as={Link} to="/dashboard/payments" className="d-flex align-items-center p-3">
                  <CreditCard size={18} className="me-3" />
                  Payments
                </Nav.Link>
                <Nav.Link as={Link} to="/dashboard/profile" className="d-flex align-items-center p-3">
                  <Settings size={18} className="me-3" />
                  Profile
                </Nav.Link>
              </Nav>
            </Card.Body>
          </Card>
        </Col>

        {/* Main Content */}
        <Col md={9} lg={10}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<JobDetails />} />
            <Route path="projects/:id/edit" element={<PostJob />} />
            <Route path="projects/:id/milestones" element={<Milestones />} />
            <Route path="projects/:id/applications" element={<JobApplications />} />
            <Route path="messages" element={<Messages />} />
            <Route path="payments" element={<Payments />} />
            <Route path="profile" element={<Profile />} />
            {!isFreelancer && (
              <Route path="post-job" element={<PostJob />} />
            )}
          </Routes>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;