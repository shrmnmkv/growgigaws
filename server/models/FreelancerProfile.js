import mongoose from 'mongoose';

const freelancerProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  skills: [{
    type: String,
    trim: true
  }],
  hourlyRate: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  experience: [{
    title: String,
    company: String,
    location: String,
    from: Date,
    to: Date,
    current: Boolean,
    description: String
  }],
  education: [{
    school: String,
    degree: String,
    field: String,
    from: Date,
    to: Date
  }],
  portfolio: [{
    title: String,
    description: String,
    link: String
  }],
  resumeUrl: String,
  socialLinks: {
    linkedin: String,
    github: String,
    website: String
  },
  availability: {
    type: String,
    enum: ['immediately', 'in-1-week', 'in-2-weeks', 'in-1-month'],
    default: 'immediately'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
  
});

export default mongoose.model('FreelancerProfile', freelancerProfileSchema);