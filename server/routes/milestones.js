import express from 'express';
import Milestone from '../models/Milestone.js';
import Job from '../models/Job.js';
import { auth, checkRole } from '../middleware/auth.js';
import path from 'path';
import Application from '../models/Application.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Payment from '../models/Payment.js';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

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

// POST route for submitting milestone work (S3 VERSION - KEEP THIS ONE)
// Uses upload middleware from index.js (passed via req.upload)
// Uses s3Client and bucketName from index.js (passed via req.s3Client, req.bucketName)
router.post('/:milestoneId/submit', auth, (req, res, next) => {
    // Use the multer instance attached to the request (from server/index.js)
    // Ensure req.upload is available from the middleware in index.js
    if (!req.upload) {
        console.error("Multer instance not found on request object in milestone submit route.");
        return res.status(500).json({ message: "Server configuration error: Uploader not initialized." });
    }
    req.upload.array('files', 5)(req, res, (err) => {
        // Handle Multer errors specifically from the memory storage instance
        if (err instanceof multer.MulterError) { 
            console.error("Multer memory storage error:", err);
            return res.status(400).json({ message: `File upload error: ${err.message}`, code: err.code });
        } else if (err) {
            // An unknown error occurred during memory storage processing.
            console.error("Unknown file memory processing error:", err);
            return res.status(500).json({ message: "Unknown error during file processing." });
        }
        // Everything went fine with multer, proceed to route handler logic
        next();
    });
}, async (req, res) => {
    const { milestoneId } = req.params;
    const { description } = req.body;
    const userId = req.user.userId; 
    const s3Client = req.s3Client; 
    const BUCKET_NAME = req.bucketName; 

    // Basic validation
    if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Description is required.' });
    }
    if (!s3Client || !BUCKET_NAME) {
        return res.status(500).json({ message: 'S3 configuration is missing on the server.' });
    }

    try {
        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }
        // Add any necessary authorization checks here

        const uploadedFilesInfo = []; 

        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} files for S3 upload...`);
            for (const file of req.files) {
                const fileKey = `milestones/${milestoneId}/${userId}/${uuidv4()}-${file.originalname}`;
                console.log(`Uploading ${file.originalname} to S3 with key: ${fileKey}`);

                const putObjectParams = {
                    Bucket: BUCKET_NAME,
                    Key: fileKey,
                    Body: file.buffer,        
                    ContentType: file.mimetype, 
                    // ACL: 'public-read' 
                };

                const command = new PutObjectCommand(putObjectParams);
                await s3Client.send(command); 

                const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
                console.log(`Successfully uploaded ${file.originalname} to ${fileUrl}`);

                uploadedFilesInfo.push({
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: fileUrl, 
                    key: fileKey   
                });
            }
        }

        milestone.submission = {
            description: description.trim(),
            files: uploadedFilesInfo, 
            submittedAt: new Date(),
            status: 'submitted'
        };
        milestone.status = 'submitted'; 

        const updatedMilestone = await milestone.save();

        console.log('Milestone submission updated successfully in DB with S3 file info.');
        res.status(200).json(updatedMilestone);

    } catch (error) {
        console.error("Error submitting milestone work / uploading to S3:", error);
        let errorMessage = "Server error during milestone submission.";
        if (error.name === 'MongoServerError') {
            errorMessage = "Database error during milestone submission.";
        } else if (error.message.includes('S3')) { 
             errorMessage = "S3 upload error during milestone submission.";
        }
        res.status(500).json({ message: errorMessage, error: error.message });
    }
});

export default router;