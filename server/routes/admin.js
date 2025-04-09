import express from 'express';
import { auth, checkRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';

const router = express.Router();

// Clean database route - requires admin role
router.post('/cleanup', auth, checkRole(['admin']), async (req, res) => {
  try {
    console.log('Starting database cleanup...');

    // Delete all applications
    const deleteApplicationsResult = await Application.deleteMany({});
    console.log('Deleted applications:', deleteApplicationsResult.deletedCount);

    // Delete all jobs
    const deleteJobsResult = await Job.deleteMany({});
    console.log('Deleted jobs:', deleteJobsResult.deletedCount);

    // Delete all users except admin
    const deleteUsersResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log('Deleted users:', deleteUsersResult.deletedCount);

    res.json({
      message: 'Database cleaned successfully',
      deletedCounts: {
        applications: deleteApplicationsResult.deletedCount,
        jobs: deleteJobsResult.deletedCount,
        users: deleteUsersResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Error cleaning database', error: error.message });
  }
});

export default router; 