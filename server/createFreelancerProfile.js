import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FreelancerProfile from './models/FreelancerProfile.js';
import User from './models/User.js';

dotenv.config();

async function createFreelancerProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the freelancer user
    const freelancer = await User.findOne({ email: 'yaswanth@gmail.com' });
    if (!freelancer) {
      console.error('Freelancer user not found');
      process.exit(1);
    }

    // Create a sample profile
    const profile = new FreelancerProfile({
      user: freelancer._id,
      title: 'Full Stack Developer',
      bio: 'Experienced full stack developer with expertise in MERN stack.',
      skills: ['React', 'Node.js', 'MongoDB', 'Express', 'JavaScript', 'TypeScript'],
      hourlyRate: {
        amount: 35,
        currency: 'USD'
      },
      experience: [{
        title: 'Full Stack Developer',
        company: 'Tech Solutions Inc.',
        location: 'Remote',
        from: new Date('2022-01-01'),
        to: new Date(),
        current: true,
        description: 'Developing full stack web applications using MERN stack.'
      }],
      education: [{
        school: 'Tech University',
        degree: 'Bachelor of Technology',
        field: 'Computer Science',
        from: new Date('2019-01-01'),
        to: new Date('2023-01-01')
      }],
      portfolio: [{
        title: 'E-commerce Platform',
        description: 'Built a full-featured e-commerce platform using MERN stack.',
        link: 'https://github.com/example/ecommerce'
      }],
      availability: 'immediately',
      rating: 4.5,
      totalReviews: 10,
      completedJobs: 15,
      successRate: 95
    });

    await profile.save();
    console.log('Created freelancer profile:', profile);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createFreelancerProfile(); 