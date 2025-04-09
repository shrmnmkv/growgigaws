import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, ListGroup } from 'react-bootstrap';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { Download, FileText, Image } from 'lucide-react';

// Helper function to format file paths for display and download
const getFileUrl = (filePath) => {
  // If it's already a full URL, return as is
  if (filePath?.startsWith('http')) {
    return filePath;
  }
  
  // If it's a relative URL, prepend the API URL if available
  if (filePath) {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    // Make sure we don't have double slashes
    if (apiUrl.endsWith('/') && filePath.startsWith('/')) {
      return `${apiUrl}${filePath.substring(1)}`;
    }
    return `${apiUrl}${filePath}`;
  }
  
  // If filePath is undefined or null, return an empty string
  return '';
};

const MilestoneSubmission = ({ milestone, onSubmissionComplete, onClose }) => {
  const [description, setDescription] = useState(milestone.submission?.description || '');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Function to get appropriate icon for file type
  const getFileIcon = (mimetype) => {
    if (mimetype?.includes('image')) {
      return <Image size={18} />;
    } else {
      return <FileText size={18} />;
    }
  };

  // Function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Starting milestone submission...', {
        milestoneId: milestone._id,
        description,
        filesCount: files.length
      });

      const formData = new FormData();
      formData.append('description', description.trim());
      
      if (files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }

      // Log the FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log('FormData field:', key, typeof value === 'object' ? value.name : value);
      }
      
      // Make the API request with explicit timeout and retries
      let attempts = 0;
      const maxAttempts = 2;
      let response;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts} to submit milestone work`);
          
          response = await api.post(
            `/milestones/${milestone._id}/submit`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
              timeout: 30000 // 30 second timeout
            }
          );
          
          // If successful, break the loop
          break;
        } catch (retryError) {
          console.error(`Attempt ${attempts} failed:`, retryError.message);
          
          // If we've reached max attempts, throw the error to be caught by outer catch block
          if (attempts >= maxAttempts) {
            throw retryError;
          }
          
          // Wait 1 second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('Submission response:', response.data);
      setSuccess(true);
      toast.success('Work submitted successfully');

      // Update parent component
      if (onSubmissionComplete) {
        console.log('Calling onSubmissionComplete with:', response.data);
        onSubmissionComplete(response.data);
      }

      // Close modal after a delay
      setTimeout(() => {
        console.log('Closing submission modal...');
        if (onClose) {
          onClose();
        }
      }, 1500);
    } catch (err) {
      console.error('Error submitting milestone:', {
        error: err,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Detailed error handling
      let errorMessage = 'Error submitting work. Please try again.';
      
      if (err.response?.data?.message) {
        // Server error message
        errorMessage = err.response.data.message;
      } else if (err.message && err.message.includes('timeout')) {
        // Timeout errors
        errorMessage = 'The request timed out. Your files may be too large or the connection is slow.';
      } else if (err.message && err.message.includes('Network Error')) {
        // Network errors
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        // Other error with message
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (err.response?.status === 401) {
        console.log('Unauthorized error - redirecting to login...');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log('Selected files:', selectedFiles.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    })));
    
    // Check number of files
    if (selectedFiles.length > 5) {
      setError('You can only upload up to 5 files');
      return;
    }

    // Validate file sizes and types
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedMimes = [
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 
      'application/zip', 
      'application/x-rar-compressed',
      'application/vnd.rar',
      'image/jpeg', 
      'image/png'
    ];
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png'];
    
    // Check for issues
    const oversizedFiles = [];
    const invalidTypeFiles = [];
    
    selectedFiles.forEach(file => {
      // Check size
      if (file.size > maxSize) {
        oversizedFiles.push(file.name);
      }
      
      // Check type (using both MIME type and extension)
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedMimes.includes(file.type) && !allowedExts.includes(ext)) {
        invalidTypeFiles.push(`${file.name} (${file.type || 'unknown type'})`);
      }
    });
    
    // Show appropriate error messages
    if (oversizedFiles.length > 0) {
      setError(`These files exceed the 10MB limit: ${oversizedFiles.join(', ')}`);
      return;
    }
    
    if (invalidTypeFiles.length > 0) {
      setError(`Unsupported file types: ${invalidTypeFiles.join(', ')}. 
        Allowed types: PDF, DOC, DOCX, TXT, ZIP, RAR, JPG, JPEG, PNG.`);
      return;
    }

    // All files are valid
    setFiles(selectedFiles);
    setError(null);
  };

  return (
    <div className="p-4 border rounded">
      <h5 className="mb-3">
        {milestone.submission ? 'Edit Submission' : 'Submit Work'}
      </h5>

      {error && (
        <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-3">
          Work submitted successfully!
        </Alert>
      )}

      {/* Show existing files if there's a submission */}
      {milestone.submission?.files && milestone.submission.files.length > 0 && (
        <div className="mb-3">
          <h6 className="mb-2">Previously Uploaded Files:</h6>
          <ListGroup variant="flush" className="border rounded mb-3">
            {milestone.submission.files.map((file, index) => (
              <ListGroup.Item key={index} className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  {getFileIcon(file.mimetype)}
                  <span className="ms-2">{file.originalname}</span>
                  <small className="text-muted ms-2">({formatFileSize(file.size)})</small>
                </div>
                <a 
                  href={getFileUrl(file.path)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-sm btn-outline-primary"
                  download={file.originalname}
                >
                  <Download size={16} />
                </a>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Description of Work Completed</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work you've completed..."
            required
            disabled={loading || success}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Attachments (Optional)</Form.Label>
          <Form.Control
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
            disabled={loading || success}
          />
          <Form.Text className="text-muted">
            You can upload up to 5 files (10MB each)
          </Form.Text>
        </Form.Group>

        <div className="d-flex justify-content-between align-items-center">
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading || success || !description.trim()}
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
            ) : milestone.submission ? 'Update Submission' : 'Submit Work'}
          </Button>

          {milestone.submission && (
            <span className="text-muted">
              Last submitted: {new Date(milestone.submission.submittedAt).toLocaleString()}
            </span>
          )}
        </div>
      </Form>
    </div>
  );
};

export default MilestoneSubmission; 