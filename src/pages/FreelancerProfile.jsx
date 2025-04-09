import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Card, ProgressBar, Form } from 'react-bootstrap';
import { MapPin, Briefcase, Star, Globe, Mail, Linkedin, Github } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function FreelancerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [freelancer, setFreelancer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewStats, setReviewStats] = useState({
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  });

  useEffect(() => {
    const fetchFreelancer = async () => {
      try {
        const response = await api.get(`/freelancers/${id}`);
        setFreelancer(response.data);
      } catch (error) {
        console.error('Error fetching freelancer:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchChats = async () => {
      try {
        const response = await api.get('/chat');
        setChats(response.data);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    fetchFreelancer();
    fetchChats();
  }, [id]);

  // Add a separate effect to fetch reviews once we have the freelancer data
  useEffect(() => {
    if (freelancer && freelancer.user && freelancer.user._id) {
      const fetchReviews = async () => {
        try {
          console.log(`Fetching reviews for user ID: ${freelancer.user._id}`);
          const response = await api.get(`/reviews/user/${freelancer.user._id}`);
          console.log('Reviews API response:', response.data);
          
          // We'll analyze the response structure
          if (response.data && response.data.length > 0) {
            // Use all reviews since they're already filtered server-side
            const freelancerReviews = response.data;
            console.log('Filtered reviews:', freelancerReviews);
            
            setReviews(freelancerReviews);
            
            // Calculate average rating
            if (freelancerReviews.length > 0) {
              const total = freelancerReviews.reduce((sum, review) => {
                console.log(`Review rating: ${review.rating}, type: ${typeof review.rating}`);
                return sum + Number(review.rating);
              }, 0);
              const avg = total / freelancerReviews.length;
              console.log(`Total rating: ${total}, Count: ${freelancerReviews.length}, Average: ${avg}`);
              setAverageRating(avg);
              
              // Calculate rating distribution
              const stats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
              freelancerReviews.forEach(review => {
                // Ensure rating is a number and round it
                const ratingValue = Number(review.rating);
                const roundedRating = Math.round(ratingValue);
                console.log(`Processing rating: ${ratingValue} -> ${roundedRating}`);
                if (stats[roundedRating] !== undefined) {
                  stats[roundedRating]++;
                }
              });
              console.log('Rating distribution:', stats);
              setReviewStats(stats);
            }
          } else {
            console.log('No reviews found in the response');
          }
        } catch (error) {
          console.error('Error fetching reviews:', error);
        }
      };
      
      fetchReviews();
    }
  }, [freelancer]);

  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleContactClick = async () => {
    try {
      if (!user) {
        // Redirect to login if user is not authenticated
        navigate('/login?redirect=' + encodeURIComponent(`/freelancers/${id}`));
        return;
      }

      console.log("=== DEBUG: Starting Chat Creation Process ===");
      console.log("Current User:", {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      });
      
      // Make sure we have the freelancer data
      if (!freelancer || !freelancer.user || !freelancer.user._id) {
        console.error("Error: Freelancer data is incomplete", freelancer);
        alert("Unable to contact freelancer. Missing information.");
        return;
      }

      // Get the freelancer's user ID
      const freelancerUserId = freelancer.user._id;
      
      console.log("Freelancer:", {
        _id: freelancerUserId,
        name: `${freelancer.user.firstName} ${freelancer.user.lastName}`,
        role: freelancer.user.role
      });
      
      // Prevent users from chatting with themselves - convert both IDs to strings for comparison
      const userIdStr = String(user._id);
      const freelancerIdStr = String(freelancerUserId);
      
      if (userIdStr === freelancerIdStr) {
        console.error("Error: Cannot chat with self - IDs match");
        alert("You cannot chat with yourself.");
        return;
      }

      console.log(`ID Comparison: ${freelancerIdStr} === ${userIdStr} ? ${freelancerIdStr === userIdStr}`);
      
      // Check if chat already exists with this freelancer
      console.log("Checking for existing chats...");
      console.log("Available chats:", chats.length);
      
      const existingChat = chats.find(chat => {
        console.log(`Checking chat: ${chat._id}`);
        
        // Get the participant user IDs as strings for reliable comparison
        const participantIds = chat.participants.map(p => {
          const idStr = typeof p.user === 'object' ? String(p.user._id || '') : String(p.user || '');
          console.log(`- Participant: ${idStr}`);
          return idStr;
        });
        
        // Check if both the current user and freelancer are in this chat
        const hasUser = participantIds.includes(userIdStr);
        const hasFreelancer = participantIds.includes(freelancerIdStr);
        console.log(`- Contains user? ${hasUser}, Contains freelancer? ${hasFreelancer}`);
        
        return hasUser && hasFreelancer;
      });

      if (existingChat) {
        // Navigate to existing chat
        console.log("Found existing chat, navigating to:", existingChat._id);
        navigate(`/chat?chatId=${existingChat._id}`);
      } else {
        // Create new chat with the freelancer
        console.log("Creating new chat with freelancer ID:", freelancerIdStr);
        
        const response = await api.post('/chat', {
          participantId: freelancerUserId,
          message: `Hello! I would like to discuss a potential collaboration.`
        });
        
        console.log("Chat creation response:", response.data);
        console.log("New chat participants:", response.data.participants);
        
        if (response.data && response.data._id) {
          console.log("Chat created successfully with ID:", response.data._id);
          navigate(`/chat?chatId=${response.data._id}`);
        } else {
          console.error("Error: Chat creation response is missing _id", response.data);
          alert("Unable to create chat. Please try again later.");
        }
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
      alert("An error occurred while trying to contact this freelancer. Please try again later.");
    }
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  if (!freelancer) {
    return (
      <Container className="py-8">
        <div className="text-center">Freelancer not found</div>
      </Container>
    );
  }

  // Render star ratings
  const renderStars = (rating) => {
    console.log(`Rendering stars for rating: ${rating}`);
    const numericRating = Number(rating);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          fill={i <= numericRating ? "#ffc107" : "none"}
          className={i <= numericRating ? 'text-warning me-1' : 'text-muted me-1'}
        />
      );
    }
    return stars;
  };

  return (
    <Container className="py-8">
      <Row>
        <Col lg={8}>
          {/* Profile Header */}
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex align-items-center mb-4">
                <img
                  src={`https://ui-avatars.com/api/?name=${freelancer.user?.firstName}+${freelancer.user?.lastName}&size=128&background=random`}
                  alt={`${freelancer.user?.firstName} ${freelancer.user?.lastName}`}
                  className="rounded-circle me-4"
                  style={{ width: '128px', height: '128px' }}
                />
                <div>
                  <h1 className="h3 mb-2">
                    {freelancer.user?.firstName} {freelancer.user?.lastName}
                  </h1>
                  <p className="text-muted mb-3">{freelancer.title}</p>
                  <div className="d-flex gap-4">
                    <div className="d-flex align-items-center">
                      <MapPin size={16} className="me-1 text-muted" />
                      <span className="text-muted">Remote</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <Star size={16} className="me-1 text-muted" />
                      <span className="text-muted">{freelancer.availability}</span>
                    </div>
                    {/* Add rating display */}
                    {reviews.length > 0 && (
                      <div className="d-flex align-items-center">
                        <div className="d-flex">
                          {renderStars(averageRating)}
                        </div>
                        <span className="text-muted ms-1">({averageRating.toFixed(1)})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3 mb-4">
                {freelancer.socialLinks?.website && (
                  <a href={freelancer.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-muted">
                    <Globe size={20} />
                  </a>
                )}
                {freelancer.socialLinks?.linkedin && (
                  <a href={freelancer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted">
                    <Linkedin size={20} />
                  </a>
                )}
                {freelancer.socialLinks?.github && (
                  <a href={freelancer.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-muted">
                    <Github size={20} />
                  </a>
                )}
              </div>

              <div className="mb-4">
                <h2 className="h5 mb-3">About Me</h2>
                <p className="text-muted">{freelancer.bio}</p>
              </div>

              <div className="mb-4">
                <h2 className="h5 mb-3">Skills</h2>
                <div className="d-flex flex-wrap gap-2">
                  {freelancer.skills?.map((skill, index) => (
                    <span key={index} className="badge bg-light text-dark">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Experience */}
          <Card className="mb-4">
            <Card.Body>
              <h2 className="h5 mb-4">Experience</h2>
              {freelancer.experience?.map((exp, index) => (
                <div key={index} className="mb-4">
                  <h3 className="h6">{exp.title}</h3>
                  <p className="text-muted">{exp.company} • {exp.location}</p>
                  <p className="text-muted">
                    {new Date(exp.from).toLocaleDateString()} - 
                    {exp.current ? 'Present' : new Date(exp.to).toLocaleDateString()}
                  </p>
                  <p className="text-muted mt-2">{exp.description}</p>
                </div>
              ))}
            </Card.Body>
          </Card>

          {/* Education */}
          <Card className="mb-4">
            <Card.Body>
              <h2 className="h5 mb-4">Education</h2>
              {freelancer.education?.map((edu, index) => (
                <div key={index} className="mb-4">
                  <h3 className="h6">{edu.degree}</h3>
                  <p className="text-muted">{edu.school}</p>
                  <p className="text-muted">{edu.field}</p>
                  <p className="text-muted">
                    {new Date(edu.from).toLocaleDateString()} - 
                    {new Date(edu.to).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </Card.Body>
          </Card>

          {/* Ratings & Reviews Section */}
          <Card>
            <Card.Body>
              <h2 className="h5 mb-4">Client Reviews ({reviews.length})</h2>
              
              {reviews.length > 0 ? (
                <>
                  {/* Rating Summary */}
                  <div className="d-flex align-items-center mb-4">
                    <div className="me-4 text-center">
                      <h3 className="h2 mb-0">{averageRating.toFixed(1)}</h3>
                      <div className="d-flex justify-content-center mb-1">
                        {renderStars(averageRating)}
                      </div>
                      <p className="text-muted small">{reviews.length} reviews</p>
                    </div>
                    
                    <div className="flex-grow-1">
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} className="d-flex align-items-center mb-2">
                          <div className="me-2" style={{ width: '10px' }}>{rating}</div>
                          <ProgressBar 
                            now={reviews.length > 0 ? (reviewStats[rating] / reviews.length) * 100 : 0} 
                            className="flex-grow-1 me-2"
                            style={{ height: '8px' }}
                          />
                          <div style={{ width: '30px' }}>{reviewStats[rating]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Reviews */}
                  <div>
                    {reviews.map((review, index) => (
                      <div key={index} className={index < reviews.length - 1 ? "mb-4 pb-4 border-bottom" : "mb-4 pb-4"}>
                        <div className="d-flex justify-content-between mb-2">
                          <div>
                            <h5 className="mb-1">{review.reviewer?.firstName || 'Anonymous'} {review.reviewer?.lastName || ''}</h5>
                            <div className="d-flex align-items-center">
                              {renderStars(review.rating)}
                              <span className="text-muted ms-2">{formatDate(review.createdAt)}</span>
                            </div>
                          </div>
                          {review.job && (
                            <div className="text-muted small">
                              Project: {typeof review.job === 'object' ? (review.job.title || "Unnamed Project") : "Project"}
                            </div>
                          )}
                        </div>
                        <p className="mt-2">{review.comment}</p>
                        
                        {/* Show skill ratings if available */}
                        {review.skills && review.skills.length > 0 && (
                          <div className="mt-3">
                            <h6 className="mb-2">Skill Ratings</h6>
                            <div className="d-flex flex-wrap gap-3">
                              {review.skills.map((skillRating, idx) => (
                                <div key={idx} className="bg-light p-2 rounded">
                                  <div className="mb-1">{skillRating.skill}</div>
                                  <div className="d-flex">
                                    {renderStars(skillRating.rating)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Show detailed ratings if available */}
                        {(review.communication || review.quality || review.timeliness) && (
                          <div className="d-flex flex-wrap gap-4 mt-3">
                            {review.communication && (
                              <div>
                                <div className="text-muted small">Communication</div>
                                <div className="d-flex">
                                  {renderStars(review.communication)}
                                </div>
                              </div>
                            )}
                            {review.quality && (
                              <div>
                                <div className="text-muted small">Quality</div>
                                <div className="d-flex">
                                  {renderStars(review.quality)}
                                </div>
                              </div>
                            )}
                            {review.timeliness && (
                              <div>
                                <div className="text-muted small">Timeliness</div>
                                <div className="d-flex">
                                  {renderStars(review.timeliness)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <Star size={48} className="text-muted" />
                  </div>
                  <h5>No Reviews Yet</h5>
                  <p className="text-muted">
                    This freelancer hasn't received any reviews from clients yet.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Contact Card */}
          <Card className="sticky-top" style={{ top: '1rem' }}>
            <Card.Body>
              <h3 className="h5 mb-4">Hire {freelancer.user?.firstName}</h3>
              <div className="mb-4">
                <div className="d-flex align-items-center mb-2">
                  <Briefcase size={20} className="me-2 text-muted" />
                  <span className="text-muted">${freelancer.hourlyRate?.amount}/hr</span>
                </div>
              </div>
              <Button 
                variant="primary" 
                size="lg" 
                className="w-100 mb-3"
                onClick={handleContactClick}
              >
                Contact
              </Button>
              <Button variant="outline-primary" size="lg" className="w-100">
                Save Profile
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default FreelancerProfile;