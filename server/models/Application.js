import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  coverLetter: {
    type: String,
    required: true
  },
  expectedRate: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a freelancer can only apply once to a job
applicationSchema.index({ job: 1, freelancer: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema); 