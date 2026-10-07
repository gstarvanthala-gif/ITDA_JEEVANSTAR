import {
  deleteMessage as remove,
  getConversation,
  markMessageRead,
  sendMessage,
} from '../services/messageService.js';

export const getMessages = async (req, res, next) => {
  try {
    const conversation = await getConversation(req.user._id, req.params.userId);
    return res.json({ success: true, ...conversation });
  } catch (error) {
    return next(error);
  }
};

export const postMessage = async (req, res, next) => {
  try {
    const message = await sendMessage(req.user._id, req.body.receiverId, req.body.message);
    return res.status(201).json({ success: true, message });
  } catch (error) {
    return next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const message = await markMessageRead(req.user._id, req.params.id);
    return res.json({ success: true, message });
  } catch (error) {
    return next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const result = await remove(req.user._id, req.params.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};