import express from 'express';
import FreelancerProfile from '../models/FreelancerProfile.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Get current freelancer's profile
router.get('/profile', auth, checkRole(['freelancer']), async (req, res) => {
  try {
    console.log('GET /profile - User:', req.user);
    console.log('GET /profile - User ID:', req.user._id);
    
    // Make sure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Invalid user authentication' });
    }
    
    const profile = await FreelancerProfile.findOne({ user: req.user._id });
    console.log('GET /profile - Found profile:', profile);
    
    if (!profile) {
      // Return 404 with a clear message that profile doesn't exist yet
      return res.status(404).json({ 
        message: 'Profile not found',
        code: 'PROFILE_NOT_FOUND',
        details: 'No profile exists for this freelancer yet. Please create one.'
      });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('GET /profile - Error:', error);
    console.error('GET /profile - Stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update current freelancer's profile
router.put('/profile', auth, checkRole(['freelancer']), async (req, res) => {
  try {
    console.log('PUT /profile - User:', req.user);
    console.log('PUT /profile - User ID:', req.user._id);
    console.log('PUT /profile - Request body:', req.body);
    
    // Make sure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Invalid user authentication' });
    }
    
    // Validate that the user is a freelancer
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers can create freelancer profiles' });
    }
    
    // Find profile by user ID
    let profile = await FreelancerProfile.findOne({ user: req.user._id });
    console.log('PUT /profile - Existing profile:', profile);
    
    if (profile) {
      console.log('PUT /profile - Updating existing profile for user:', req.user._id);
      
      // Make sure we're updating the correct profile with a more explicit query
      profile = await FreelancerProfile.findOneAndUpdate(
        { user: req.user._id, _id: profile._id },
        { $set: req.body },
        { new: true, runValidators: true }
      );
      
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found after update attempt' });
      }
    } else {
      console.log('PUT /profile - Creating new profile for user:', req.user._id);
      
      // Create a new profile
      profile = new FreelancerProfile({
        ...req.body,
        user: req.user._id // Explicitly set the user ID
      });
      
      try {
        await profile.save();
        console.log('PUT /profile - New profile created with ID:', profile._id);
      } catch (saveError) {
        console.error('PUT /profile - Error saving new profile:', saveError);
        return res.status(400).json({ 
          message: 'Error creating profile',
          error: saveError.message
        });
      }
    }
    
    console.log('PUT /profile - Updated/Created profile:', profile);
    res.json(profile);
  } catch (error) {
    console.error('PUT /profile - Error:', error);
    console.error('PUT /profile - Stack:', error.stack);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Get all freelancers with filters - Make this public by removing auth middleware
router.get('/', async (req, res) => {
  try {
    console.log('GET /freelancers - Request received');
    console.log('GET /freelancers - Query params:', req.query);
    
    const {
      skills,
      availability,
      minRate,
      maxRate,
      sortBy = 'rating',
      keyword,
      location
    } = req.query;

    // Build query
    let query = {};

    // Filter by keyword if provided
    if (keyword) {
      query['$or'] = [
        { 'title': { $regex: keyword, $options: 'i' } },
        { 'skills': { $regex: keyword, $options: 'i' } },
        { 'bio': { $regex: keyword, $options: 'i' } }
      ];
    }

    // Filter by location if provided
    if (location) {
      query['location'] = { $regex: location, $options: 'i' };
    }

    // Filter by skills if provided
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query['skills'] = { $in: skillsArray };
    }

    // Filter by availability if provided
    if (availability) {
      query['availability'] = availability;
    }

    // Filter by hourly rate if provided
    if (minRate || maxRate) {
      query['hourlyRate.amount'] = {};
      if (minRate) query['hourlyRate.amount'].$gte = Number(minRate);
      if (maxRate) query['hourlyRate.amount'].$lte = Number(maxRate);
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'completedJobs':
        sort = { completedJobs: -1 };
        break;
      case 'successRate':
        sort = { successRate: -1 };
        break;
      case 'hourlyRate':
        sort = { 'hourlyRate.amount': 1 };
        break;
      default:
        sort = { rating: -1 };
    }

    console.log('Fetching freelancers with query:', query);
    console.log('Using sort:', sort);

    const freelancers = await FreelancerProfile.find(query)
      .populate('user', 'firstName lastName email')
      .sort(sort);

    console.log(`Found ${freelancers.length} freelancers`);

    // Enhance the response with formatted data
    const enhancedFreelancers = freelancers.map(freelancer => ({
      ...freelancer.toObject(),
      fullName: `${freelancer.user?.firstName} ${freelancer.user?.lastName}`,
      skillsCount: freelancer.skills?.length || 0,
      experienceYears: freelancer.experience ? Math.max(...freelancer.experience.map(exp => 
        new Date().getFullYear() - new Date(exp.from).getFullYear()
      )) : 0
    }));

    res.json(enhancedFreelancers);
  } catch (error) {
    console.error('GET / - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get freelancer by ID - Also make this one public
router.get('/:id', async (req, res) => {
  try {
    const freelancer = await FreelancerProfile.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    res.json(freelancer);
  } catch (error) {
    console.error('GET /:id - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;