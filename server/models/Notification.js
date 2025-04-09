import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'work_submitted',
      'work_approved',
      'milestone_completed',
      'payment_released',
      'project_completed',
      'review_received'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  milestone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone'
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Notification', notificationSchema);