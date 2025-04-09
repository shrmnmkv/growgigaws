import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import { auth, checkRole } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get jobs for freelancer (MUST be before the general routes)
router.get('/my-projects', auth, checkRole(['freelancer']), async (req, res) => {
  try {
    console.log('\n=== Getting Freelancer Projects ===');
    console.log('User:', {
      id: req.user._id,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    });

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('Invalid user ID format:', req.user._id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    console.log('Finding applications for freelancer:', req.user._id);

    try {
      // Find all accepted applications for this freelancer with populated job details
      const acceptedApplications = await Application.find({
        freelancer: req.user._id,
        status: 'accepted'
      })
      .populate({
        path: 'job',
        populate: [
          {
            path: 'employer',
            select: 'firstName lastName'
          }
        ]
      })
      .lean();

      console.log('Raw accepted applications:', JSON.stringify(acceptedApplications, null, 2));

      if (!acceptedApplications || acceptedApplications.length === 0) {
        console.log('No accepted applications found');
        return res.json([]);
      }

      // Map the applications to include job details and application status
      const projects = acceptedApplications
        .filter(app => {
          if (!app.job) {
            console.log('Found application without job:', app._id);
            return false;
          }
          return true;
        })
        .map(app => {
          console.log('Processing application:', {
            applicationId: app._id,
            jobId: app.job._id,
            status: app.status,
            jobTitle: app.job.title,
            employer: app.job.employer
          });
          
          // Get the correct status for display
          const displayStatus = ['completed', 'closed', 'cancelled'].includes(app.job.status) 
            ? app.job.status  // Keep completed/closed/cancelled status
            : 'in-progress';  // Force others to in-progress
            
          console.log(`Job status transformation: ${app.job.status} → ${displayStatus} for job ${app.job._id}`);
            
          return {
            ...app.job,
            status: displayStatus,
            applicationStatus: app.status,
            expectedRate: app.expectedRate
          };
        });

      console.log('Final projects to send:', JSON.stringify(projects, null, 2));
      return res.json(projects);

    } catch (dbError) {
      console.error('Database operation error:', {
        name: dbError.name,
        message: dbError.message,
        stack: dbError.stack
      });
      throw dbError;
    }

  } catch (error) {
    console.error('\n=== Error in /my-projects ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      message: 'Error getting projects',
      error: {
        type: error.name,
        message: error.message,
        details: error.stack
      }
    });
  }
});

// Get jobs for employer (MUST be before the general routes)
router.get('/my-jobs', auth, checkRole(['employer']), async (req, res) => {
  try {
    console.log('\n=== Getting Employer Jobs ===');
    console.log('User:', {
      id: req.user._id,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    });

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      console.error('Invalid user ID format:', req.user._id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Find all jobs for this employer with proper population
    const jobs = await Job.find({ 
      employer: new mongoose.Types.ObjectId(req.user._id)
    })
    .populate({
      path: 'employer',
      select: 'firstName lastName'
    })
    .populate({
      path: 'applications',
      select: 'status freelancer',
      populate: {
        path: 'freelancer',
        select: 'firstName lastName'
      }
    })
    .sort({ createdAt: -1 });

    console.log('Found jobs:', jobs.length);
    
    // Transform the data to include application counts
    const transformedJobs = jobs.map(job => {
      const jobObject = job.toObject();
      return {
        ...jobObject,
        applicationCount: jobObject.applications?.length || 0,
        hasAcceptedApplication: jobObject.applications?.some(app => app.status === 'accepted') || false,
        employer: {
          _id: jobObject.employer._id,
          firstName: jobObject.employer.firstName,
          lastName: jobObject.employer.lastName
        }
      };
    });

    console.log('Transformed jobs:', JSON.stringify(transformedJobs, null, 2));
    res.json(transformedJobs);
  } catch (error) {
    console.error('\n=== Error in /my-jobs ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      message: 'Error getting jobs',
      error: {
        type: error.name,
        message: error.message,
        details: error.stack
      }
    });
  }
});

// Get applications for a job
router.get('/:id/applications', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'firstName lastName');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user is authorized to view applications
    const isEmployer = job.employer._id.equals(req.user._id);
    const isFreelancer = req.user.role === 'freelancer';
    
    if (!isEmployer && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to view applications' });
    }

    // If freelancer, only show their own application
    if (isFreelancer) {
      const application = await Application.findOne({
        job: req.params.id,
        freelancer: req.user._id
      }).populate('freelancer', 'firstName lastName email');
      
      if (!application) {
        return res.json([]);
      }
      
      return res.json([application]);
    }

    // If employer, show all applications
    const applications = await Application.find({ job: req.params.id })
      .populate('freelancer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Error getting applications:', error);
    res.status(500).json({ message: 'Error getting applications' });
  }
});

// Update application status
router.put('/:id/applications/:applicationId/status', auth, checkRole(['employer']), async (req, res) => {
  try {
    const { id: jobId, applicationId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check if job exists and user is authorized
    const job = await Job.findOne({
      _id: jobId,
      employer: req.user._id
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    // Update application status
    const application = await Application.findOneAndUpdate(
      {
        _id: applicationId,
        job: jobId
      },
      { status },
      { new: true }
    ).populate('freelancer', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // If application is accepted, update job status to in-progress
    if (status === 'accepted') {
      job.status = 'in-progress';
      await job.save();
    }

    res.json(application);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Error updating application status' });
  }
});

// Apply for a job
router.post('/:id/apply', auth, checkRole(['freelancer']), async (req, res) => {
  try {
    const jobId = req.params.id;
    const freelancerId = req.user._id;

    console.log('\n=== Job Application Request ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Request params:', req.params);
    console.log('Job ID:', jobId);
    console.log('Job ID length:', jobId.length);
    console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(jobId));
    console.log('Freelancer ID:', freelancerId);
    console.log('User:', {
      id: req.user._id,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    });
    console.log('Request body:', req.body);
    console.log('Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('=== End Request Info ===\n');

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      console.log('Invalid job ID format:', jobId);
      return res.status(400).json({ message: 'Invalid job ID format' });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    console.log('\n=== Job Query Result ===');
    if (job) {
      console.log('Found job:', {
        id: job._id,
        title: job.title,
        status: job.status,
        employer: job.employer,
        applications: job.applications?.length
      });
    } else {
      console.log('Job not found with ID:', jobId);
      console.log('Attempting raw query to check if job exists...');
      const rawJob = await mongoose.connection.db.collection('jobs').findOne({ _id: new mongoose.Types.ObjectId(jobId) });
      console.log('Raw job query result:', rawJob);
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if job is still open
    if (job.status !== 'open') {
      console.log('Job is not open:', job.status);
      return res.status(400).json({ message: 'This job is no longer accepting applications' });
    }

    // Validate required fields
    if (!req.body.coverLetter?.trim()) {
      return res.status(400).json({ message: 'Cover letter is required' });
    }

    if (!req.body.expectedRate?.amount || !req.body.expectedRate?.currency) {
      return res.status(400).json({ message: 'Expected rate amount and currency are required' });
    }

    // Check if user has already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      freelancer: freelancerId
    });

    if (existingApplication) {
      console.log('User has already applied:', {
        jobId,
        freelancerId,
        applicationId: existingApplication._id
      });
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    // Create new application
    const application = new Application({
      job: jobId,
      freelancer: freelancerId,
      coverLetter: req.body.coverLetter.trim(),
      expectedRate: {
        amount: req.body.expectedRate.amount,
        currency: req.body.expectedRate.currency
      }
    });

    console.log('Creating application:', application);

    await application.save();
    console.log('Application saved successfully');

    // Add application to job's applications array
    await Job.findByIdAndUpdate(jobId, {
      $push: { applications: application._id }
    });
    console.log('Added application to job');

    // Populate application with job and freelancer details
    await application.populate([
      { path: 'job', select: 'title' },
      { path: 'freelancer', select: 'firstName lastName' }
    ]);

    console.log('Sending response with application:', application);
    res.status(201).json(application);
  } catch (error) {
    console.error('\n=== Application Error ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== End Error ===\n');

    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get job by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employer', 'firstName lastName')
      .populate('applications');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user is authorized to view this job
    const isEmployer = job.employer._id.equals(req.user._id);
    const isFreelancer = req.user.role === 'freelancer';
    
    if (!isEmployer && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to view this job' });
    }

    // Convert to plain object to add custom fields
    const jobObject = job.toObject();
    
    // Check if the current freelancer has applied
    if (isFreelancer) {
      // Find application from this freelancer
      const Application = mongoose.model('Application');
      const existingApplication = await Application.findOne({
        job: job._id,
        freelancer: req.user._id
      });
      
      // Set hasApplied flag
      jobObject.hasApplied = !!existingApplication;
      
      // Check if the application has been accepted
      if (existingApplication) {
        jobObject.applicationStatus = existingApplication.status;
        jobObject.isAccepted = existingApplication.status === 'accepted';
      }
    }

    res.json(jobObject);
  } catch (error) {
    console.error('Error getting job details:', {
      error: error.message,
      stack: error.stack,
      jobId: req.params.id,
      userId: req.user?._id
    });
    res.status(500).json({ message: 'Error getting job' });
  }
});

// Get all jobs (should be after specific routes)
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('employer', 'firstName lastName')
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(jobs);
  } catch (error) {
    console.error('GET /jobs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new job
router.post('/', auth, checkRole(['employer']), async (req, res) => {
  try {
    console.log('Creating job for employer:', req.user._id);
    console.log('Job data:', req.body);

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'type', 'location'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        fields: missingFields 
      });
    }

    // Validate realistic data
    if (req.body.description.length < 100) {
      return res.status(400).json({ 
        message: 'Job description must be at least 100 characters long for better clarity'
      });
    }

    if (req.body.title.length < 5) {
      return res.status(400).json({
        message: 'Job title must be at least 5 characters long'
      });
    }

    // Validate salary range
    if (!req.body.salary || !req.body.salary.min || !req.body.salary.max || !req.body.salary.currency) {
      return res.status(400).json({
        message: 'Salary range and currency are required'
      });
    }

    const { min, max, currency } = req.body.salary;
    
    // Convert to numbers
    const minSalary = Number(min);
    const maxSalary = Number(max);

    if (isNaN(minSalary) || isNaN(maxSalary)) {
      return res.status(400).json({
        message: 'Salary must be a valid number'
      });
    }

    if (minSalary <= 0 || maxSalary <= 0) {
      return res.status(400).json({
        message: 'Salary must be greater than 0'
      });
    }

    if (minSalary >= maxSalary) {
      return res.status(400).json({
        message: 'Maximum salary must be greater than minimum salary'
      });
    }

    // Validate currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({
        message: 'Invalid currency. Supported currencies: ' + validCurrencies.join(', ')
      });
    }

    // Validate skills
    if (!Array.isArray(req.body.skills) || req.body.skills.length === 0) {
      return res.status(400).json({
        message: 'At least one skill is required'
      });
    }

    if (req.body.skills.some(skill => typeof skill !== 'string' || skill.trim().length < 2)) {
      return res.status(400).json({
        message: 'Each skill must be at least 2 characters long'
      });
    }

    // Create job with validated data
    const job = new Job({
      ...req.body,
      employer: req.user._id,
      status: 'open',
      salary: {
        min: minSalary,
        max: maxSalary,
        currency
      }
    });

    await job.save();
    
    // Populate employer details before sending response
    await job.populate('employer', 'firstName lastName');
    
    console.log('Job created successfully:', job);
    res.status(201).json(job);
  } catch (error) {
    console.error('POST /jobs error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update job
router.put('/:id', auth, checkRole(['employer']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user is the employer of this job
    if (!job.employer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job' });
  }
});

// Delete job
router.delete('/:id', auth, checkRole(['employer']), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user is the employer of this job
    if (!job.employer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job' });
  }
});

// Migration route to fix jobs without status
router.post('/migrate/fix-status', auth, checkRole(['admin']), async (req, res) => {
  try {
    console.log('Starting job status migration');
    
    // Find all jobs without a status or with an invalid status
    const jobs = await Job.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: { $nin: ['open', 'in-progress', 'completed', 'cancelled'] } }
      ]
    });

    console.log(`Found ${jobs.length} jobs to update`);

    // Update each job
    const updates = await Promise.all(jobs.map(job => 
      Job.findByIdAndUpdate(
        job._id,
        { $set: { status: 'open' } },
        { new: true }
      )
    ));

    console.log('Migration completed successfully');
    res.json({
      message: 'Migration completed successfully',
      updatedCount: updates.length,
      jobs: updates.map(job => ({
        id: job._id,
        title: job.title,
        status: job.status
      }))
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration failed', error: error.message });
  }
});

// Migration route to fix completed jobs with reviews
router.post('/migrate/fix-completed-jobs', auth, checkRole(['admin', 'employer']), async (req, res) => {
  try {
    console.log('Starting job status migration for completed jobs with reviews');
    
    // Find all jobs that are "completed" status, have 100% progress, 
    // and have an employer review but aren't marked as "closed"
    const jobs = await Job.find({
      status: 'completed',
      progress: 100,
      'reviews.employer': { $exists: true, $ne: null }
    });

    console.log(`Found ${jobs.length} completed jobs with reviews to update to closed status`);

    if (jobs.length === 0) {
      return res.json({
        message: 'No jobs to update',
        updatedCount: 0
      });
    }

    // Update each job to closed status
    const updates = await Promise.all(jobs.map(job => 
      Job.findByIdAndUpdate(
        job._id,
        { $set: { status: 'closed' } },
        { new: true }
      )
    ));

    console.log('Migration completed successfully');
    res.json({
      message: 'Jobs updated to closed status successfully',
      updatedCount: updates.length,
      jobs: updates.map(job => ({
        id: job._id,
        title: job.title,
        oldStatus: 'completed',
        newStatus: job.status
      }))
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration failed', error: error.message });
  }
});

// Delete all jobs
router.delete('/cleanup', auth, async (req, res) => {
  try {
    console.log('Cleaning up all jobs...');
    
    // Delete all applications first
    const deleteApplicationsResult = await Application.deleteMany({});
    console.log('Deleted applications:', deleteApplicationsResult.deletedCount);

    // Then delete all jobs
    const deleteJobsResult = await Job.deleteMany({});
    console.log('Deleted jobs:', deleteJobsResult.deletedCount);

    res.json({
      message: 'All jobs and applications cleaned successfully',
      deletedCounts: {
        applications: deleteApplicationsResult.deletedCount,
        jobs: deleteJobsResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Error cleaning jobs', error: error.message });
  }
});

// Clean up dummy data
router.delete('/cleanup/dummy', auth, checkRole(['admin']), async (req, res) => {
  try {
    console.log('Cleaning up dummy data...');
    
    // Delete jobs with unrealistic descriptions or titles
    const deleteJobsResult = await Job.deleteMany({
      $or: [
        { description: { $regex: /^[a-z\s]{1,99}$/i } }, // Short or repetitive descriptions
        { description: { $regex: /^(.)\1+$/i } }, // Repeated characters
        { title: { $regex: /^.{1,4}$/i } }, // Very short titles
        { 'salary.min': { $lt: 100 } }, // Unrealistically low salaries
        { 'skills.0': { $regex: /^.{1}$/i } } // Single character skills
      ]
    });
    
    console.log('Deleted dummy jobs:', deleteJobsResult.deletedCount);

    // Delete associated applications
    const deleteApplicationsResult = await Application.deleteMany({
      $or: [
        { coverLetter: { $regex: /^.{1,20}$/i } }, // Very short cover letters
        { coverLetter: { $regex: /^(.)\1+$/i } }, // Repeated characters
        { 'expectedRate.amount': { $lt: 100 } } // Unrealistically low rates
      ]
    });

    console.log('Deleted dummy applications:', deleteApplicationsResult.deletedCount);

    res.json({
      message: 'Dummy data cleaned successfully',
      deletedCounts: {
        jobs: deleteJobsResult.deletedCount,
        applications: deleteApplicationsResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Error cleaning dummy data', error: error.message });
  }
});

// Complete a job with review
router.patch('/:id/complete', auth, checkRole(['employer']), async (req, res) => {
  try {
    // Find the job and check if user is authorized
    const job = await Job.findOne({
      _id: req.params.id,
      employer: req.user._id
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    // Check if job is in a valid state to be completed
    if (job.status !== 'in-progress' && job.status !== 'completed' && job.status !== 'closed') {
      return res.status(400).json({ 
        message: 'Only in-progress, completed, or closed jobs can be completed',
        currentStatus: job.status
      });
    }

    // Validate review ID
    if (!req.body.review) {
      return res.status(400).json({ message: 'Review ID is required' });
    }

    // Update job status to closed
    job.status = 'closed';
    job.completedAt = Date.now();
    job.review = req.body.review;

    await job.save();

    res.json({
      message: 'Job completed and closed successfully',
      job: {
        _id: job._id,
        title: job.title,
        status: job.status,
        completedAt: job.completedAt
      }
    });
  } catch (error) {
    console.error('Error completing job:', error);
    res.status(500).json({ message: 'Error completing job', error: error.message });
  }
});

// Fix status for a specific job
router.post('/:id/fix-status', auth, checkRole(['admin', 'employer']), async (req, res) => {
  try {
    console.log(`============ FIXING JOB STATUS ============`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`Request method: ${req.method}`);
    console.log(`User: ${req.user._id} (${req.user.role})`);
    console.log(`Fixing status for job ${req.params.id}`);
    
    // Validate job ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid job ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid job ID format' });
    }
    
    // Find the job
    const job = await Job.findOne({
      _id: req.params.id
    });

    if (!job) {
      console.log(`Job not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Job not found' });
    }

    console.log(`Found job: ${job._id}, status: ${job.status}, progress: ${job.progress}`);
    
    // Check if user is authorized (is an admin or the employer of this job)
    const isEmployer = job.employer.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    
    console.log(`Authorization check: isEmployer=${isEmployer}, isAdmin=${isAdmin}`);
    
    if (!isEmployer && !isAdmin) {
      console.log('User not authorized to update this job');
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    // Check if the job should be closed
    const shouldClose = 
      (job.status === 'completed' && job.progress === 100) || 
      (job.reviews && job.reviews.employer);
    
    console.log('Job details:', {
      id: job._id,
      status: job.status,
      progress: job.progress,
      hasEmployerReview: !!job.reviews?.employer,
      shouldClose
    });
    
    if (!shouldClose) {
      console.log('Job does not need status update');
      return res.json({
        message: 'Job does not need status update',
        job: {
          id: job._id,
          title: job.title,
          status: job.status,
          progress: job.progress,
          hasReview: !!job.reviews?.employer
        }
      });
    }

    // Update the job status to closed
    job.status = 'closed';
    await job.save();

    console.log(`Job ${job._id} status updated to closed`);
    console.log(`============ JOB STATUS FIXED ============`);
    
    res.json({
      message: 'Job status updated to closed',
      job: {
        id: job._id,
        title: job.title,
        oldStatus: 'completed',
        newStatus: job.status
      }
    });
  } catch (error) {
    console.error('Error fixing job status:', error);
    res.status(500).json({ message: 'Error fixing job status', error: error.message });
  }
});

export default router;