import {
  countUnreadNotifications,
  deleteNotification as remove,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js';

export const getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(req.user._id),
      countUnreadNotifications(req.user._id),
    ]);
    return res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.user._id, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.json({
      success: true,
      notification,
      unreadCount: await countUnreadNotifications(req.user._id),
    });
  } catch (error) {
    return next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const modifiedCount = await markAllNotificationsRead(req.user._id);
    return res.json({ success: true, modifiedCount, unreadCount: 0 });
  } catch (error) {
    return next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await remove(req.user._id, req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.json({
      success: true,
      message: 'Notification deleted',
      unreadCount: await countUnreadNotifications(req.user._id),
    });
  } catch (error) {
    return next(error);
  }
};