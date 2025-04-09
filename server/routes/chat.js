import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get all chats for a user
router.get('/', auth, async (req, res) => {
  try {
    // Find chats where the user is a participant
    const chats = await Chat.find({ 
      'participants.user': req.user.id,
      'status': 'active'
    })
      .populate('participants.user', 'firstName lastName role userType')
      .populate('job', 'title')
      .sort({ lastMessage: -1 });
    
    // Update all chats with unread counts
    const processedChats = chats.map(chat => {
      // Find current user's participant object
      const currentUserParticipant = chat.participants.find(p => 
        p.user._id.equals(req.user.id)
      );
      
      // Calculate unread count for this user
      const unreadCount = chat.messages.reduce((count, message) => {
        return !message.read && !message.sender.equals(req.user.id) 
          ? count + 1 
          : count;
      }, 0);
      
      // Add unread count to response
      return {
        ...chat.toObject(),
        unread: unreadCount
      };
    });
    
    res.json(processedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get chat by ID
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('participants.user', 'firstName lastName role userType')
      .populate('job', 'title')
      .populate('messages.sender', 'firstName lastName');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(p => 
      p.user._id.equals(req.user.id)
    );
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update the user's lastSeen time
    const userParticipant = chat.participants.find(p => 
      p.user._id.equals(req.user.id)
    );
    
    if (userParticipant) {
      userParticipant.lastSeen = new Date();
      await chat.save();
    }

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new chat
router.post('/', auth, async (req, res) => {
  try {
    console.log("=== DEBUG: SERVER CHAT CREATION ===");
    console.log("User making request:", {
      id: req.user.id,
      type: typeof req.user.id
    });
    
    const { participantId, jobId, message } = req.body;
    console.log("Request body:", req.body);
    console.log("Participant ID received:", participantId);
    console.log("Participant ID type:", typeof participantId);

    if (!participantId || !message) {
      console.log("Error: Missing required fields");
      return res.status(400).json({ message: 'ParticipantId and message are required' });
    }

    // Prevent users from chatting with themselves
    const sameUser = participantId === req.user.id;
    console.log(`Self-chat check: ${participantId} === ${req.user.id} ? ${sameUser}`);
    
    if (sameUser) {
      console.log("Error: User attempted to create chat with self");
      return res.status(400).json({ message: 'Cannot create a chat with yourself' });
    }

    // Verify participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      console.log(`Error: Participant with ID ${participantId} not found`);
      return res.status(404).json({ message: 'Participant user not found' });
    }
    
    console.log("Participant found:", {
      id: participant._id,
      name: `${participant.firstName} ${participant.lastName}`,
      role: participant.role || participant.userType
    });

    console.log(`Creating chat between user ${req.user.id} and participant ${participantId}`);

    // Check if chat already exists
    let chat = await Chat.findOne({
      'participants.user': { $all: [req.user.id, participantId] },
      job: jobId,
      status: 'active'
    }).populate('participants.user', 'firstName lastName role userType');
    
    if (chat) {
      console.log(`Existing chat found with ID: ${chat._id}`);
      console.log("Participants:", chat.participants.map(p => ({
        id: p.user._id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        role: p.role
      })));
      
      // Add new message to existing chat
      chat.messages.push({
        sender: req.user.id,
        content: message,
        timestamp: new Date()
      });
      
      // Update lastMessage timestamp
      chat.lastMessage = new Date();
      
      // Update unread count for recipient
      const recipientParticipant = chat.participants.find(p => 
        !p.user._id.equals(req.user.id)
      );
      
      if (recipientParticipant) {
        recipientParticipant.unreadCount += 1;
        console.log(`Updated unread count for recipient to ${recipientParticipant.unreadCount}`);
      }
      
      // Update sender's lastSeen
      const senderParticipant = chat.participants.find(p => 
        p.user._id.equals(req.user.id)
      );
      
      if (senderParticipant) {
        senderParticipant.lastSeen = new Date();
        console.log(`Updated sender's lastSeen time`);
      }
    } else {
      console.log("No existing chat found, creating new chat");
      
      // Create new chat with defined roles
      chat = new Chat({
        participants: [
          { 
            user: req.user.id, 
            role: 'initiator',
            lastSeen: new Date()
          },
          { 
            user: participantId, 
            role: 'recipient',
            unreadCount: 1
          }
        ],
        job: jobId,
        messages: [{
          sender: req.user.id,
          content: message,
          timestamp: new Date()
        }],
        lastMessage: new Date()
      });
      
      console.log("New chat object created:", {
        id: chat._id,
        participants: chat.participants.map(p => ({
          user: p.user,
          role: p.role
        }))
      });
    }

    await chat.save();
    console.log("Chat saved to database");
    
    // Populate necessary fields
    await chat.populate('participants.user', 'firstName lastName role userType');
    if (jobId) {
      await chat.populate('job', 'title');
    }
    
    console.log(`Chat created/updated with ID: ${chat._id}`);
    console.log(`Participants: ${chat.participants.map(p => 
      typeof p.user === 'object' 
        ? `${p.user._id} (${p.user.firstName} ${p.user.lastName})`
        : p.user
    ).join(', ')}`);
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message to existing chat
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    if (!req.body.message) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findById(req.params.chatId)
      .populate('participants.user', 'firstName lastName role userType');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const userParticipant = chat.participants.find(p => 
      p.user._id.equals(req.user.id)
    );
    
    if (!userParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add new message
    chat.messages.push({
      sender: req.user.id,
      content: req.body.message,
      timestamp: new Date()
    });
    
    // Update lastMessage timestamp
    chat.lastMessage = new Date();
    
    // Update sender's lastSeen time
    userParticipant.lastSeen = new Date();
    
    // Update recipient's unread count
    const recipientParticipant = chat.participants.find(p => 
      !p.user._id.equals(req.user.id)
    );
    
    if (recipientParticipant) {
      recipientParticipant.unreadCount += 1;
    }

    await chat.save();
    
    // Populate necessary fields
    await chat.populate('messages.sender', 'firstName lastName');
    if (chat.job) {
      await chat.populate('job', 'title');
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read
router.put('/:chatId/read', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const userParticipant = chat.participants.find(p => 
      (p.user._id && p.user._id.equals(req.user.id)) || 
      (typeof p.user === 'string' && p.user === req.user.id)
    );
    
    if (!userParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    let updatedCount = 0;
    
    // Mark unread messages as read
    chat.messages.forEach(message => {
      const senderId = message.sender._id || message.sender;
      const isFromOtherUser = !senderId.equals(req.user.id);
      
      if (isFromOtherUser && !message.read) {
        message.read = true;
        message.readAt = now;
        updatedCount++;
      }
    });
    
    // Reset user's unread count
    userParticipant.unreadCount = 0;
    userParticipant.lastSeen = now;

    await chat.save();
    res.json({ 
      message: 'Messages marked as read',
      updatedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Archive a chat
router.put('/:chatId/archive', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(p => 
      p.user._id.equals(req.user.id)
    );
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied' });
    }

    chat.status = 'archived';
    await chat.save();
    
    res.json({ message: 'Chat archived successfully' });
  } catch (error) {
    console.error('Error archiving chat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;