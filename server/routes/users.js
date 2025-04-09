import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Payment from '../models/Payment.js';
import Milestone from '../models/Milestone.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Get current user data
router.get('/me', auth, async (req, res) => {
  try {
    // Make sure we have a valid user ID
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Invalid user authentication' });
    }

    // Get user data without password
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('GET /users/me - Retrieved user data:', {
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.json(user);
  } catch (error) {
    console.error('GET /users/me - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[Dashboard Stats] Processing for user ID: ${userId}`); // Log User ID
    const isFreelancer = req.user.role === 'freelancer';
    console.log(`[Dashboard Stats] User role: ${isFreelancer ? 'freelancer' : 'employer'}`);

    // Initialize default stats
    let stats = {
      earnings: 0,
      completedCount: 0,
      inProgressCount: 0,
      profileViews: 0,
      successRate: 0,
      invitationsCount: 0,
      totalSpent: 0,
      activeCount: 0,
      pendingCount: 0,
      hireRate: 0,
      totalHires: 0
    };

    if (isFreelancer) {
      // Get freelancer stats
      console.log('[Dashboard Stats] Calculating freelancer stats...'); // Added log

      // --- Get Jobs via Accepted Applications (like /jobs/my-projects) ---
      console.log('[Dashboard Stats] Finding accepted applications for freelancer...');
      const acceptedApplications = await Application.find({
        freelancer: userId,
        status: 'accepted'
      }).populate('job'); // Populate job data to get job IDs and statuses

      const assignedJobIds = acceptedApplications
        .map(app => app.job?._id) // Get job IDs from populated applications
        .filter(id => id); // Filter out any null/undefined IDs
        
      const assignedJobsData = acceptedApplications
        .map(app => app.job) // Get job objects from populated applications
        .filter(job => job); // Filter out any null/undefined jobs
        
      console.log(`[Dashboard Stats] Found ${acceptedApplications.length} accepted applications corresponding to ${assignedJobIds.length} unique jobs.`);

      // --- Calculate Job Counts & Earnings via Milestones using job IDs from accepted apps ---
      console.log('[Dashboard Stats] Fetching released milestones for these jobs...');
      
      let totalEarningsFromMilestones = 0;
      if (assignedJobIds.length > 0) {
        const releasedMilestones = await Milestone.find({
          job: { $in: assignedJobIds },
          escrowStatus: 'released' // Check milestone escrow status
        });

        totalEarningsFromMilestones = releasedMilestones.reduce((total, milestone) => {
          return total + (milestone.amount || 0);
        }, 0);
        console.log(`[Dashboard Stats] Found ${releasedMilestones.length} released milestones. Total amount: ${totalEarningsFromMilestones}`);
      }

      const earnings = totalEarningsFromMilestones;
      console.log(`[Dashboard Stats] Calculated earnings from released milestones: ${earnings}`);

      // Calculate counts based on the JOB statuses derived from accepted applications
      const completedCount = assignedJobsData.filter(job => job.status === 'completed').length;
      const inProgressCount = assignedJobsData.filter(job => job.status === 'in-progress').length;
      console.log(`[Dashboard Stats] Completed jobs: ${completedCount}, In-progress jobs: ${inProgressCount}`); // Added log

      // --- Calculate Application Success Rate (using original full application list) ---
      console.log('[Dashboard Stats] Calculating application success rate...'); // Added log
      const applications = await Application.find({ freelancer: userId });
      const completedApplications = applications.filter(app => app.status === 'completed'); // Note: Using 'completed' application status for rate
      const successRate = applications.length > 0 
        ? (completedApplications.length / applications.length) * 100 
        : 0;
      console.log(`[Dashboard Stats] Success rate: ${successRate}%`); // Added log

      stats = {
        ...stats,
        earnings,
        completedCount, // Use job-based count
        inProgressCount, // Use job-based count
        profileViews: req.user.profileViews || 0,
        successRate: Math.round(successRate), // Keep application-based rate
        invitationsCount: req.user.jobInvitations?.length || 0
      };
    } else {
      // Get employer stats
      console.log('[Dashboard Stats] Calculating employer stats...');
      const jobs = await Job.find({ employer: userId });
      const completedJobs = jobs.filter(job => job.status === 'completed');
      const activeJobs = jobs.filter(job => job.status === 'open' || job.status === 'in-progress');
      const pendingApplications = await Application.countDocuments({
        job: { $in: jobs.map(job => job._id) },
        status: 'pending'
      });

      // Calculate total spent by summing released payments for this employer
      console.log('[Dashboard Stats] Finding released payments...');
      const releasedPayments = await Payment.find({
        employer: userId,
        status: 'released',
        type: 'job_payment' // Ensure we only count job payments
      });
      console.log(`[Dashboard Stats] Found ${releasedPayments?.length || 0} released payments.`); // Log payment find result

      const totalSpent = releasedPayments.reduce((total, payment) => {
        return total + (payment.amount || 0);
      }, 0);
      console.log(`[Dashboard Stats] Calculated totalSpent: ${totalSpent}`); // Log calculated totalSpent

      // Calculate hire rate
      const hireRate = jobs.length > 0 
        ? (completedJobs.length / jobs.length) * 100 
        : 0;

      stats = {
        ...stats,
        totalSpent,
        activeCount: activeJobs.length,
        pendingCount: pendingApplications,
        profileViews: req.user.profileViews || 0,
        hireRate: Math.round(hireRate),
        totalHires: completedJobs.length
      };
    }

    // Get recent activity
    console.log('[Dashboard Stats] Fetching recent activity...');
    const activity = [];
    
    if (isFreelancer) {
      // Get recent job applications
      const recentApplications = await Application.find({ freelancer: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('job', 'title');

      activity.push(...recentApplications.map(app => ({
        type: 'application',
        title: `Applied for ${app.job?.title || 'Unknown Job'}`,
        description: app.coverLetter?.substring(0, 100) + '...' || 'No cover letter provided',
        date: app.createdAt
      })));
    } else {
      // Get recent job postings and applications received
      const recentJobs = await Job.find({ employer: userId })
        .sort({ createdAt: -1 })
        .limit(3);

      const jobIds = recentJobs.map(job => job._id);
      const recentApplications = await Application.find({ job: { $in: jobIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('freelancer', 'firstName lastName')
        .populate('job', 'title');

      activity.push(
        ...recentJobs.map(job => ({
          type: 'job_posted',
          title: `Posted new job: ${job.title}`,
          description: job.description?.substring(0, 100) + '...' || 'No description provided',
          date: job.createdAt
        })),
        ...recentApplications.map(app => ({
          type: 'application_received',
          title: `${app.freelancer?.firstName || 'Unknown'} ${app.freelancer?.lastName || ''} applied for ${app.job?.title || 'Unknown Job'}`,
          description: app.coverLetter?.substring(0, 100) + '...' || 'No cover letter provided',
          date: app.createdAt
        }))
      );
    }

    // Sort by date and return most recent 5
    const recentActivity = activity.sort((a, b) => b.date - a.date).slice(0, 5);

    console.log('[Dashboard Stats] Final Stats Object:', stats); // Log final stats object
    res.json({
      stats,
      recentActivity
    });
  } catch (error) {
    // Ensure the error is logged comprehensively
    console.error('Error getting dashboard stats:', error); 
    console.error('Error Stack:', error.stack); // Log stack trace
    res.status(500).json({ message: 'Error getting dashboard statistics' });
  }
});

// Rest of your routes...

export default router; 