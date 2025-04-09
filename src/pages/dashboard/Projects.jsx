import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, ProgressBar, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Edit, Trash2, Target, ListChecks } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFreelancer = user?.role === 'freelancer';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Log user info
      console.log('Current user:', {
        id: user?._id,
        role: user?.role,
        token: localStorage.getItem('token')
      });

      // Make API request
      console.log('Making API request to:', isFreelancer ? '/jobs/my-projects' : '/jobs/my-jobs');
      const response = await api.get(isFreelancer ? '/jobs/my-projects' : '/jobs/my-jobs')
        .catch(error => {
          console.error('API call failed:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          throw error;
        });

      console.log('API response:', response.data);

      // Debug logging for statuses
      if (response.data && response.data.length > 0) {
        console.log('Project statuses:', response.data.map(project => ({
          id: project._id,
          title: project.title,
          status: project.status,
          progress: project.progress
        })));
      }

      if (!isFreelancer) {
        // For employers, use the jobs directly as they are already filtered by employer in the backend
        setProjects(response.data);
      } else {
        // For freelancers, use projects as they come from the API - status is already set correctly in the backend
        const projectsWithData = response.data
          .filter(project => project.employer); // Filter out projects without employer
        console.log('Filtered freelancer projects:', projectsWithData);
        setProjects(projectsWithData);
      }
    } catch (error) {
      console.error('Error fetching projects:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load projects';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (projectId) => {
    try {
      console.log('Viewing project:', projectId);
      const response = await api.get(`/jobs/${projectId}`);
      console.log('Project details response:', response.data);
      
      const isEmployer = response.data.employer._id === user._id;
      const isFreelancer = user.role === 'freelancer';
      
      if (!isEmployer && !isFreelancer) {
        toast.error('You are not authorized to view this project');
        return;
      }

      navigate(`/dashboard/projects/${projectId}`);
    } catch (error) {
      console.error('Error checking project authorization:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to check project authorization');
    }
  };

  const handleEdit = async (projectId) => {
    try {
      console.log('Editing project:', projectId);
      const response = await api.get(`/jobs/${projectId}`);
      console.log('Project details response:', response.data);
      
      if (response.data.employer._id !== user._id) {
        toast.error('You are not authorized to edit this project');
        return;
      }
      navigate(`/dashboard/projects/${projectId}/edit`);
    } catch (error) {
      console.error('Error checking project authorization:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Failed to check project authorization');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await api.get(`/jobs/${projectId}`);
      if (response.data.employer._id !== user._id) {
        toast.error('You are not authorized to delete this project');
        return;
      }

      await api.delete(`/jobs/${projectId}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const handlePostNewJob = () => {
    navigate('/dashboard/post-job');
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'open': 'primary',
      'in-progress': 'warning',
      'completed': 'success',
      'closed': 'secondary',
      'cancelled': 'danger'
    };
    return <Badge bg={statusColors[status] || 'light'}>{status}</Badge>;
  };

  // Alternative simpler handlers that bypass authorization checks
  const handleViewSimple = (projectId) => {
    console.log('Using simple view handler for project:', projectId);
    navigate(`/dashboard/projects/${projectId}`);
  };

  const handleEditSimple = (projectId) => {
    console.log('Using simple edit handler for project:', projectId);
    navigate(`/dashboard/projects/${projectId}/edit`);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-2xl font-bold">
          {isFreelancer ? 'My Projects' : 'Posted Jobs'}
        </h2>
        {!isFreelancer && (
          <Button variant="primary" onClick={handlePostNewJob}>
            Post New Job
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          {projects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted mb-0">
                {isFreelancer ? "You haven't been assigned to any projects yet" : "You haven't posted any jobs yet"}
              </p>
              {isFreelancer && (
                <Button 
                  variant="primary" 
                  className="mt-3"
                  onClick={() => navigate('/find-projects')}
                >
                  Browse Available Projects
                </Button>
              )}
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>{isFreelancer ? 'Client' : 'Applications'}</th>
                  <th>Budget</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td>
                      <div className="font-semibold">{project.title}</div>
                      <small className="text-gray-600">{project.category}</small>
                    </td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td style={{ minWidth: '150px' }}>
                      <ProgressBar 
                        now={project.progress || 0} 
                        label={`${project.progress || 0}%`}
                        variant={project.progress === 100 ? 'success' : 'primary'}
                      />
                    </td>
                    <td>
                      {isFreelancer ? (
                        `${project.employer?.firstName} ${project.employer?.lastName}`
                      ) : (
                        <Button 
                          variant="link" 
                          className="p-0" 
                          onClick={() => navigate(`/dashboard/projects/${project._id}/applications`)}
                        >
                          {project.applications?.length || 0} Applications
                        </Button>
                      )}
                    </td>
                    <td>
                      {project.salary.currency} {project.salary.min.toLocaleString()} - {project.salary.max.toLocaleString()}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="light" 
                          size="sm"
                          onClick={() => handleViewSimple(project._id)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </Button>
                        {!isFreelancer ? (
                          <>
                            <Button 
                              variant="light" 
                              size="sm"
                              onClick={() => handleEditSimple(project._id)}
                              title="Edit Job"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="light" 
                              size="sm"
                              onClick={() => handleDelete(project._id)}
                              title="Delete Job"
                              className="text-danger"
                            >
                              <Trash2 size={16} />
                            </Button>
                            {(project.status === 'in-progress' || project.hasAcceptedApplication) && (
                              <Button
                                variant="light"
                                size="sm"
                                onClick={() => navigate(`/dashboard/projects/${project._id}/milestones`)}
                                title="Manage Milestones"
                                className="text-primary"
                              >
                                <ListChecks size={16} />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="light"
                            size="sm"
                            onClick={() => navigate(`/dashboard/projects/${project._id}/milestones`)}
                            title="View Milestones"
                            className="text-primary"
                          >
                            <ListChecks size={16} />
                          </Button>
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
    </>
  );
}

export default Projects;