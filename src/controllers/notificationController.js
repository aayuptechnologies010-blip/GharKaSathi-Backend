const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.account._id }).sort('-createdAt');
  res.json(notifications);
});

// PUT /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.account._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  res.json(notif);
});

// PUT /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.account._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndDelete({ _id: req.params.id, user: req.account._id });
  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  res.json({ message: 'Deleted' });
});

// DELETE /api/notifications
const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.account._id });
  res.json({ message: 'All notifications cleared' });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications };
