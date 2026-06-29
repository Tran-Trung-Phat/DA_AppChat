import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { emitToConversationParticipants } from "../libs/socket.js";
import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

const USER_SELECT = "username displayName avatarUrl";
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const LOCATION_MESSAGE_CONTENT = "Da gui mot vi tri";

const conversationPopulate = [
  { path: "participants.userId", select: USER_SELECT },
  { path: "seenBy", select: USER_SELECT },
  { path: "lastMessage.senderId", select: USER_SELECT },
];

const populateMessage = (message) =>
  message.populate([
    { path: "senderId", select: USER_SELECT },
    {
      path: "replyTo",
      populate: { path: "senderId", select: USER_SELECT },
    },
    { path: "reactions.userId", select: USER_SELECT },
  ]);

const mapToObject = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
};

const formatConversation = (conversation) => {
  const plain = conversation.toObject();
  const participants = (conversation.participants || []).map((p) => ({
    _id: p.userId?._id,
    username: p.userId?.username,
    displayName: p.userId?.displayName,
    avatarUrl: p.userId?.avatarUrl ?? null,
    joinedAt: p.joinedAt,
  }));

  return {
    ...plain,
    unreadCounts: mapToObject(conversation.unreadCounts),
    participants,
  };
};

const isConversationMember = (conversation, userId) =>
  conversation.participants.some((p) => p.userId.toString() === userId.toString());

const attachmentFromFile = (req, file) => ({
  url: `${req.protocol}://${req.get("host")}/uploads/messages/${file.filename}`,
  filename: file.filename,
  originalName: file.originalname,
  mimeType: file.mimetype,
  size: file.size,
  kind: file.mimetype.startsWith("image/") ? "image" : "file",
});

const reverseGeocode = async (latitude, longitude) => {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: latitude.toString(),
    lon: longitude.toString(),
    "accept-language": "vi",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": "MojiChat/1.0",
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      country: address.country,
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.state,
      district:
        address.city_district ||
        address.suburb ||
        address.county ||
        address.district,
      ward:
        address.quarter ||
        address.neighbourhood ||
        address.borough,
      road: address.road || address.pedestrian,
      displayName: data.display_name,
    };
  } catch (error) {
    console.error("Khong the reverse geocode vi tri:", error.message);
    return {};
  } finally {
    clearTimeout(timeout);
  }
};

const buildLocation = async (body) => {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    address: await reverseGeocode(latitude, longitude),
    mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
  };
};

const emitConversationChanged = async (conversation) => {
  await conversation.populate(conversationPopulate);
  emitToConversationParticipants(conversation, "conversation:changed", {
    conversation: formatConversation(conversation),
  });
};

const createMessage = async ({ req, res, conversation, content, senderId }) => {
  const text = String(content || "").trim();
  const attachments = (req.files || []).map((file) => attachmentFromFile(req, file));
  const type = req.body?.type === "location" ? "location" : "text";
  const location = type === "location" ? await buildLocation(req.body) : undefined;

  if (type === "location" && !location) {
    return res.status(400).json({ message: "Toa do vi tri khong hop le" });
  }

  if (type === "text" && !text && attachments.length === 0) {
    return res.status(400).json({ message: "Can co noi dung hoac tep dinh kem" });
  }

  const replyTo = req.body?.replyTo && mongoose.isValidObjectId(req.body.replyTo)
    ? req.body.replyTo
    : undefined;

  const message = await Message.create({
    conversationId: conversation._id,
    senderId,
    type,
    content: type === "location" ? LOCATION_MESSAGE_CONTENT : text,
    attachments,
    imgUrl: attachments.find((item) => item.kind === "image")?.url,
    location,
    replyTo: replyTo || null,
  });

  updateConversationAfterCreateMessage(conversation, message, senderId);
  await conversation.save();
  await populateMessage(message);

  emitToConversationParticipants(conversation, "message:new", {
    conversationId: conversation._id.toString(),
    message,
  });
  await emitConversationChanged(conversation);

  return res.status(201).json({ message });
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
    const senderId = req.user._id;
    let conversation = req.conversation;

    if (conversationId && !mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "conversationId khong hop le" });
    }

    if (conversation && conversation.type !== "direct") {
      return res.status(400).json({ message: "Day khong phai cuoc tro chuyen truc tiep" });
    }

    if (!conversationId) {
      if (!mongoose.isValidObjectId(recipientId)) {
        return res.status(400).json({ message: "ID nguoi nhan khong hop le" });
      }

      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [senderId, recipientId] },
        participants: { $size: 2 },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: "direct",
          participants: [
            { userId: senderId, joinedAt: new Date() },
            { userId: recipientId, joinedAt: new Date() },
          ],
          lastMessageAt: new Date(),
          seenBy: [senderId],
          unreadCounts: {
            [senderId.toString()]: 0,
            [recipientId.toString()]: 0,
          },
        });
      }
    }

    return createMessage({ req, res, conversation, content, senderId });
  } catch (error) {
    console.error("Loi khi gui tin nhan truc tiep", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Day khong phai nhom chat" });
    }

    return createMessage({ req, res, conversation, content, senderId });
  } catch (error) {
    console.error("Loi xay ra khi gui tin nhan nhom", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const senderId = req.user._id;
    const content = String(req.body?.content || "").trim();

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "messageId khong hop le" });
    }

    if (!content) {
      return res.status(400).json({ message: "Noi dung khong duoc de trong" });
    }

    const message = await Message.findById(messageId);

    if (!message || message.deletedAt) {
      return res.status(404).json({ message: "Khong tim thay tin nhan" });
    }

    if (message.type === "location") {
      return res.status(400).json({ message: "Khong the sua tin nhan vi tri" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ message: "Ban chi co the sua tin nhan cua minh" });
    }

    if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
      return res.status(400).json({ message: "Da qua thoi gian cho phep chinh sua" });
    }

    const conversation = await Conversation.findById(message.conversationId);

    if (!conversation || !isConversationMember(conversation, senderId)) {
      return res.status(403).json({ message: "Ban khong thuoc cuoc tro chuyen nay" });
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();
    await populateMessage(message);

    if (conversation.lastMessage?._id?.toString() === message._id.toString()) {
      conversation.lastMessage.content = content;
      await conversation.save();
      await emitConversationChanged(conversation);
    }

    emitToConversationParticipants(conversation, "message:updated", {
      conversationId: conversation._id.toString(),
      message,
    });

    return res.status(200).json({ message });
  } catch (error) {
    console.error("Loi khi sua tin nhan", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const revokeMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const senderId = req.user._id;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "messageId khong hop le" });
    }

    const message = await Message.findById(messageId);

    if (!message || message.deletedAt) {
      return res.status(404).json({ message: "Khong tim thay tin nhan" });
    }

    if (message.senderId.toString() !== senderId.toString()) {
      return res.status(403).json({ message: "Ban chi co the thu hoi tin nhan cua minh" });
    }

    const conversation = await Conversation.findById(message.conversationId);

    if (!conversation || !isConversationMember(conversation, senderId)) {
      return res.status(403).json({ message: "Ban khong thuoc cuoc tro chuyen nay" });
    }

    message.content = "";
    message.imgUrl = undefined;
    message.attachments = [];
    message.location = undefined;
    message.deletedAt = new Date();
    message.deletedBy = senderId;
    await message.save();
    await populateMessage(message);

    if (conversation.lastMessage?._id?.toString() === message._id.toString()) {
      conversation.lastMessage.content = "Tin nhan da duoc thu hoi";
      await conversation.save();
      await emitConversationChanged(conversation);
    }

    emitToConversationParticipants(conversation, "message:deleted", {
      conversationId: conversation._id.toString(),
      message,
    });

    return res.status(200).json({ message });
  } catch (error) {
    console.error("Loi khi thu hoi tin nhan", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { conversationId, q } = req.query;
    const userId = req.user._id;
    const text = String(q || "").trim();

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "conversationId khong hop le" });
    }

    if (text.length < 2) {
      return res.status(200).json({ messages: [] });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !isConversationMember(conversation, userId)) {
      return res.status(403).json({ message: "Ban khong thuoc cuoc tro chuyen nay" });
    }

    const safeQuery = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const messages = await Message.find({
      conversationId,
      deletedAt: null,
      content: { $regex: safeQuery, $options: "i" },
    })
      .populate("senderId", USER_SELECT)
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: USER_SELECT },
      })
      .populate("reactions.userId", USER_SELECT)
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Loi khi tim tin nhan", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const reactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "messageId khong hop le" });
    }

    if (!emoji || !String(emoji).trim()) {
      return res.status(400).json({ message: "Emoji khong duoc de trong" });
    }

    const message = await Message.findById(messageId);
    if (!message || message.deletedAt) {
      return res.status(404).json({ message: "Khong tim thay tin nhan" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !isConversationMember(conversation, userId)) {
      return res.status(403).json({ message: "Ban khong thuoc cuoc tro chuyen nay" });
    }

    // Toggle/update reaction logic
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingIndex > -1) {
      const existingReaction = message.reactions[existingIndex];
      if (existingReaction.emoji === emoji) {
        // Remove reaction
        message.reactions.splice(existingIndex, 1);
      } else {
        // Update reaction emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    await populateMessage(message);

    // Emit socket event to participants
    emitToConversationParticipants(conversation, "message:updated", {
      conversationId: conversation._id.toString(),
      message,
    });

    return res.status(200).json({ message });
  } catch (error) {
    console.error("Loi khi tha cam xuc tin nhan", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

