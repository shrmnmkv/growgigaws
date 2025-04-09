import express from 'express';
import Review from '../models/Review.js';
import Job from '../models/Job.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'firstName lastName')
      .populate('job', 'title')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reviews for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const reviews = await Review.find({ job: req.params.jobId })
      .populate('reviewer', 'firstName lastName')
      .populate('reviewee', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create review
router.post('/', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.body.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user is authorized to review
    if (!job.employer.equals(req.user.id) && !job.freelancer?.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to review this job' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      job: req.body.job,
      reviewer: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this job' });
    }

    const review = new Review({
      ...req.body,
      reviewer: req.user.id
    });

    await review.save();
    
    await review.populate('reviewer', 'firstName lastName');
    await review.populate('reviewee', 'firstName lastName');
    await review.populate('job', 'title');

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update review
router.put('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (!review.reviewer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          rating: req.body.rating,
          comment: req.body.comment,
          skills: req.body.skills
        }
      },
      { new: true }
    )
    .populate('reviewer', 'firstName lastName')
    .populate('reviewee', 'firstName lastName')
    .populate('job', 'title');

    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete review
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (!review.reviewer.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;