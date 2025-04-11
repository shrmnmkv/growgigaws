import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  files: [{
    originalname: String,
    mimetype: String,
    size: Number,
    path: String,
    key: String
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewComment: String,
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const milestoneSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in-progress', 'submitted', 'completed', 'overdue'],
    default: 'pending'
  },
  escrowStatus: {
    type: String,
    enum: ['unfunded', 'funded', 'released', 'refunded'],
    default: 'unfunded'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  submission: submissionSchema,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add index for job field for faster queries
milestoneSchema.index({ job: 1 });

// Add index for status for faster filtering
milestoneSchema.index({ status: 1 });

const Milestone = mongoose.model('Milestone', milestoneSchema);

export default Milestone;