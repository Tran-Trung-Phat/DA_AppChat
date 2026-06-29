import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Friend from "../models/Friend.js";
import User from "../models/user.js";
import {
  emitToConversationParticipants,
  getIO,
  userRoom,
} from "../libs/socket.js";

const USER_SELECT = "username displayName avatarUrl";

const conversationPopulate = [
  { path: "participants.userId", select: USER_SELECT },
  { path: "seenBy", select: USER_SELECT },
  { path: "lastMessage.senderId", select: USER_SELECT },
];

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

export const createConversation = async (req, res) => {
  try {
    const { type, name, memberIds } = req.body;
    const userId = req.user._id;
    const uniqueMemberIds = [
      ...new Set((memberIds || []).map((id) => id.toString())),
    ].filter((id) => id !== userId.toString());

    if (
      !type ||
      !["direct", "group"].includes(type) ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      (type === "group" && !String(name || "").trim())
    ) {
      return res.status(400).json({
        message: "Type va danh sach thanh vien la bat buoc",
      });
    }

    let conversation;

    if (type === "direct") {
      const participantId = uniqueMemberIds[0];

      if (!participantId || uniqueMemberIds.length !== 1) {
        return res.status(400).json({
          message: "Cuoc tro chuyen truc tiep chi can mot thanh vien khac",
        });
      }

      conversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [userId, participantId] },
        participants: { $size: 2 },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: "direct",
          participants: [{ userId }, { userId: participantId }],
          lastMessageAt: new Date(),
          seenBy: [userId],
          unreadCounts: {
            [userId.toString()]: 0,
            [participantId.toString()]: 0,
          },
        });
      }
    }

    if (type === "group") {
      if (uniqueMemberIds.length === 0) {
        return res.status(400).json({
          message: "Nhom can it nhat mot thanh vien khac",
        });
      }

      conversation = await Conversation.create({
        type: "group",
        participants: [{ userId }, ...uniqueMemberIds.map((id) => ({ userId: id }))],
        group: {
          name: name.trim(),
          createdBy: userId,
        },
        lastMessageAt: new Date(),
        seenBy: [userId],
      });
    }

    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    emitToConversationParticipants(conversation, "conversation:changed", {
      conversation: formatted,
    });

    return res.status(201).json({ conversation: formatted });
  } catch (error) {
    console.error("Loi khi tao conversation", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({
      "participants.userId": userId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate(conversationPopulate);

    return res.status(200).json({
      conversations: conversations.map(formatConversation),
    });
  } catch (error) {
    console.error("Loi xay ra khi lay conversation", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, cursor } = req.query;
    const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);

    const query = { conversationId };

    if (cursor) {
      const cursorDate = new Date(cursor);

      if (Number.isNaN(cursorDate.getTime())) {
        return res.status(400).json({ message: "Cursor khong hop le" });
      }

      query.createdAt = { $lt: cursorDate };
    }

    let messages = await Message.find(query)
      .populate("senderId", USER_SELECT)
      .populate({
        path: "replyTo",
        populate: { path: "senderId", select: USER_SELECT },
      })
      .populate("reactions.userId", USER_SELECT)
      .sort({ createdAt: -1 })
      .limit(pageSize + 1);

    let nextCursor = null;

    if (messages.length > pageSize) {
      const nextMessage = messages[messages.length - 1];
      nextCursor = nextMessage.createdAt.toISOString();
      messages.pop();
    }

    messages = messages.reverse();

    return res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("Loi xay ra khi lay messages", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const conversation = req.conversation;

    if (!conversation.unreadCounts) {
      conversation.unreadCounts = new Map();
    }

    conversation.unreadCounts.set(userId, 0);
    conversation.seenBy = [
      ...new Set([...(conversation.seenBy || []).map((id) => id.toString()), userId]),
    ];

    await conversation.save();
    await conversation.populate(conversationPopulate);

    const formatted = formatConversation(conversation);

    emitToConversationParticipants(conversation, "conversation:changed", {
      conversation: formatted,
    });

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Loi khi danh dau da doc conversation", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

const isGroupOwner = (conversation, userId) =>
  conversation.group?.createdBy?.toString() === userId.toString();

const assertManageableGroup = (conversation, userId, res) => {
  if (conversation.type !== "group") {
    res.status(400).json({ message: "Day khong phai nhom chat" });
    return false;
  }

  if (conversation.status === "deleted") {
    res.status(404).json({ message: "Nhom chat khong con ton tai" });
    return false;
  }

  if (!isGroupOwner(conversation, userId)) {
    res.status(403).json({ message: "Chi truong nhom moi co quyen thuc hien thao tac nay" });
    return false;
  }

  return true;
};

const emitConversationRemoved = (userId, conversationId) => {
  const io = getIO();
  if (!io || !userId) return;

  io.to(userRoom(userId.toString())).emit("conversation:removed", {
    conversationId: conversationId.toString(),
  });
};

const populateAndFormat = async (conversation) => {
  await conversation.populate(conversationPopulate);
  return formatConversation(conversation);
};

const emitGroupChanged = async (conversation) => {
  const formatted = await populateAndFormat(conversation);
  emitToConversationParticipants(conversation, "conversation:changed", {
    conversation: formatted,
  });
  return formatted;
};

export const updateGroupInfo = async (req, res) => {
  try {
    const conversation = req.conversation;
    const userId = req.user._id;

    if (!assertManageableGroup(conversation, userId, res)) return;

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Ten nhom khong duoc de trong" });
    }

    conversation.group = {
      ...(conversation.group?.toObject?.() ?? conversation.group ?? {}),
      name: name.slice(0, 80),
      createdBy: conversation.group.createdBy,
    };

    await conversation.save();
    const formatted = await emitGroupChanged(conversation);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Loi khi cap nhat thong tin nhom", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const addGroupMembers = async (req, res) => {
  try {
    const conversation = req.conversation;
    const userId = req.user._id.toString();

    if (!assertManageableGroup(conversation, userId, res)) return;
    if (conversation.status === "locked") {
      return res.status(403).json({ message: "Nhom chat dang bi khoa" });
    }

    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    const existingIds = new Set(
      conversation.participants.map((participant) => participant.userId.toString())
    );
    const newMemberIds = [
      ...new Set(memberIds.map((id) => String(id)).filter((id) => id !== userId)),
    ].filter((id) => mongoose.isValidObjectId(id) && !existingIds.has(id));

    if (newMemberIds.length === 0) {
      return res.status(400).json({ message: "Can chon thanh vien moi" });
    }

    const existingUsers = await User.countDocuments({ _id: { $in: newMemberIds } });
    if (existingUsers !== newMemberIds.length) {
      return res.status(404).json({ message: "Mot so nguoi dung khong ton tai" });
    }

    const friendshipChecks = await Promise.all(
      newMemberIds.map((memberId) => {
        const [userA, userB] = pair(userId, memberId);
        return Friend.exists({ userA, userB });
      })
    );

    if (friendshipChecks.some((isFriend) => !isFriend)) {
      return res.status(403).json({ message: "Chi co the them ban be vao nhom" });
    }

    conversation.participants.push(
      ...newMemberIds.map((id) => ({ userId: id, joinedAt: new Date() }))
    );

    if (!conversation.unreadCounts) conversation.unreadCounts = new Map();
    newMemberIds.forEach((id) => conversation.unreadCounts.set(id, 0));

    await conversation.save();
    const formatted = await emitGroupChanged(conversation);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Loi khi them thanh vien nhom", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const conversation = req.conversation;
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    if (!assertManageableGroup(conversation, userId, res)) return;

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: "userId khong hop le" });
    }

    if (targetUserId === userId.toString()) {
      return res.status(400).json({ message: "Hay dung chuc nang roi nhom" });
    }

    const beforeCount = conversation.participants.length;
    conversation.participants = conversation.participants.filter(
      (participant) => participant.userId.toString() !== targetUserId
    );

    if (conversation.participants.length === beforeCount) {
      return res.status(404).json({ message: "Thanh vien khong nam trong nhom" });
    }

    conversation.unreadCounts?.delete?.(targetUserId);
    conversation.seenBy = (conversation.seenBy || []).filter(
      (id) => id.toString() !== targetUserId
    );

    await conversation.save();
    emitConversationRemoved(targetUserId, conversation._id);
    const formatted = await emitGroupChanged(conversation);

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Loi khi xoa thanh vien nhom", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const conversation = req.conversation;
    const userId = req.user._id.toString();

    if (conversation.type !== "group") {
      return res.status(400).json({ message: "Day khong phai nhom chat" });
    }

    if (conversation.status === "deleted") {
      return res.status(404).json({ message: "Nhom chat khong con ton tai" });
    }

    const remainingParticipants = conversation.participants.filter(
      (participant) => participant.userId.toString() !== userId
    );

    if (remainingParticipants.length === conversation.participants.length) {
      return res.status(404).json({ message: "Ban khong thuoc nhom nay" });
    }

    conversation.participants = remainingParticipants;
    conversation.unreadCounts?.delete?.(userId);
    conversation.seenBy = (conversation.seenBy || []).filter(
      (id) => id.toString() !== userId
    );

    if (remainingParticipants.length === 0) {
      conversation.status = "deleted";
    } else if (conversation.group?.createdBy?.toString() === userId) {
      conversation.group.createdBy = remainingParticipants[0].userId;
    }

    await conversation.save();
    emitConversationRemoved(userId, conversation._id);

    const formatted =
      remainingParticipants.length > 0 ? await emitGroupChanged(conversation) : null;

    return res.status(200).json({ conversation: formatted });
  } catch (error) {
    console.error("Loi khi roi nhom", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};
