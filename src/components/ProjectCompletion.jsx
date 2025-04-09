import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { Star, MessageSquare, Award } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ProjectCompletion({ job, onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [acceptedApplication, setAcceptedApplication] = useState(null);
  const [review, setReview] = useState({
    rating: 5,
    communication: 5,
    quality: 5,
    timeliness: 5,
    comment: '',
    skills: job.skills.map(skill => ({
      skill,
      rating: 5
    }))
  });

  // Fetch the accepted application for this job to get the freelancer information
  useEffect(() => {
    const fetchAcceptedApplication = async () => {
      try {
        const response = await api.get(`/jobs/${job._id}/applications`);
        const accepted = response.data.find(app => app.status === 'accepted');
        if (accepted) {
          setAcceptedApplication(accepted);
        } else {
          toast.error('No accepted application found for this job');
        }
      } catch (error) {
        console.error('Error fetching accepted application:', error);
        toast.error('Failed to fetch freelancer information');
      }
    };

    fetchAcceptedApplication();
  }, [job._id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReview(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillRatingChange = (skillIndex, rating) => {
    setReview(prev => ({
      ...prev,
      skills: prev.skills.map((skill, index) => 
        index === skillIndex ? { ...skill, rating: Number(rating) } : skill
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!review.comment.trim()) {
      toast.error('Please provide a review comment');
      return;
    }

    if (!acceptedApplication) {
      toast.error('Unable to complete project without freelancer information');
      return;
    }

    try {
      setLoading(true);

      // Check if the job already has an employer review
      if (job.reviews?.employer) {
        console.log('Job already has an employer review, just updating status to closed');
        // Just update the job status to closed
        await api.patch(`/jobs/${job._id}/complete`, {
          review: job.reviews.employer // Use the existing review ID
        });
        
        toast.success('Project marked as closed');
        
        if (onComplete) {
          onComplete();
        }
        
        navigate('/dashboard/projects');
        return;
      }

      // If no existing review, create a new one
      const response = await api.post('/reviews', {
        job: job._id,
        reviewee: acceptedApplication.freelancer._id,
        ...review
      });

      // Mark project as completed
      await api.patch(`/jobs/${job._id}/complete`, {
        review: response.data._id
      });

      toast.success('Project completed and review submitted');
      
      if (onComplete) {
        onComplete();
      }
      
      navigate('/dashboard/projects');
      
    } catch (error) {
      console.error('Error completing project:', error);
      toast.error(error.response?.data?.message || 'Failed to complete project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Body>
        <div className="d-flex align-items-center mb-4">
          <Award size={24} className="text-primary me-2" />
          <h4 className="mb-0">Complete Project & Review</h4>
        </div>

        {!acceptedApplication ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status" />
            <p className="mt-3">Loading freelancer information...</p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <div className="mb-4">
              <h5>Reviewing work by: {acceptedApplication.freelancer.firstName} {acceptedApplication.freelancer.lastName}</h5>
            </div>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Communication</Form.Label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        size={24}
                        className={`cursor-pointer ${
                          rating <= review.communication ? 'text-warning' : 'text-gray-300'
                        }`}
                        onClick={() => handleInputChange({
                          target: { name: 'communication', value: rating }
                        })}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Quality of Work</Form.Label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        size={24}
                        className={`cursor-pointer ${
                          rating <= review.quality ? 'text-warning' : 'text-gray-300'
                        }`}
                        onClick={() => handleInputChange({
                          target: { name: 'quality', value: rating }
                        })}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Timeliness</Form.Label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        size={24}
                        className={`cursor-pointer ${
                          rating <= review.timeliness ? 'text-warning' : 'text-gray-300'
                        }`}
                        onClick={() => handleInputChange({
                          target: { name: 'timeliness', value: rating }
                        })}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Overall Rating</Form.Label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        size={24}
                        className={`cursor-pointer ${
                          rating <= review.rating ? 'text-warning' : 'text-gray-300'
                        }`}
                        onClick={() => handleInputChange({
                          target: { name: 'rating', value: rating }
                        })}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            <div className="mb-4">
              <h5 className="mb-3">Skills Rating</h5>
              {review.skills.map((skill, index) => (
                <Form.Group key={index} className="mb-3">
                  <Form.Label>{skill.skill}</Form.Label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        size={20}
                        className={`cursor-pointer ${
                          rating <= skill.rating ? 'text-warning' : 'text-gray-300'
                        }`}
                        onClick={() => handleSkillRatingChange(index, rating)}
                      />
                    ))}
                  </div>
                </Form.Group>
              ))}
            </div>

            <Form.Group className="mb-4">
              <Form.Label>Review Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="comment"
                value={review.comment}
                onChange={handleInputChange}
                placeholder="Share your experience working with this freelancer..."
                required
              />
            </Form.Group>

            <Button
              type="submit"
              variant="primary"
              className="w-100"
              disabled={loading}
            >
              {loading ? (
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
                <>
                  <MessageSquare size={16} className="me-2" />
                  Complete Project & Submit Review
                </>
              )}
            </Button>
          </Form>
        )}
      </Card.Body>
    </Card>
  );
}

export default ProjectCompletion;