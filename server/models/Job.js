import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'freelance'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  skills: [{
    type: String,
    trim: true
  }],
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'closed', 'cancelled'],
    default: 'open'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  startDate: Date,
  endDate: Date,
  completedAt: Date,
  totalBudget: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  totalPaid: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  escrowBalance: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  rating: {
    employer: {
      type: Number,
      min: 1,
      max: 5
    },
    freelancer: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  reviews: {
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for employer field
jobSchema.index({ employer: 1 });

// Add index for freelancer field
jobSchema.index({ freelancer: 1 });

// Add index for status
jobSchema.index({ status: 1 });

export default mongoose.model('Job', jobSchema);