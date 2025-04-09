import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FreelancerProfile from './models/FreelancerProfile.js';
import User from './models/User.js';

dotenv.config();

async function checkFreelancers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check users with freelancer role
    const freelancerUsers = await User.find({ role: 'freelancer' });
    console.log('\nFreelancer Users:', freelancerUsers.length);
    freelancerUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email})`);
    });

    // Check freelancer profiles
    const freelancerProfiles = await FreelancerProfile.find().populate('user');
    console.log('\nFreelancer Profiles:', freelancerProfiles.length);
    freelancerProfiles.forEach(profile => {
      console.log(`- ${profile.user?.firstName} ${profile.user?.lastName}: ${profile.title}`);
      console.log(`  Skills: ${profile.skills?.join(', ')}`);
      console.log(`  Rate: $${profile.hourlyRate?.amount}/hr`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFreelancers(); 