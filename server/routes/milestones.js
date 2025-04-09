import express from 'express';
import Milestone from '../models/Milestone.js';
import Job from '../models/Job.js';
import { auth, checkRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import Application from '../models/Application.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Payment from '../models/Payment.js';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define upload directory path - make sure it exactly matches the structure in index.js
const uploadDir = path.join(__dirname, '..', 'uploads', 'milestone-submissions');

// Log the directory path to help with debugging
console.log('Milestone submissions upload directory:', uploadDir);

// Ensure upload directory exists
try {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Milestone submissions directory created/verified successfully');
} catch (error) {
  console.error('Error creating milestone submissions directory:', {
    error: error.message,
    code: error.code,
    path: uploadDir
  });
}

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Custom error handler for multer
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    console.error('Multer error:', err);
    
    let errorMessage = 'File upload error';
    // Specific error messages based on multer error code
    switch(err.code) {
      case 'LIMIT_FILE_SIZE':
        errorMessage = 'File is too large. Maximum size is 10MB';
        break;
      case 'LIMIT_FILE_COUNT':
        errorMessage = 'Too many files. Maximum is 5 files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        errorMessage = 'Unexpected field name in upload';
        break;
      default:
        errorMessage = `File upload error: ${err.message}`;
    }
    
    return res.status(400).json({ 
      message: errorMessage,
      code: err.code
    });
  } else if (err) {
    // An unknown error occurred - log detailed information
    console.error('Unknown upload error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      syscall: err.syscall,
      path: err.path,
      stack: err.stack
    });
    
    // Check if it's a file system error
    if (err.code === 'ENOENT') {
      return res.status(500).json({ 
        message: 'Server storage error: Directory not found. Please contact support.'
      });
    } else if (err.code === 'EACCES') {
      return res.status(500).json({ 
        message: 'Server storage error: Permission denied. Please contact support.'
      });
    }
    
    return res.status(500).json({ 
      message: `File upload error: ${err.message}`
    });
  }
  next();
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    // Also check file extension as a fallback
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      console.log('File accepted:', { name: file.originalname, mimetype: file.mimetype, extension: ext });
      cb(null, true);
    } else {
      console.log('File rejected:', { name: file.originalname, mimetype: file.mimetype, extension: ext });
      cb(new Error(`Invalid file type. Allowed types: ${allowedExts.join(', ')}`));
    }
  }
});

// Get milestones for a job
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const milestones = await Milestone.find({ job: req.params.jobId })
      .sort({ dueDate: 1 });
    res.json(milestones);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create milestone
router.post('/', auth, checkRole(['employer']), async (req, res) => {
  try {
    const job = await Job.findById(req.body.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!job.employer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // This route is now only used for milestones without escrow payments
    // Milestones with payments are created through the /payments/fund-escrow endpoint
    const milestone = new Milestone({
      ...req.body,
      status: 'pending',
      escrowStatus: 'unfunded' // Explicitly mark as unfunded
    });

    await milestone.save();
    res.status(201).json(milestone);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update milestone status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    // First, find the milestone and populate job with employer info
    const milestone = await Milestone.findById(req.params.id)
      .populate({
        path: 'job',
        select: 'employer status progress',
        populate: {
          path: 'employer',
          select: 'firstName lastName'
        }
      });

    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Find the accepted application for this job to get freelancer info
    const acceptedApplication = await Application.findOne({
      job: milestone.job._id,
      status: 'accepted'
    }).populate('freelancer', 'firstName lastName');

    if (!acceptedApplication) {
      return res.status(404).json({ message: 'No accepted application found for this job' });
    }

    // Check authorization
    const isEmployer = milestone.job.employer._id.equals(req.user.id);
    const isFreelancer = acceptedApplication.freelancer._id.equals(req.user.id);

    if (!isEmployer && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate status transition
    const validTransitions = {
      employer: {
        'in-progress': ['completed']
      },
      freelancer: {
        'pending': ['in-progress']
      }
    };

    const userRole = isEmployer ? 'employer' : 'freelancer';
    const allowedTransitions = validTransitions[userRole][milestone.status] || [];

    if (!allowedTransitions.includes(req.body.status)) {
      return res.status(400).json({ 
        message: `${userRole} cannot change milestone status from ${milestone.status} to ${req.body.status}` 
      });
    }

    // Update milestone status
    milestone.status = req.body.status;
    if (req.body.status === 'completed') {
      milestone.completedAt = Date.now();
    }

    await milestone.save();

    // Calculate and update job progress
    const allMilestones = await Milestone.find({ job: milestone.job._id });
    const totalMilestones = allMilestones.length;
    const completedMilestones = allMilestones.filter(m => m.status === 'completed').length;
    const progress = Math.round((completedMilestones / totalMilestones) * 100);

    // Update job progress only
    await Job.findByIdAndUpdate(milestone.job._id, {
      progress
    });

    // Prepare the response
    const response = milestone.toObject();
    response.job.freelancer = {
      _id: acceptedApplication.freelancer._id,
      firstName: acceptedApplication.freelancer.firstName,
      lastName: acceptedApplication.freelancer.lastName
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating milestone status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete milestone
router.delete('/:id', auth, checkRole(['employer']), async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('job');

    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    if (!milestone.job.employer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await milestone.deleteOne();
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit work for milestone
router.post('/:id/submit', auth, (req, res, next) => {
  // Log request information
  console.log('File upload request received:', {
    milestoneId: req.params.id,
    userId: req.user?._id,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });
  
  // Wrap multer in a try-catch to handle any potential errors
  try {
    upload.array('files')(req, res, (err) => {
      if (err) {
        // Handle multer errors
        console.error('Multer error occurred:', {
          error: err.message,
          code: err.code,
          field: err.field,
          stack: err.stack
        });
        return uploadErrorHandler(err, req, res, next);
      }
      // Continue with normal request handling
      next();
    });
  } catch (error) {
    console.error('Unexpected error in upload middleware:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      type: error.constructor.name
    });
    return res.status(500).json({ 
      message: 'Error processing file upload',
      error: error.message
    });
  }
}, async (req, res) => {
  console.log('Milestone submission request received:', {
    milestoneId: req.params.id,
    userId: req.user?._id,
    files: req.files?.length || 0,
    body: req.body
  });

  try {
    // Validate required fields
    if (!req.body.description?.trim()) {
      console.log('Missing description in submission');
      return res.status(400).json({ message: 'Description is required' });
    }

    // Find milestone and populate necessary fields
    const milestone = await Milestone.findById(req.params.id)
      .populate({
        path: 'job',
        populate: {
          path: 'employer',
          select: 'firstName lastName'
        }
      });

    if (!milestone) {
      console.log('Milestone not found:', req.params.id);
      return res.status(404).json({ message: 'Milestone not found' });
    }

    console.log('Found milestone:', {
      id: milestone._id,
      jobId: milestone.job?._id,
      status: milestone.status
    });

    // Check if job exists and is populated correctly
    if (!milestone.job || !milestone.job._id) {
      console.error('Job reference missing or invalid in milestone:', {
        milestoneId: milestone._id,
        job: milestone.job
      });
      return res.status(500).json({ message: 'Invalid job reference in milestone' });
    }

    // Find the accepted application to get freelancer info
    let acceptedApplication;
    try {
      acceptedApplication = await Application.findOne({
        job: milestone.job._id,
        status: 'accepted'
      }).populate('freelancer', 'firstName lastName');
    } catch (error) {
      console.error('Error finding accepted application:', {
        error: error.message,
        jobId: milestone.job._id
      });
      return res.status(500).json({ message: 'Error finding job application' });
    }

    if (!acceptedApplication) {
      console.log('No accepted application found for job:', milestone.job._id);
      return res.status(404).json({ message: 'No accepted application found for this job' });
    }

    // Check if application has valid freelancer
    if (!acceptedApplication.freelancer || !acceptedApplication.freelancer._id) {
      console.error('Freelancer reference missing in application:', {
        applicationId: acceptedApplication._id,
        freelancer: acceptedApplication.freelancer
      });
      return res.status(500).json({ message: 'Invalid freelancer reference in application' });
    }

    // Verify the freelancer is authorized
    if (!acceptedApplication.freelancer._id.equals(req.user._id)) {
      console.log('Unauthorized submission attempt:', {
        submitterId: req.user._id,
        freelancerId: acceptedApplication.freelancer._id
      });
      return res.status(403).json({ message: 'Not authorized to submit for this milestone' });
    }

    // Process file uploads (with extra validation)
    let fileUploads = [];
    if (req.files && Array.isArray(req.files)) {
      fileUploads = req.files.map(file => {
        // Convert file path to URL format for frontend access
        // Generate absolute URL path that will work with our static file serving setup
        const relativePath = path.relative(path.join(__dirname, '..'), file.path);
        // Use the correct path format that matches our static serving configuration in index.js
        const urlPath = `/api/uploads/${relativePath.replace(/\\/g, '/')}`;
        
        return {
          filename: file.filename,
          originalname: file.originalname,
          path: urlPath, // Store URL path for frontend access
          mimetype: file.mimetype,
          size: file.size
        };
      });
    }

    console.log('Processing file uploads:', {
      count: fileUploads.length,
      files: fileUploads.map(f => ({ name: f.originalname, size: f.size, path: f.path }))
    });

    // Create or update submission
    const submissionData = {
      description: req.body.description.trim(),
      files: fileUploads,
      submittedAt: new Date(),
      freelancer: {
        _id: acceptedApplication.freelancer._id,
        firstName: acceptedApplication.freelancer.firstName,
        lastName: acceptedApplication.freelancer.lastName
      }
    };

    if (milestone.submission) {
      // Merge with existing submission
      milestone.submission = {
        ...milestone.submission.toObject(),
        ...submissionData,
        files: [...(milestone.submission.files || []), ...fileUploads],
        updatedAt: new Date()
      };
      console.log('Updating existing submission');
    } else {
      milestone.submission = submissionData;
      console.log('Creating new submission');
    }

    milestone.status = 'in-progress';
    
    // Save with better error handling
    try {
      await milestone.save();
      
      console.log('Milestone submission saved successfully:', {
        id: milestone._id,
        filesCount: milestone.submission.files.length,
        status: milestone.status
      });
    } catch (saveError) {
      console.error('Error saving milestone submission:', {
        error: saveError.message,
        stack: saveError.stack,
        milestone: milestone._id
      });
      return res.status(500).json({ 
        message: 'Error saving submission data',
        error: saveError.message
      });
    }

    // Prepare the response
    const response = {
      message: 'Milestone submission successful',
      milestone: {
        _id: milestone._id,
        title: milestone.title,
        status: milestone.status,
        submission: milestone.submission,
        job: {
          _id: milestone.job._id,
          employer: {
            _id: milestone.job.employer._id,
            firstName: milestone.job.employer.firstName,
            lastName: milestone.job.employer.lastName
          }
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing milestone submission:', {
      error: error.message,
      stack: error.stack,
      milestoneId: req.params.id,
      userId: req.user?._id || 'unknown'
    });
    res.status(500).json({ 
      message: 'Error processing milestone submission',
      error: error.message
    });
  }
});

// Review milestone submission
router.post('/:id/review', auth, async (req, res) => {
  try {
    // Find milestone and populate necessary fields
    const milestone = await Milestone.findById(req.params.id)
      .populate({
        path: 'job',
        select: 'employer status progress',
        populate: {
          path: 'employer',
          select: 'firstName lastName'
        }
      });

    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Check if the user is the employer
    if (!milestone.job.employer._id.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to review this milestone' });
    }

    // Validate the milestone has a submission
    if (!milestone.submission) {
      return res.status(400).json({ message: 'No submission found for this milestone' });
    }

    // Validate status
    const { status, comment } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid review status' });
    }

    // For rejection, comment is required
    if (status === 'rejected' && !comment?.trim()) {
      return res.status(400).json({ message: 'Feedback is required when rejecting submission' });
    }

    // Update milestone submission with review data
    milestone.submission.reviewStatus = status;
    milestone.submission.reviewComment = comment || '';
    milestone.submission.reviewedAt = new Date();
    milestone.submission.reviewedBy = req.user.id;

    // If approved, mark the milestone as completed
    if (status === 'approved') {
      milestone.status = 'completed';
      milestone.completedAt = new Date();
    }

    await milestone.save();

    // If approved, release escrow payment if it exists
    if (status === 'approved' && milestone.payment) {
      try {
        // Find and update the payment
        const payment = await Payment.findById(milestone.payment);
        if (payment && payment.status === 'held') {
          payment.status = 'released';
          payment.releasedAt = new Date();
          await payment.save();
          
          // Update milestone escrow status
          milestone.escrowStatus = 'released';
          await milestone.save();
        }
      } catch (paymentError) {
        console.error('Error releasing payment:', paymentError);
        // Don't fail the whole request if payment release fails
      }
    }

    // Calculate and update job progress
    const allMilestones = await Milestone.find({ job: milestone.job._id });
    const totalMilestones = allMilestones.length;
    const completedMilestones = allMilestones.filter(m => m.status === 'completed').length;
    const progress = Math.round((completedMilestones / totalMilestones) * 100);

    // Update job progress only
    await Job.findByIdAndUpdate(milestone.job._id, {
      progress
    });

    // Return response
    res.json({
      message: `Milestone ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      milestone: {
        _id: milestone._id,
        title: milestone.title,
        status: milestone.status,
        submission: milestone.submission
      }
    });
  } catch (error) {
    console.error('Error reviewing milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;