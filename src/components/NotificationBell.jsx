import React, { useState, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/unread');
      setNotifications(response.data);
      setUnreadCount(response.data.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="link" className="nav-link position-relative">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount}
          </span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '300px' }}>
        <div className="px-3 py-2 border-bottom">
          <h6 className="mb-0">Notifications</h6>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="p-3 text-center text-muted">
              No new notifications
            </div>
          ) : (
            notifications.map(notification => (
              <Dropdown.Item
                key={notification._id}
                onClick={() => handleMarkAsRead(notification._id)}
                className={`border-bottom ${!notification.read ? 'bg-light' : ''}`}
              >
                <div className="d-flex flex-column">
                  <strong>{notification.title}</strong>
                  <small className="text-muted">{notification.message}</small>
                  <small className="text-muted">
                    {new Date(notification.createdAt).toLocaleString()}
                  </small>
                </div>
              </Dropdown.Item>
            ))
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default NotificationBell;