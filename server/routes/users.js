import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
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
    const isFreelancer = req.user.role === 'freelancer';

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
      const applications = await Application.find({ freelancer: userId });
      const completedJobs = applications.filter(app => app.status === 'completed');
      const inProgressJobs = applications.filter(app => app.status === 'in-progress');
      
      // Calculate earnings from completed jobs
      const earnings = completedJobs.reduce((total, app) => {
        return total + (app.payment?.amount || 0);
      }, 0);

      // Calculate success rate
      const successRate = applications.length > 0 
        ? (completedJobs.length / applications.length) * 100 
        : 0;

      stats = {
        ...stats,
        earnings,
        completedCount: completedJobs.length,
        inProgressCount: inProgressJobs.length,
        profileViews: req.user.profileViews || 0,
        successRate: Math.round(successRate),
        invitationsCount: req.user.jobInvitations?.length || 0
      };
    } else {
      // Get employer stats
      const jobs = await Job.find({ employer: userId });
      const completedJobs = jobs.filter(job => job.status === 'completed');
      const activeJobs = jobs.filter(job => job.status === 'open' || job.status === 'in-progress');
      const pendingApplications = await Application.countDocuments({
        job: { $in: jobs.map(job => job._id) },
        status: 'pending'
      });

      // Calculate total spent on completed jobs
      const totalSpent = completedJobs.reduce((total, job) => {
        return total + (job.payment?.amount || 0);
      }, 0);

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

    res.json({
      stats,
      recentActivity
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error getting dashboard statistics' });
  }
});

// Rest of your routes...

export default router; 