import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { Save } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

function Profile() {
  const { user } = useAuth();
  const isFreelancer = user?.role === 'freelancer';
  const [loading, setLoading] = useState(true);
  const [showOtherSkillInput, setShowOtherSkillInput] = useState(false);
  const [otherSkill, setOtherSkill] = useState('');
  
  // Employer profile state
  const [employerProfile, setEmployerProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    location: ''
  });

  // Freelancer profile state
  const [freelancerProfile, setFreelancerProfile] = useState({
    title: '',
    bio: '',
    skills: [],
    hourlyRate: {
      amount: 0,
      currency: 'USD'
    },
    experience: [],
    education: [],
    socialLinks: {
      linkedin: '',
      github: '',
      website: ''
    },
    availability: 'immediately'
  });

  // Define skill options
  const skillOptions = [
    { value: 'data-engineer', label: 'Data Engineer' },
    { value: 'web-developer', label: 'Web Developer' },
    { value: 'frontend-developer', label: 'Frontend Developer' },
    { value: 'backend-developer', label: 'Backend Developer' },
    { value: 'full-stack-developer', label: 'Full Stack Developer' },
    { value: 'mobile-developer', label: 'Mobile Developer' },
    { value: 'devops-engineer', label: 'DevOps Engineer' },
    { value: 'cloud-architect', label: 'Cloud Architect' },
    { value: 'data-scientist', label: 'Data Scientist' },
    { value: 'machine-learning-engineer', label: 'Machine Learning Engineer' },
    { value: 'ui-ux-designer', label: 'UI/UX Designer' },
    { value: 'graphic-designer', label: 'Graphic Designer' },
    { value: 'project-manager', label: 'Project Manager' },
    { value: 'business-analyst', label: 'Business Analyst' },
    { value: 'carpenter', label: 'Carpentry' },
    { value: 'plumber', label: 'Plumbing' },
    { value: 'electrician', label: 'Electrician' },
    { value: 'writer', label: 'Writer/Editor' },
    { value: 'photographer', label: 'Photographer' },
    { value: 'virtual-assistant', label: 'Virtual Assistant' },
    { value: 'other', label: 'Other (Please specify)' }
  ];

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    // Check if 'Other' skill exists when data is loaded
    const currentSkills = freelancerProfile.skills || [];
    const predefinedSkillValues = skillOptions.map(opt => opt.value);
    const otherSkillValue = currentSkills.find(skill => !predefinedSkillValues.includes(skill) && skill !== 'other');
    if (otherSkillValue) {
      setShowOtherSkillInput(true);
      setOtherSkill(otherSkillValue);
    } else {
      setShowOtherSkillInput(currentSkills.includes('other'));
    }
  }, [freelancerProfile.skills]);

  const fetchProfile = async () => {
    try {
      if (isFreelancer) {
        try {
          const response = await api.get('/freelancers/profile');
          console.log('Fetched freelancer profile:', response.data);
          
          // Set the profile data only if a profile was found
          if (response.data && response.data._id) {
            setFreelancerProfile({
              title: response.data.title || '',
              bio: response.data.bio || '',
              skills: response.data.skills || [],
              hourlyRate: response.data.hourlyRate || { amount: 0, currency: 'USD' },
              experience: response.data.experience || [],
              education: response.data.education || [],
              socialLinks: response.data.socialLinks || {},
              availability: response.data.availability || 'immediately'
            });
          } else {
            // Keep defaults for new profile
            console.log('No existing profile found, will create new one');
          }
        } catch (error) {
          // If 404, means no profile exists yet, that's okay
          if (error.response?.status === 404) {
            console.log('No profile exists yet, will create new one');
          } else {
            throw error; // Re-throw to be caught by outer catch
          }
        }
      } else {
        // For employers, fetch the profile data
        try {
          const response = await api.get('/employers/profile');
          console.log('Fetched employer profile:', response.data);
          
          // Set the profile data only if a profile was found
          if (response.data && response.data._id) {
            setEmployerProfile({
              firstName: response.data.firstName || '',
              lastName: response.data.lastName || '',
              email: response.data.email || '',
              phone: response.data.phone || '',
              company: response.data.company || '',
              position: response.data.position || '',
              location: response.data.location || ''
            });
          }
        } catch (error) {
          if (error.response?.status === 404) {
            console.log('No employer profile exists yet, will create new one');
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (isFreelancer) {
        console.log('Updating freelancer profile with data:', freelancerProfile);
        
        // Make sure we're sending clean data
        let finalSkills = Array.isArray(freelancerProfile.skills) ? [...freelancerProfile.skills] : [];

        // Remove 'other' placeholder if present
        finalSkills = finalSkills.filter(skill => skill !== 'other');

        // Add the custom skill if the input is visible and has a value
        if (showOtherSkillInput && otherSkill.trim()) {
          finalSkills.push(otherSkill.trim());
        }

        // Filter out duplicates (optional, but good practice)
        finalSkills = [...new Set(finalSkills)];

        const profileData = {
          ...freelancerProfile,
          skills: finalSkills,
          hourlyRate: {
            amount: Number(freelancerProfile.hourlyRate.amount) || 0,
            currency: freelancerProfile.hourlyRate.currency || 'USD'
          }
        };
        
        await api.put('/freelancers/profile', profileData);
      } else {
        // Update employer profile using the correct endpoint
        console.log('Updating employer profile with data:', employerProfile);
        await api.put('/employers/profile', employerProfile);
      }
      
      toast.success('Profile updated successfully');
      
      // Refresh the profile data after update
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Profile Settings</h2>

      <Form onSubmit={handleSubmit}>
        {isFreelancer ? (
          // Freelancer Profile Form
          <>
            <Card className="mb-4">
              <Card.Body>
                <h3 className="text-xl font-semibold mb-4">Professional Info</h3>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Professional Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={freelancerProfile.title}
                        onChange={(e) => setFreelancerProfile({ 
                          ...freelancerProfile, 
                          title: e.target.value 
                        })}
                        placeholder="e.g., Senior Frontend Developer"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Hourly Rate ($)</Form.Label>
                      <Form.Control
                        type="number"
                        value={freelancerProfile.hourlyRate.amount}
                        onChange={(e) => setFreelancerProfile({
                          ...freelancerProfile,
                          hourlyRate: { 
                            ...freelancerProfile.hourlyRate, 
                            amount: Number(e.target.value) 
                          }
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Bio</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={freelancerProfile.bio}
                    onChange={(e) => setFreelancerProfile({ 
                      ...freelancerProfile, 
                      bio: e.target.value 
                    })}
                    placeholder="Tell us about yourself..."
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Skills</Form.Label>
                  <Select
                    isMulti
                    options={skillOptions}
                    value={skillOptions.filter(option => 
                      freelancerProfile.skills?.includes(option.value) || 
                      (option.value === 'other' && showOtherSkillInput) ||
                      (showOtherSkillInput && otherSkill && !skillOptions.map(o => o.value).includes(otherSkill) && freelancerProfile.skills?.includes(otherSkill))
                    )}
                    onChange={(selectedOptions) => {
                      const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
                      const hasOther = selectedValues.includes('other');
                      setShowOtherSkillInput(hasOther);

                      // Separate predefined skills from the custom one
                      const predefinedSkills = selectedValues.filter(val => val !== 'other');
                      
                      // If 'Other' is selected, keep the custom skill if it exists
                      // otherwise, add predefined skills. If other skill exists but 'Other' is deselected, remove it.
                      let updatedSkills = [...predefinedSkills];
                      if (hasOther && otherSkill.trim()) {
                          updatedSkills.push(otherSkill.trim());
                      } else if (!hasOther) {
                          // If other is deselected, explicitly remove the custom skill from state if it was the 'other' skill
                           updatedSkills = updatedSkills.filter(s => s !== otherSkill.trim());
                           setOtherSkill(''); // Clear the other skill input
                      }

                      setFreelancerProfile({
                        ...freelancerProfile,
                        skills: updatedSkills
                      });
                    }}
                    placeholder="Select skills..."
                    classNamePrefix="react-select"
                  />
                </Form.Group>

                {showOtherSkillInput && (
                  <Form.Group className="mb-3 ms-2">
                    <Form.Label>Specify "Other" Skill</Form.Label>
                    <Form.Control
                      type="text"
                      value={otherSkill}
                      onChange={(e) => {
                        const newOtherSkill = e.target.value;
                        setOtherSkill(newOtherSkill);
                        // Update the main skills array immediately
                        setFreelancerProfile(prevProfile => {
                          // Remove previous other skill (if any) and add the new one
                          const nonOtherSkills = prevProfile.skills.filter(skill => !skillOptions.map(o => o.value).includes(skill) || skill === 'other');
                          let skillsWithoutOldOther = prevProfile.skills.filter(skill => {
                              const predefined = skillOptions.find(o => o.value === skill);
                              return predefined && predefined.value !== 'other';
                          });

                          // Keep the selected predefined skills and add the new other skill
                          let currentSelectedPredefined = skillOptions
                            .filter(option => prevProfile.skills.includes(option.value) && option.value !== 'other')
                            .map(opt => opt.value);

                          return {
                            ...prevProfile,
                            skills: [...currentSelectedPredefined, newOtherSkill.trim()].filter(Boolean)
                          };
                        });
                      }}
                      placeholder="Enter your skill"
                    />
                  </Form.Group>
                )}
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Body>
                <h3 className="text-xl font-semibold mb-4">Social Links</h3>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>LinkedIn</Form.Label>
                      <Form.Control
                        type="url"
                        value={freelancerProfile.socialLinks.linkedin}
                        onChange={(e) => setFreelancerProfile({
                          ...freelancerProfile,
                          socialLinks: { 
                            ...freelancerProfile.socialLinks, 
                            linkedin: e.target.value 
                          }
                        })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>GitHub</Form.Label>
                      <Form.Control
                        type="url"
                        value={freelancerProfile.socialLinks.github}
                        onChange={(e) => setFreelancerProfile({
                          ...freelancerProfile,
                          socialLinks: { 
                            ...freelancerProfile.socialLinks, 
                            github: e.target.value 
                          }
                        })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Website</Form.Label>
                      <Form.Control
                        type="url"
                        value={freelancerProfile.socialLinks.website}
                        onChange={(e) => setFreelancerProfile({
                          ...freelancerProfile,
                          socialLinks: { 
                            ...freelancerProfile.socialLinks, 
                            website: e.target.value 
                          }
                        })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </>
        ) : (
          // Employer Profile Form
          <Card className="mb-4">
            <Card.Body>
              <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={employerProfile.firstName}
                      onChange={(e) => setEmployerProfile({ 
                        ...employerProfile, 
                        firstName: e.target.value 
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={employerProfile.lastName}
                      onChange={(e) => setEmployerProfile({ 
                        ...employerProfile, 
                        lastName: e.target.value 
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={employerProfile.email}
                      onChange={(e) => setEmployerProfile({ 
                        ...employerProfile, 
                        email: e.target.value 
                      })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      value={employerProfile.phone}
                      onChange={(e) => setEmployerProfile({ 
                        ...employerProfile, 
                        phone: e.target.value 
                      })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Company (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={employerProfile.company}
                      onChange={(e) => setEmployerProfile({ 
                        ...employerProfile, 
                        company: e.target.value 
                      })}
                      placeholder="Enter company name if applicable"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Position (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={employerProfile.position}
                      onChange={(e) => setEmployerProfile({ 
                        ...employerProfile, 
                        position: e.target.value 
                      })}
                      placeholder="Enter your position if applicable"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  value={employerProfile.location}
                  onChange={(e) => setEmployerProfile({ 
                    ...employerProfile, 
                    location: e.target.value 
                  })}
                  placeholder="City, Country"
                />
              </Form.Group>
            </Card.Body>
          </Card>
        )}

        <div className="d-flex justify-content-end">
          <Button type="submit" variant="primary" size="lg">
            <Save size={20} className="mr-2" />
            Save Changes
          </Button>
        </div>
      </Form>
    </>
  );
}

export default Profile;