import express from 'express';
import Payment from '../models/Payment.js';
import Milestone from '../models/Milestone.js';
import Job from '../models/Job.js';
import { auth, checkRole } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// Fund milestone escrow
router.post('/fund-escrow', auth, checkRole(['employer']), async (req, res) => {
  try {
    console.log('Fund escrow endpoint called');
    console.log('Request body:', req.body);
    
    const { milestoneData, paymentMethod, paymentDetails } = req.body;

    // Check if we're funding an existing milestone or creating a new one with payment
    if (!milestoneData) {
      return res.status(400).json({ message: 'Milestone data is required' });
    }

    // Validate job exists and belongs to the employer
    const job = await Job.findById(milestoneData.job);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!job.employer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // First, create the milestone
    const milestone = new Milestone({
      ...milestoneData,
      job: job._id,
      status: 'pending',
      escrowStatus: 'funded',
      amount: parseFloat(milestoneData.amount)
    });

    await milestone.save();
    console.log('Milestone created first');

    // Now create payment record with the milestone reference
    const payment = new Payment({
      job: job._id,
      milestone: milestone._id, // Reference to the milestone we just created
      employer: req.user._id,
      freelancer: job.freelancer || null, // Freelancer might not be assigned yet
      amount: parseFloat(milestoneData.amount),
      currency: milestoneData.currency || 'USD',
      status: 'held',
      paymentMethod,
      description: `Payment for milestone: ${milestone.title}`,
      paymentDetails: {
        last4: paymentDetails.cardNumber.slice(-4),
        brand: paymentDetails.cardBrand,
        expiryMonth: paymentDetails.expiryMonth,
        expiryYear: paymentDetails.expiryYear
      }
    });

    // Set virtual flags to allow saving without required fields that might be missing
    if (!job.freelancer) {
      payment._freelancerRequired = false;
    }

    console.log('Created payment record with milestone reference');
    await payment.save();
    console.log('Payment saved successfully');

    // Update the milestone with the payment reference
    milestone.payment = payment._id;
    await milestone.save();
    console.log('Milestone updated with payment reference');
    
    // Update job escrow balance
    await Job.findByIdAndUpdate(job._id, {
      $inc: { 'escrowBalance.amount': parseFloat(milestoneData.amount) }
    });
    console.log('Job escrow balance updated');

    // Create notification for freelancer if one exists
    if (job.freelancer) {
      await createNotification({
        recipient: job.freelancer,
        type: 'milestone_funded',
        title: 'Milestone Funded',
        message: `Escrow has been funded for milestone: ${milestone.title}`,
        job: job._id,
        milestone: milestone._id
      });
      console.log('Notification created for freelancer');
    }

    res.status(201).json({
      message: 'Milestone created and escrow funded successfully',
      payment,
      milestone
    });
  } catch (error) {
    console.error('Error funding escrow:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Release payment from escrow
router.post('/release/:paymentId', auth, checkRole(['employer']), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('milestone')
      .populate('job');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (!payment.job.employer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (payment.status !== 'held') {
      return res.status(400).json({ message: 'Payment is not in escrow' });
    }

    // Update payment status
    payment.status = 'released';
    payment.releasedAt = Date.now();
    await payment.save();

    // Make sure milestone exists before trying to update it
    if (!payment.milestone) {
      console.log('Warning: Payment has no associated milestone');
      return res.status(400).json({ message: 'Payment has no associated milestone' });
    }

    // Update milestone status
    const milestone = await Milestone.findById(payment.milestone._id);
    if (milestone) {
      milestone.escrowStatus = 'released';
      await milestone.save();
    } else {
      console.log('Warning: Could not find milestone for payment');
    }

    // Update job escrow balance and total paid
    await Job.findByIdAndUpdate(payment.job._id, {
      $inc: {
        'escrowBalance.amount': -payment.amount,
        'totalPaid.amount': payment.amount
      }
    });

    // Create notification for freelancer if one exists
    if (payment.freelancer) {
      await createNotification({
        recipient: payment.freelancer,
        type: 'payment_released',
        title: 'Payment Released',
        message: `Payment of ${payment.amount} ${payment.currency} has been released for milestone: ${milestone?.title || 'Unknown'}`,
        job: payment.job._id,
        milestone: payment.milestone?._id
      });
    }

    res.json({
      message: 'Payment released successfully',
      payment
    });
  } catch (error) {
    console.error('Error releasing payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    let query = {
      $or: [
        { employer: req.user._id },
        { freelancer: req.user._id }
      ]
    };
    
    // Get payments where this user is involved
    const payments = await Payment.find(query)
      .populate('job', 'title')
      .populate('milestone', 'title')
      .populate('employer', 'firstName lastName')
      .populate('freelancer', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Format payments for frontend consistency
    const formattedPayments = payments.map(payment => {
      // Ensure the date field is set (frontend expects payment.date)
      const formattedPayment = {
        _id: payment._id,
        date: payment.date || payment.createdAt,
        amount: payment.amount,
        status: payment.status,
        description: payment.description || (
          payment.type === 'withdrawal' 
            ? 'Withdrawal request' 
            : payment.milestone 
              ? `Payment for milestone: ${payment.milestone.title || ''}` 
              : `Payment for job: ${payment.job?.title || ''}`
        )
      };
      
      return formattedPayment;
    });

    res.json(formattedPayments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Process withdrawal request
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }
    
    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.ifscCode) {
      return res.status(400).json({ message: 'Bank details are required' });
    }
    
    // Create a withdrawal payment record
    const withdrawal = new Payment({
      type: 'withdrawal',
      // These can be null for withdrawals
      job: null, 
      milestone: null,
      // Set the appropriate user field based on role
      employer: req.user.role === 'employer' ? req.user._id : null,
      freelancer: req.user.role === 'freelancer' ? req.user._id : null,
      amount: -amount, // Negative amount to indicate outgoing payment
      currency: 'USD',
      status: 'pending',
      description: 'Withdrawal request',
      paymentMethod: 'bank_transfer',
      paymentDetails: {
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        ifscCode: bankDetails.ifscCode
      }
    });
    
    await withdrawal.save();
    
    // Create notification for the user
    await createNotification({
      recipient: req.user._id,
      type: 'withdrawal_request',
      title: 'Withdrawal Request Received',
      message: `Your withdrawal request for ${amount} USD has been received and is being processed.`
    });
    
    res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get escrow balance for a job
router.get('/escrow-balance/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (!job.employer.equals(req.user._id) && !job.freelancer.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      escrowBalance: job.escrowBalance,
      totalPaid: job.totalPaid
    });
  } catch (error) {
    console.error('Error fetching escrow balance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a sample payment (for testing only)
router.post('/sample', auth, async (req, res) => {
  try {
    // Create a sample payment record
    const payment = new Payment({
      type: 'deposit',
      employer: req.user.role === 'employer' ? req.user._id : null,
      freelancer: req.user.role === 'freelancer' ? req.user._id : null,
      amount: 100,
      currency: 'USD',
      status: 'completed',
      description: 'Sample payment for testing',
      paymentMethod: 'card',
      paymentDetails: {
        last4: '4242',
        brand: 'Visa',
      }
    });
    
    await payment.save();
    
    res.status(201).json({
      message: 'Sample payment created',
      payment
    });
  } catch (error) {
    console.error('Error creating sample payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;