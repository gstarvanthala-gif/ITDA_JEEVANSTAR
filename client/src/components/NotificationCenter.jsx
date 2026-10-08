import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import ConfirmDialog from './ConfirmDialog';
import ToastMessage from './ToastMessage';
import { notificationApi } from '../services/api';

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

function NotificationCenter({ open, onOpenChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let isMounted = true;

    notificationApi.getAll()
      .then((response) => {
        if (!isMounted) return;
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Could not load notifications.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const markRead = async (notificationId) => {
    setError('');
    setWorking(true);
    try {
      const response = await notificationApi.markRead(notificationId);
      setNotifications((current) => current.map((notification) => (
        notification._id === notificationId ? response.data.notification : notification
      )));
      setUnreadCount(response.data.unreadCount);
      setNotice('Notification marked as read.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not mark notification as read.');
    } finally {
      setWorking(false);
    }
  };

  const markAllRead = async () => {
    setError('');
    setWorking(true);
    try {
      const response = await notificationApi.markAllRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
      setUnreadCount(response.data.unreadCount);
      setNotice('All notifications marked as read.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not mark notifications as read.');
    } finally {
      setWorking(false);
    }
  };

  const removeNotification = async (notificationId) => {
    setError('');
    setWorking(true);
    try {
      const response = await notificationApi.remove(notificationId);
      setNotifications((current) => current.filter((notification) => notification._id !== notificationId));
      setUnreadCount(response.data.unreadCount);
      setNotice('Notification deleted.');
      setDeleteTarget(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete notification.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="notification-center">
      <button
        className="notification-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={`Notifications, ${unreadCount} unread`}
        onClick={() => onOpenChange((current) => !current)}
      >
        <Bell size={17} aria-hidden="true" />
        <span>Notifications</span>
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-panel" id="notification-panel" aria-label="Notifications">
          <header className="notification-panel-heading">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </div>
            <button type="button" className="notification-text-button" onClick={markAllRead} disabled={unreadCount === 0 || working}>
              Mark all read
            </button>
          </header>

          {error && <p className="form-error notification-error" role="alert">{error}</p>}

          {loading ? (
            <p className="notification-empty">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="notification-empty">You’re all caught up.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li className={`notification-item ${notification.isRead ? 'read' : 'unread'}`} key={notification._id}>
                  <div className="notification-item-heading">
                    <strong>{notification.title}</strong>
                    {!notification.isRead && <span className="notification-unread-dot" aria-label="Unread" />}
                  </div>
                  <p>{notification.message}</p>
                  <time dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time>
                  <div className="notification-item-actions">
                    {!notification.isRead && (
                      <button type="button" className="notification-text-button" onClick={() => markRead(notification._id)} disabled={working}>
                        Mark read
                      </button>
                    )}
                    <button type="button" className="notification-text-button destructive" onClick={() => setDeleteTarget(notification)} disabled={working}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <ToastMessage message={notice} onDismiss={() => setNotice('')} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete notification?"
        message="This notification will be removed from your inbox."
        confirmLabel="Delete notification"
        busy={working}
        onConfirm={() => deleteTarget && removeNotification(deleteTarget._id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default NotificationCenter;