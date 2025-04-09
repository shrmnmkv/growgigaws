import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: function() { return this.type !== 'withdrawal'; }
  },
  milestone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
    required: function() { 
      // Only require milestone for job_payment type and when it's not in the initial creation phase
      return this.type === 'job_payment' && this._milestoneRequired === true; 
    }
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.type !== 'withdrawal' || this.role === 'employer'; }
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { 
      // Only require freelancer when it's available (escrow payments may not have a freelancer assigned yet)
      return (this.type !== 'withdrawal' && this._freelancerRequired === true) || this.role === 'freelancer'; 
    }
  },
  description: {
    type: String,
    default: 'Payment'
  },
  type: {
    type: String,
    enum: ['job_payment', 'withdrawal', 'deposit'],
    default: 'job_payment'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'held', 'released', 'refunded', 'completed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer'],
    required: true
  },
  paymentDetails: {
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  transactionId: String,
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  releasedAt: Date,
  refundedAt: Date
});

export default mongoose.model('Payment', paymentSchema);