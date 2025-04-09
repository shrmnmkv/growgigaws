import Notification from '../models/Notification.js';

export const createNotification = async ({
  recipient,
  type,
  title,
  message,
  job,
  milestone
}) => {
  try {
    const notification = new Notification({
      recipient,
      type,
      title,
      message,
      job,
      milestone
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.recipient.equals(userId)) {
      throw new Error('Not authorized to update this notification');
    }

    notification.read = true;
    await notification.save();
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const getUnreadNotifications = async (userId) => {
  try {
    return await Notification.find({
      recipient: userId,
      read: false
    })
    .sort({ createdAt: -1 })
    .populate('job', 'title')
    .populate('milestone', 'title');
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};