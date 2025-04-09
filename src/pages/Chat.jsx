import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner } from 'react-bootstrap';
import { Send, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

function Chat({ isDashboard = false }) {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllersRef = useRef(new Map());
  const mountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const chatListRef = useRef(null);
  const messageInputRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState('');

  // Ensure we have current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      // If user from context has ID, use it
      if (user && user._id) {
        console.log("User ID from context:", user._id);
        setCurrentUserId(user._id);
        return;
      }
      
      // If no user ID, try to get from token
      if (token) {
        try {
          // Try to get user profile if we have token but no ID
          const response = await api.get('/users/me');
          if (response.data && response.data._id) {
            console.log("User ID from API:", response.data._id);
            setCurrentUserId(response.data._id);
          }
        } catch (error) {
          console.error("Failed to fetch current user details:", error);
        }
      }
    };
    
    fetchCurrentUser();
  }, [user, token]);

  // Initial load and cleanup
  useEffect(() => {
    mountedRef.current = true;
    fetchChats();

    return () => {
      mountedRef.current = false;
      abortControllersRef.current.forEach(controller => {
        try {
          controller.abort();
        } catch (error) {
          console.log('Error aborting controller:', error);
        }
      });
      abortControllersRef.current.clear();
    };
  }, []);

  // Handle direct chat open from URL params
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    const withUserId = searchParams.get('with');
    
    // Only proceed if we have the current user ID
    if (!currentUserId) {
      console.log("Waiting for current user ID before initializing chat...");
      return;
    }
    
    if (chatId && chats.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.log("Opening chat from URL with chatId:", chatId);
      const chatToOpen = chats.find(chat => chat._id === chatId);
      if (chatToOpen) {
        handleChatSelect(chatToOpen);
      } else {
        console.error("Could not find chat with ID:", chatId);
      }
    } else if (withUserId && chats.length > 0 && !hasInitializedRef.current) {
      // Prevent initiating chat with self
      if (withUserId === currentUserId) {
        console.error("Cannot create chat with yourself");
        hasInitializedRef.current = true;
        return;
      }
      
      hasInitializedRef.current = true;
      console.log("Looking for chat with participant:", withUserId);
      
      // More robust check for existing chat
      const existingChat = chats.find(chat => {
        // Convert all IDs to strings for comparison
        const participantIds = chat.participants.map(p => 
          typeof p.user === 'object' ? String(p.user._id || '') : String(p.user || '')
        );
        const withUserIdStr = String(withUserId || '');
        
        // Log for debugging
        console.log("Chat participants:", participantIds, "Looking for:", withUserIdStr);
        
        // Check both users are in the chat
        return participantIds.includes(withUserIdStr) && 
               participantIds.includes(currentUserId);
      });
      
      if (existingChat) {
        console.log("Found existing chat:", existingChat._id);
        handleChatSelect(existingChat);
      } else {
        console.log("Creating new chat with:", withUserId);
        createNewChat(withUserId);
      }
    }
  }, [searchParams, chats, currentUserId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (selectedChat?.messages?.length) {
      scrollToBottom();
    }
  }, [selectedChat?.messages?.length]);

  // Focus on message input when chat is selected
  useEffect(() => {
    if (selectedChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChat?._id]);

  // Utility to create abort controllers for API calls
  const createAbortController = (key) => {
    if (abortControllersRef.current.has(key)) {
      try {
        abortControllersRef.current.get(key).abort();
      } catch (error) {
        console.log('Error aborting existing controller:', error);
      }
    }
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);
    return controller;
  };

  // Fetch all user chats
  const fetchChats = async () => {
    const controller = createAbortController('fetchChats');
    try {
      const response = await api.get('/chat', {
        signal: controller.signal
      });
      
      if (mountedRef.current) {
        // Sort chats by most recent message
        const sortedChats = response.data.sort((a, b) => {
          const aTime = a.updatedAt || (a.messages && a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : 0);
          const bTime = b.updatedAt || (b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : 0);
          return new Date(bTime) - new Date(aTime);
        });
        
        setChats(sortedChats);
        setLoading(false);
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching chats:', error);
      if (mountedRef.current) {
        setLoading(false);
      }
    } finally {
      abortControllersRef.current.delete('fetchChats');
    }
  };

  // Handle chat selection
  const handleChatSelect = async (chat) => {
    const controller = createAbortController('selectChat');
    try {
      const response = await api.get(`/chat/${chat._id}`, {
        signal: controller.signal
      });
      
      if (mountedRef.current) {
        // Log chat data for debugging
        console.log("Selected chat data:", {
          chatId: response.data._id,
          participants: response.data.participants,
          currentUser: user
        });
        
        setSelectedChat(response.data);
        
        // Mark messages as read
        markMessagesAsRead(chat._id);
        
        // Update the chat in the chats list
        setChats(prevChats => 
          prevChats.map(c => 
            c._id === chat._id ? { 
              ...c, 
              messages: response.data.messages,
              unread: 0 // Clear unread count in UI immediately
            } : c
          )
        );
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error selecting chat:', error);
    } finally {
      abortControllersRef.current.delete('selectChat');
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (chatId) => {
    const controller = createAbortController('markRead');
    try {
      await api.put(`/chat/${chatId}/read`, {}, {
        signal: controller.signal
      });
    } catch (error) {
      if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
        console.error('Error marking messages as read:', error);
      }
    } finally {
      abortControllersRef.current.delete('markRead');
    }
  };

  // Create a new chat
  const createNewChat = async (participantId) => {
    const controller = createAbortController('createChat');
    try {
      console.log("=== DEBUG: Chat Creation Started ===");
      
      // Validate participantId
      if (!participantId) {
        console.error('Cannot create chat: Missing participantId');
        return;
      }
      
      // Ensure we have current user ID before proceeding
      if (!currentUserId) {
        console.error('Cannot create chat: Current user ID is not available');
        return;
      }
      
      console.log("Participant ID received:", participantId);
      console.log("Participant ID type:", typeof participantId);
      console.log("Current user:", {
        _id: currentUserId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
      });
      
      // Prevent creating chats with self - always convert to strings for comparison
      const userIdStr = String(currentUserId);
      const participantIdStr = String(participantId || '');
      
      console.log(`ID comparison (string): ${participantIdStr} === ${userIdStr} ? ${participantIdStr === userIdStr}`);
      
      if (participantIdStr === userIdStr) {
        console.error('Error: Cannot create chat with yourself - IDs match');
        return;
      }
      
      console.log(`Creating new chat between user ${userIdStr} and participant ${participantIdStr}`);
      
      // Construct API request data
      const requestData = {
        participantId: participantId,
        message: 'Hello! I would like to discuss a potential collaboration.'
      };
      
      console.log("API request data:", requestData);
      
      const response = await api.post('/chat', requestData, {
        signal: controller.signal
      });
      
      if (mountedRef.current) {
        console.log("Chat creation successful!");
        console.log("Response status:", response.status);
        
        const newChat = response.data;
        console.log("New chat ID:", newChat._id);
        
        // Log detailed participant info for debugging
        console.log("New chat participants:");
        newChat.participants.forEach((p, index) => {
          const participantId = typeof p.user === 'object' 
            ? p.user._id 
            : p.user;
            
          const participantName = typeof p.user === 'object' 
            ? `${p.user.firstName} ${p.user.lastName}`
            : 'Unknown';
            
          console.log(`Participant ${index + 1}: ID=${participantId}, Name=${participantName}, Role=${p.role}`);
        });
        
        // Check if this chat includes both intended users
        const hasCurrentUser = newChat.participants.some(p => {
          const pIdStr = typeof p.user === 'object' 
            ? String(p.user._id || '')
            : String(p.user || '');
          return pIdStr === userIdStr;
        });
        
        const hasOtherParticipant = newChat.participants.some(p => {
          const pIdStr = typeof p.user === 'object' 
            ? String(p.user._id || '')
            : String(p.user || '');
          return pIdStr === participantIdStr;
        });
        
        console.log(`Chat includes current user? ${hasCurrentUser}`);
        console.log(`Chat includes intended participant? ${hasOtherParticipant}`);
        
        if (!hasCurrentUser || !hasOtherParticipant) {
          console.error("Error: Chat was created with incorrect participants!");
        }
        
        setChats(prevChats => [newChat, ...prevChats]);
        setSelectedChat(newChat);
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error creating new chat:', error);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      } else if (error.request) {
        console.error('Error: No response received', error.request);
      } else {
        console.error('Error message:', error.message);
      }
    } finally {
      abortControllersRef.current.delete('createChat');
    }
  };

  // Send a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat || sendingMessage) return;

    const trimmedMessage = message.trim();
    setMessage('');
    setSendingMessage(true);

    const controller = createAbortController('sendMessage');
    try {
      await api.post(
        `/chat/${selectedChat._id}/messages`,
        { message: trimmedMessage },
        { signal: controller.signal }
      );
      
      if (mountedRef.current) {
        // Optimistically update the UI
        const optimisticMessage = {
          _id: `temp-${Date.now()}`,
          content: trimmedMessage,
          sender: user,
          timestamp: new Date().toISOString(),
          read: false
        };
        
        // Update selected chat with new message
        setSelectedChat(prev => ({
          ...prev,
          messages: [...prev.messages, optimisticMessage],
          updatedAt: new Date().toISOString() // Update timestamp
        }));
        
        // Update chat in the chat list
        setChats(prevChats => 
          prevChats.map(chat => 
            chat._id === selectedChat._id 
              ? { 
                  ...chat, 
                  messages: [...chat.messages, optimisticMessage],
                  updatedAt: new Date().toISOString() // Update timestamp
                } 
              : chat
          )
        );
        
        // Refresh the chat to get the server's version
        refreshChatAfterSend(selectedChat._id);
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error sending message:', error);
      // Restore message if send fails
      setMessage(trimmedMessage);
    } finally {
      setSendingMessage(false);
      abortControllersRef.current.delete('sendMessage');
    }
  };

  // Refresh chat data after sending a message
  const refreshChatAfterSend = async (chatId) => {
    const controller = createAbortController('refreshChat');
    try {
      const response = await api.get(`/chat/${chatId}`, {
        signal: controller.signal
      });
      
      if (mountedRef.current) {
        const updatedChat = response.data;
        
        // Update selected chat with server data
        setSelectedChat(updatedChat);
        
        // Update the chat in the chats list and move it to the top
        setChats(prevChats => {
          // Remove the old version of the chat
          const filteredChats = prevChats.filter(c => c._id !== chatId);
          // Add the updated chat at the beginning
          return [updatedChat, ...filteredChats];
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
        console.error('Error refreshing chat:', error);
      }
    } finally {
      abortControllersRef.current.delete('refreshChat');
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Format timestamp
  const formatTime = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Get the participant's avatar URL
  const getAvatarUrl = (participant) => {
    if (!participant) return '';
    
    // Check if participant is a user object directly or has nested user property
    const user = participant.user || participant;
    
    // Make sure we have a firstName to use
    if (!user || !user.firstName) {
      return 'https://ui-avatars.com/api/?name=User&size=40&background=random';
    }
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}+${encodeURIComponent(user.lastName || '')}&size=40&background=random`;
  };

  // Render chat list item
  const renderChatListItem = (chat) => {
    if (!chat || !chat.participants || !Array.isArray(chat.participants)) {
      console.error("Invalid chat data:", chat);
      return null;
    }
    
    // Get the other participant based on current user's role
    const currentUserIdStr = String(user?._id || '');
    const currentUserRole = user?.role || user?.userType || '';
    
    let otherParticipant;
    
    // If employer, show freelancer
    if (currentUserRole === 'employer') {
      otherParticipant = chat.participants.find(
        p => p?.user && p.user.role === 'freelancer'
      );
    }
    // If freelancer, show employer
    else if (currentUserRole === 'freelancer') {
      otherParticipant = chat.participants.find(
        p => p?.user && p.user.role === 'employer'
      );
    }
    // Fallback to "not me"
    else {
      otherParticipant = chat.participants.find(p => {
        const participantIdStr = typeof p.user === 'object'
          ? String(p.user._id || '')
          : String(p.user || '');
        return participantIdStr !== currentUserIdStr;
      });
    }
    
    // If we couldn't identify the other participant
    if (!otherParticipant || !otherParticipant.user) {
      console.error("Could not identify other participant in chat:", chat._id);
      console.log("Chat participants:", chat.participants);
      console.log("Current user ID:", currentUserIdStr);
      return null;
    }
    
    // Ensure other participant has a user object with name
    const otherUser = typeof otherParticipant.user === 'object' 
      ? otherParticipant.user 
      : { firstName: 'User', lastName: '' };
    
    // Get the unread count (either from server calculation or calculate locally)
    const unreadCount = typeof chat.unread !== 'undefined' 
      ? chat.unread 
      : chat.messages?.filter(m => {
          // Get sender ID as string
          const msgSenderId = typeof m.sender === 'object' 
            ? String(m.sender._id || '') 
            : String(m.sender || '');
          
          // Count unread messages NOT from current user
          return !m.read && msgSenderId !== currentUserIdStr;
        }).length || 0;
    
    // Get last message info
    const lastMsg = chat.messages && chat.messages.length > 0 
      ? chat.messages[chat.messages.length - 1] 
      : null;
    
    const lastMessageContent = lastMsg?.content || 'No messages yet';
    
    // Check if last message was from the current user
    const isLastMessageFromMe = lastMsg && (
      typeof lastMsg.sender === 'object'
        ? String(lastMsg.sender._id || '') === currentUserIdStr
        : String(lastMsg.sender || '') === currentUserIdStr
    );
    
    // Determine user type for display
    let userType = '';
    let roleBadge = '';
    if (otherUser.role === 'freelancer') {
      userType = 'Freelancer';
      roleBadge = 'bg-info text-white';
    } else if (otherUser.role === 'employer') {
      userType = 'Employer';
      roleBadge = 'bg-primary text-white';
    } else if (otherUser.userType) {
      userType = otherUser.userType.charAt(0).toUpperCase() + otherUser.userType.slice(1);
      roleBadge = 'bg-secondary text-white';
    }
    
    return (
      <div
        key={`chat-${chat._id}`}
        className={`p-3 border-bottom cursor-pointer hover:bg-gray-50 ${
          selectedChat?._id === chat._id ? 'bg-gray-100' : ''
        }`}
        onClick={() => handleChatSelect(chat)}
      >
        <div className="d-flex align-items-center">
          <img
            src={getAvatarUrl(otherUser)}
            alt={`${otherUser.firstName || 'User'} ${otherUser.lastName || ''}`}
            className="rounded-circle me-3"
            style={{ width: '40px', height: '40px' }}
          />
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                {otherUser.firstName || 'User'} {otherUser.lastName || ''} 
                {userType && <span className={`ms-2 badge ${roleBadge}`}>{userType}</span>}
              </h6>
              {unreadCount > 0 && (
                <span className="badge bg-primary rounded-pill">{unreadCount}</span>
              )}
            </div>
            <div className="d-flex align-items-center">
              {isLastMessageFromMe && <small className="text-muted me-1">You: </small>}
              <p className="text-muted mb-0 small text-truncate">
                {lastMessageContent}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render message bubble
  const renderMessageBubble = (msg, index, messages) => {
    if (!msg || !msg.sender) {
      console.error("Invalid message data:", msg);
      return null;
    }
    
    // Get sender ID as string - handle both populated and unpopulated sender references
    const senderIdStr = typeof msg.sender === 'object' && msg.sender
      ? String(msg.sender._id || '')
      : String(msg.sender || '');
    
    // Use currentUserId state instead of relying on user object directly
    const currentUserIdStr = currentUserId;
    
    // Additional logging to debug sender identification
    console.log(`Message: "${msg.content?.substring(0, 15)}..." - Sender ID: ${senderIdStr}, Current User ID: ${currentUserIdStr}`);
    
    // Check if the message was sent by the current user
    const isSentByMe = senderIdStr === currentUserIdStr;
    
    // For message grouping
    const messageKey = `msg-${msg._id || index}-${isSentByMe ? 'me' : 'other'}`;
    
    // Determine sender name and details
    let sender;
    let senderRoleBadge = '';
    if (isSentByMe) {
      // Use the current user object
      sender = user;
      if (user.role === 'freelancer') {
        senderRoleBadge = 'bg-info text-white';
      } else if (user.role === 'employer') {
        senderRoleBadge = 'bg-primary text-white';
      }
    } else {
      // Try to find the participant who sent this message
      const senderParticipant = selectedChat.participants.find(p => {
        if (!p || !p.user) return false;
        
        const participantIdStr = typeof p.user === 'object' 
          ? String(p.user._id || '')
          : String(p.user || '');
        
        return participantIdStr === senderIdStr;
      });
      
      sender = senderParticipant?.user || 
               (typeof msg.sender === 'object' ? msg.sender : { firstName: 'User', lastName: '' });
      
      // Determine sender role badge based on their role
      if (sender.role === 'freelancer') {
        senderRoleBadge = 'bg-info text-white';
      } else if (sender.role === 'employer') {
        senderRoleBadge = 'bg-primary text-white';
      } else if (sender.userType) {
        senderRoleBadge = 'bg-secondary text-white';
      }
    }
    
    if (!sender) {
      console.error("Could not identify message sender:", senderIdStr);
      return null;
    }
    
    // Get sender role for display
    const senderRole = sender.role === 'freelancer' ? 'Freelancer' : 
                      sender.role === 'employer' ? 'Employer' : 
                      sender.userType ? sender.userType.charAt(0).toUpperCase() + sender.userType.slice(1) : '';
    
    // Group messages for UI display
    const isFirstInGroup = index === 0 || 
      String(messages[index - 1].sender?._id || messages[index - 1].sender || '') !== 
      String(msg.sender?._id || msg.sender || '');
      
    const isLastInGroup = index === messages.length - 1 || 
      String(messages[index + 1].sender?._id || messages[index + 1].sender || '') !== 
      String(msg.sender?._id || msg.sender || '');
    
    // Format time and read status
    const timeDisplay = formatTime(msg.timestamp);
    const isRead = msg.read;
    const readTime = msg.readAt ? new Date(msg.readAt).toLocaleString() : '';
    
    // Style for message bubbles - different for sender vs receiver
    const bubbleStyle = isSentByMe 
      ? {
          backgroundColor: '#28a745', // Green for sender messages
          color: 'white',
          borderTopLeftRadius: '1rem',
          borderTopRightRadius: !isFirstInGroup ? '0.5rem' : '1rem',
          borderBottomLeftRadius: '1rem',
          borderBottomRightRadius: !isLastInGroup ? '0.5rem' : '1rem',
          marginLeft: 'auto', // Push to right side
          marginRight: '0.5rem'
        }
      : {
          backgroundColor: '#f0f2f5', // Light gray for received messages
          color: 'black',
          borderTopLeftRadius: !isFirstInGroup ? '0.5rem' : '1rem',
          borderTopRightRadius: '1rem',
          borderBottomLeftRadius: !isLastInGroup ? '0.5rem' : '1rem',
          borderBottomRightRadius: '1rem',
          marginRight: 'auto', // Push to left side
          marginLeft: '0.5rem'
        };
    
    return (
      <div
        key={messageKey}
        className={`d-flex mb-1 ${isSentByMe ? 'justify-content-end' : 'justify-content-start'}`}
      >
        {!isSentByMe && isLastInGroup && (
          <img
            src={getAvatarUrl(sender)}
            alt={`${sender.firstName || 'User'} ${sender.lastName || ''}`}
            className="rounded-circle me-2 align-self-end"
            style={{ width: '32px', height: '32px' }}
          />
        )}
        {!isSentByMe && !isLastInGroup && <div style={{ width: '32px' }} className="me-2"></div>}
        
        <div className="d-flex flex-column" style={{ maxWidth: '70%' }}>
          {isFirstInGroup && (
            <div className={`mb-1 ${isSentByMe ? 'text-end' : 'text-start'}`}>
              <small className="text-muted">
                {isSentByMe ? 'You' : `${sender.firstName || 'User'} ${sender.lastName || ''}`}
              </small>
              {!isSentByMe && senderRoleBadge && (
                <span className={`ms-1 badge ${senderRoleBadge}`} style={{ fontSize: '0.7rem' }}>
                  {senderRole}
                </span>
              )}
            </div>
          )}
          <div
            className="p-2 mb-1 rounded-3"
            style={bubbleStyle}
          >
            <p className="mb-1">{msg.content}</p>
            <div className="d-flex align-items-center justify-content-end" style={{ fontSize: '0.7rem' }}>
              <small className={isSentByMe ? 'text-white-50' : 'text-muted'}>
                {timeDisplay}
              </small>
              {isSentByMe && (
                <span className="ms-1" title={isRead ? `Read at ${readTime}` : 'Delivered'}>
                  {isRead ? (
                    <CheckCheck size={12} className="text-white-50" />
                  ) : (
                    <Check size={12} className="text-white-50" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {isSentByMe && isLastInGroup && (
          <img
            src={getAvatarUrl(sender)}
            alt={`${sender.firstName || 'User'} ${sender.lastName || ''}`}
            className="rounded-circle ms-2 align-self-end"
            style={{ width: '32px', height: '32px' }}
          />
        )}
        {isSentByMe && !isLastInGroup && <div style={{ width: '32px' }} className="ms-2"></div>}
      </div>
    );
  };

  // Helper to get the other participant based on current user's role
  const getOtherParticipant = () => {
    if (!selectedChat || !selectedChat.participants || !Array.isArray(selectedChat.participants)) {
      console.error("Invalid chat or missing participants");
      return null;
    }

    const currentUserIdStr = String(user?._id || '');
    const currentUserRole = user?.role || user?.userType || '';

    console.log("Current user role:", currentUserRole);
    console.log("Chat participants:", selectedChat.participants.map(p => 
      typeof p.user === 'object' ? `${p.user._id} (${p.user.firstName}, ${p.user.role})` : p.user
    ));

    // If employer, show freelancer
    if (currentUserRole === 'employer') {
      const freelancer = selectedChat.participants.find(
        p => p?.user && p.user.role === 'freelancer'
      );
      console.log("Found freelancer participant:", freelancer);
      return freelancer;
    }

    // If freelancer, show employer
    if (currentUserRole === 'freelancer') {
      const employer = selectedChat.participants.find(
        p => p?.user && p.user.role === 'employer'
      );
      console.log("Found employer participant:", employer);
      return employer;
    }

    // Fallback to "not me"
    const otherParticipant = selectedChat.participants.find(p => {
      const participantIdStr = typeof p.user === 'object'
        ? String(p.user._id || '')
        : String(p.user || '');
      return participantIdStr !== currentUserIdStr;
    });
    console.log("Fallback participant found:", otherParticipant);
    return otherParticipant;
  };

  // Render chat header
  const renderChatHeader = () => {
    if (!selectedChat || !selectedChat.participants || !Array.isArray(selectedChat.participants)) {
      console.error("Invalid selected chat or missing participants:", selectedChat);
      return null;
    }
    
    // Get the other participant based on current user's role
    const otherParticipant = getOtherParticipant();
    
    if (!otherParticipant || !otherParticipant.user) {
      console.error("Could not identify other participant in chat header:", selectedChat._id);
      console.log("Current user:", user);
      console.log("All participants:", selectedChat.participants);
      return null;
    }
    
    // Make sure user has name properties
    if (!otherParticipant.user.firstName) {
      console.warn("Other participant missing name information:", otherParticipant);
    }
    
    // Determine user type and role for display
    let userType = 'User';
    let roleBadge = '';
    
    if (otherParticipant.user.role === 'freelancer') {
      userType = 'Freelancer';
      roleBadge = 'bg-info text-white';
    } else if (otherParticipant.user.role === 'employer') {
      userType = 'Employer';
      roleBadge = 'bg-primary text-white';
    } else if (otherParticipant.user.userType) {
      userType = otherParticipant.user.userType.charAt(0).toUpperCase() + otherParticipant.user.userType.slice(1);
    }
    
    // Get participant role in this conversation
    const participantRole = otherParticipant.role === 'initiator' ? 'Started the conversation' : 'Recipient';
    
    return (
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex align-items-center">
          <img
            src={getAvatarUrl(otherParticipant.user)}
            alt={`${otherParticipant.user.firstName || 'User'} ${otherParticipant.user.lastName || ''}`}
            className="rounded-circle me-3"
            style={{ width: '40px', height: '40px' }}
          />
          <div>
            <div className="d-flex align-items-center">
              <h5 className="mb-0">
                {otherParticipant.user.firstName || 'User'} {otherParticipant.user.lastName || ''}
              </h5>
              <span className={`ms-2 badge ${roleBadge}`}>{userType}</span>
            </div>
            <small className="text-muted">
              {participantRole}
            </small>
          </div>
        </div>
      </Card.Header>
    );
  };

  // Helper to determine if a participant is the current user
  const isCurrentUser = (participant) => {
    if (!participant || !participant.user || !user) return false;
    
    const participantId = typeof participant.user._id === 'string' 
      ? participant.user._id 
      : String(participant.user._id || '');
      
    const currentUserId = typeof user._id === 'string' 
      ? user._id 
      : String(user._id || '');
    
    return participantId === currentUserId;
  };

  return (
    <Container fluid className={isDashboard ? 'p-0 h-100' : 'py-4'}>
      <Row className={isDashboard ? 'h-100 m-0' : 'h-[calc(100vh-8rem)]'}>
        {/* Chat List */}
        <Col md={4} className="h-100 p-0">
          <Card className="h-100 border-0">
            <Card.Header className="bg-white border-bottom">
              <h4 className="mb-0">Messages</h4>
              <small className="text-muted d-block">Your conversations</small>
            </Card.Header>
            <div 
              className="overflow-y-auto" 
              style={{ height: 'calc(100% - 56px)' }}
              ref={chatListRef}
            >
              {loading ? (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : chats.length === 0 ? (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <p className="text-muted">No conversations yet</p>
                </div>
              ) : (
                chats.map(chat => renderChatListItem(chat))
              )}
            </div>
          </Card>
        </Col>

        {/* Chat Messages */}
        <Col md={8} className="h-100 p-0">
          {selectedChat ? (
            <Card className="h-100 border-0">
              {renderChatHeader()}
              <div className="overflow-y-auto p-3" style={{ height: 'calc(100% - 120px)' }}>
                {selectedChat.messages && selectedChat.messages.length > 0 ? (
                  selectedChat.messages.map((msg, index) => 
                    renderMessageBubble(msg, index, selectedChat.messages)
                  )
                ) : (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <p className="text-muted">No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <Card.Footer className="bg-white border-top">
                <Form onSubmit={handleSendMessage} className="d-flex">
                  <div className="d-flex align-items-center w-100">
                    <Form.Control
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Type a message...`}
                      className="flex-grow-1 me-2"
                      disabled={sendingMessage}
                      ref={messageInputRef}
                    />
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={!message.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <Spinner 
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        />
                      ) : (
                        <Send size={20} />
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Footer>
            </Card>
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center">
                <h4>Select a chat to start messaging</h4>
                <p className="text-muted">Or start a new conversation</p>
              </div>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default Chat;