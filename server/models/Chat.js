import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['initiator', 'recipient'],
      required: true
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  }],
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Method to get other participant
chatSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(p => 
    !p.user._id.equals(userId) && !p.user.equals(userId)
  );
};

// Method to update unread counts
chatSchema.methods.updateUnreadCount = function() {
  this.participants.forEach(participant => {
    participant.unreadCount = this.messages.reduce((count, message) => {
      return !message.read && !message.sender.equals(participant.user) 
        ? count + 1 
        : count;
    }, 0);
  });
  return this;
};

export default mongoose.model('Chat', chatSchema);