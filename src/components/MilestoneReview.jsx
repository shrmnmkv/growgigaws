import React, { useState } from 'react';
import { Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { S3Client } from "@aws-sdk/client-s3";

// Initialize S3 Client WITHOUT explicit credentials.
// The SDK automatically searches for credentials in a specific order:
// 1. Environment variables (AWS_ACCESS_KEY_ID, etc.) - Useful for local fallback/override
// 2. Shared credential file (~/.aws/credentials)
// 3. AWS config file (~/.aws/config)
// 4. EC2 instance profile or ECS task role credentials (if running on AWS with role attached)
const s3Client = new S3Client({
    region: process.env.AWS_REGION, // Still required
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME; // Still required

function MilestoneReview({ milestone, onReviewComplete }) {
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    comment: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReviewData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitReview = async (status) => {
    if (!reviewData.comment && status === 'rejected') {
      toast.error('Please provide feedback for rejection');
      return;
    }

    try {
      setLoading(true);
      
      console.log(`Submitting review for milestone: ${milestone._id}, status: ${status}`);
      const response = await api.post(`/milestones/${milestone._id}/review`, {
        status,
        comment: reviewData.comment || ''
      });

      console.log('Review submission successful:', response.data);
      toast.success(`Work ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      
      if (onReviewComplete) {
        onReviewComplete(response.data);
      }
    } catch (error) {
      console.error('Review submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath) => {
    if (filePath?.startsWith('http')) {
      return filePath;
    }
    const apiUrl = import.meta.env.VITE_API_URL || '';
    return `${apiUrl}${filePath}`;
  };

  return (
    <Card>
      <Card.Body>
        <h4 className="mb-4">Review Submission</h4>

        <div className="mb-4">
          <h5>Work Description</h5>
          <p className="text-muted">{milestone.submission.description}</p>
        </div>

        {milestone.submission.files?.length > 0 && (
          <div className="mb-4">
            <h5>Attachments</h5>
            <div className="list-group">
              {milestone.submission.files.map((file, index) => (
                <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{file.originalname}</span>
                  <a
                    href={getFileUrl(file.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                    download={file.originalname}
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <Form.Group className="mb-4">
          <Form.Label>Review Comments</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            name="comment"
            value={reviewData.comment}
            onChange={handleInputChange}
            placeholder="Provide feedback about the work..."
          />
        </Form.Group>

        <div className="d-flex gap-2">
          <Button
            variant="success"
            onClick={() => handleSubmitReview('approved')}
            disabled={loading}
          >
            {loading ? (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <>
                <CheckCircle size={16} className="me-2" />
                Approve & Release Payment
              </>
            )}
          </Button>
          <Button
            variant="danger"
            onClick={() => handleSubmitReview('rejected')}
            disabled={loading}
          >
            {loading ? (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
            ) : (
              <>
                <XCircle size={16} className="me-2" />
                Request Changes
              </>
            )}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default MilestoneReview;