import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  skills: [{
    skill: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  communication: {
    type: Number,
    min: 1,
    max: 5
  },
  quality: {
    type: Number,
    min: 1,
    max: 5
  },
  timeliness: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate average rating before saving
reviewSchema.pre('save', function(next) {
  const skillsAvg = this.skills.reduce((acc, curr) => acc + curr.rating, 0) / this.skills.length;
  this.rating = ((skillsAvg + this.communication + this.quality + this.timeliness) / 4).toFixed(1);
  next();
});

export default mongoose.model('Review', reviewSchema);