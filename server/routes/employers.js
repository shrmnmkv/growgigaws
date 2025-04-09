import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get all employers with job statistics
router.get('/', auth, async (req, res) => {
  try {
    const {
      hasActiveJobs,
      sortBy = 'jobCount'
    } = req.query;

    // Get all employers
    const employers = await User.find({ role: 'employer' })
      .select('-password')
      .lean();

    // Get job statistics for each employer
    const employersWithStats = await Promise.all(employers.map(async (employer) => {
      const jobs = await Job.find({ employer: employer._id });
      
      const stats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(job => job.status === 'open' || job.status === 'in-progress').length,
        completedJobs: jobs.filter(job => job.status === 'completed').length,
        averageBudget: jobs.length > 0 
          ? jobs.reduce((sum, job) => sum + ((job.salary?.min || 0) + (job.salary?.max || 0)) / 2, 0) / jobs.length 
          : 0,
        mostRequestedSkills: getMostRequestedSkills(jobs),
        recentJobs: jobs
          .filter(job => job.status === 'open')
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 3)
          .map(job => ({
            id: job._id,
            title: job.title,
            type: job.type,
            salary: job.salary,
            skills: job.skills
          }))
      };

      return {
        ...employer,
        fullName: `${employer.firstName} ${employer.lastName}`,
        stats
      };
    }));

    // Apply filters
    let filteredEmployers = employersWithStats;
    if (hasActiveJobs === 'true') {
      filteredEmployers = filteredEmployers.filter(emp => emp.stats.activeJobs > 0);
    }

    // Apply sorting
    switch (sortBy) {
      case 'jobCount':
        filteredEmployers.sort((a, b) => b.stats.totalJobs - a.stats.totalJobs);
        break;
      case 'activeJobs':
        filteredEmployers.sort((a, b) => b.stats.activeJobs - a.stats.activeJobs);
        break;
      case 'completedJobs':
        filteredEmployers.sort((a, b) => b.stats.completedJobs - a.stats.completedJobs);
        break;
      case 'averageBudget':
        filteredEmployers.sort((a, b) => b.stats.averageBudget - a.stats.averageBudget);
        break;
    }

    res.json(filteredEmployers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get employer profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('GET /employers/profile - User:', req.user);
    console.log('GET /employers/profile - User ID:', req.user._id);
    
    // Make sure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Invalid user authentication' });
    }
    
    const employer = await User.findById(req.user._id).select('-password');
    console.log('GET /employers/profile - Found employer:', employer);
    
    if (!employer) {
      return res.status(404).json({ 
        message: 'Employer not found',
        code: 'EMPLOYER_NOT_FOUND'
      });
    }
    
    if (employer.role !== 'employer') {
      return res.status(403).json({ 
        message: 'User is not an employer',
        code: 'NOT_EMPLOYER'
      });
    }
    
    res.json(employer);
  } catch (error) {
    console.error('GET /employers/profile - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update employer profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('PUT /employers/profile - User:', req.user);
    console.log('PUT /employers/profile - User ID:', req.user._id);
    console.log('PUT /employers/profile - Request body:', req.body);
    
    // Make sure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Invalid user authentication' });
    }
    
    const employer = await User.findById(req.user._id);
    console.log('PUT /employers/profile - Found employer:', employer);
    
    if (!employer) {
      return res.status(404).json({ 
        message: 'Employer not found',
        code: 'EMPLOYER_NOT_FOUND'
      });
    }
    
    if (employer.role !== 'employer') {
      return res.status(403).json({ 
        message: 'User is not an employer',
        code: 'NOT_EMPLOYER'
      });
    }

    const { firstName, lastName, email, phone, company, position, location } = req.body;

    // Update fields
    employer.firstName = firstName || employer.firstName;
    employer.lastName = lastName || employer.lastName;
    employer.email = email || employer.email;
    employer.phone = phone || employer.phone;
    employer.company = company || employer.company;
    employer.position = position || employer.position;
    employer.location = location || employer.location;

    console.log('PUT /employers/profile - Updating employer with data:', employer);
    await employer.save();
    
    // Return updated employer without password
    const updatedEmployer = await User.findById(employer._id).select('-password');
    console.log('PUT /employers/profile - Updated employer:', updatedEmployer);
    res.json(updatedEmployer);
  } catch (error) {
    console.error('PUT /employers/profile - Error:', error);
    console.error('PUT /employers/profile - Stack:', error.stack);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get employer by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const employer = await User.findById(req.params.id).select('-password');
    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({ message: 'Employer not found' });
    }

    // Get employer's jobs
    const jobs = await Job.find({ employer: employer._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const employerData = {
      ...employer.toObject(),
      fullName: `${employer.firstName} ${employer.lastName}`,
      stats: {
        totalJobs: await Job.countDocuments({ employer: employer._id }),
        activeJobs: await Job.countDocuments({ 
          employer: employer._id,
          status: { $in: ['open', 'in-progress'] }
        }),
        completedJobs: await Job.countDocuments({ 
          employer: employer._id,
          status: 'completed'
        }),
        recentJobs: jobs.map(job => ({
          id: job._id,
          title: job.title,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt
        }))
      }
    };

    res.json(employerData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to get most requested skills from jobs
function getMostRequestedSkills(jobs) {
  const skillCount = {};
  jobs.forEach(job => {
    job.skills.forEach(skill => {
      skillCount[skill] = (skillCount[skill] || 0) + 1;
    });
  });
  
  return Object.entries(skillCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));
}

export default router;