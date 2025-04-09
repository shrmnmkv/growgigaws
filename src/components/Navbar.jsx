import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar as BsNavbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { Phone, Globe, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const isFreelancer = user?.role === 'freelancer';

  const handleLogout = () => {
    logout();
  };

  return (
    <BsNavbar bg="white" expand="lg" className="shadow-sm">
      <Container>
        <BsNavbar.Brand as={Link} to="/" className="text-primary font-bold text-2xl">
          GrowGig
        </BsNavbar.Brand>
        <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BsNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {user && (
              <Nav.Link as={Link} to="/dashboard" className="d-flex align-items-center">
                <LayoutDashboard size={18} className="me-2" />
                Dashboard
              </Nav.Link>
            )}
            {isFreelancer ? (
              // Freelancer navigation
              <Nav.Link as={Link} to="/find-projects">Find Projects</Nav.Link>
            ) : user && (
              // Employer navigation
              <Nav.Link as={Link} to="/find-candidates">Find Candidates</Nav.Link>
            )}
          </Nav>
          <Nav className="d-flex align-items-center gap-3">
            <Nav.Link href="tel:+1234567890" className="d-flex align-items-center gap-1">
              <Phone size={18} />
              <span>+1 (234) 567-890</span>
            </Nav.Link>
            <Nav.Link href="#" className="d-flex align-items-center gap-1">
              <Globe size={18} />
              <span>EN</span>
            </Nav.Link>
            {user ? (
              <Dropdown align="end">
                <Dropdown.Toggle variant="light" className="d-flex align-items-center gap-2">
                  <User size={18} />
                  {user.firstName}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/dashboard">Dashboard</Dropdown.Item>
                  <Dropdown.Item as={Link} to="/dashboard/profile">Profile</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <LogOut size={18} className="me-2" />
                    Sign Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Nav.Link as={Link} to="/login" className="btn btn-primary text-white">
                <User size={18} className="me-1" />
                Sign In
              </Nav.Link>
            )}
          </Nav>
        </BsNavbar.Collapse>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;