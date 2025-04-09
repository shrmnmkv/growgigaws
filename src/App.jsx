import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FindProjects from './pages/FindProjects';
import FindCandidates from './pages/FindCandidates';
import FindEmployers from './pages/FindEmployers';
import JobDetails from './pages/JobDetails';
import EditJob from './pages/EditJob';
import JobApplications from './pages/JobApplications';
import FreelancerProfile from './pages/FreelancerProfile';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/theme.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/find-projects" element={<FindProjects />} />
              <Route path="/find-candidates" element={<FindCandidates />} />
              <Route path="/find-employers" element={<FindEmployers />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route
                path="/jobs/:id/edit"
                element={
                  <PrivateRoute>
                    <EditJob />
                  </PrivateRoute>
                }
              />
              <Route
                path="/jobs/:id/applications"
                element={
                  <PrivateRoute>
                    <JobApplications />
                  </PrivateRoute>
                }
              />
              <Route path="/freelancers/:id" element={<FreelancerProfile />} />
              <Route
                path="/dashboard/*"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <PrivateRoute>
                    <Chat />
                  </PrivateRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
          <ToastContainer position="top-right" />
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;