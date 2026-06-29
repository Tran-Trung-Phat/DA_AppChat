import Friend from "../models/Friend.js";
import Conversation from "../models/Conversation.js";
import mongoose from "mongoose";

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export const checkConversationMembership = async (req, res, next) => {
  try {
    const conversationId = req.params?.conversationId ?? req.body?.conversationId;
    const userId = req.user._id.toString();

    if (!conversationId) {
      return res.status(400).json({ message: "Can cung cap conversationId" });
    }

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "conversationId khong hop le" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Khong tim thay cuoc tro chuyen" });
    }

    const isMember = conversation.participants.some(
      (p) => p.userId.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ message: "Ban khong thuoc cuoc tro chuyen nay" });
    }

    req.conversation = conversation;
    return next();
  } catch (error) {
    console.error("Loi checkConversationMembership:", error);
    return res.status(500).json({ message: "Loi server" });
  }
};

export const checkFriendship = async (req, res, next) => {
  try {
    const me = req.user._id.toString();
    const conversationId = req.body?.conversationId;
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : null;
    const recipientId = req.body?.recipientId ?? memberIds?.[0] ?? null;

    if (conversationId) {
      return checkConversationMembership(req, res, next);
    }

    if (!recipientId) {
      return res.status(400).json({ message: "Can cung cap recipientId" });
    }

    if (memberIds) {
      const uniqueMemberIds = [
        ...new Set(memberIds.map((id) => id.toString())),
      ].filter((id) => id !== me);

      if (uniqueMemberIds.length === 0) {
        return res.status(400).json({ message: "Can cung cap thanh vien khac" });
      }

      const friendshipChecks = await Promise.all(
        uniqueMemberIds.map((memberId) => {
          const [userA, userB] = pair(me, memberId);
          return Friend.exists({ userA, userB });
        })
      );

      if (friendshipChecks.some((isFriend) => !isFriend)) {
        return res.status(403).json({
          message: "Tat ca thanh vien phai la ban be cua ban",
        });
      }

      return next();
    }

    const [userA, userB] = pair(me, recipientId);
    const isFriend = await Friend.findOne({ userA, userB });

    if (!isFriend) {
      return res.status(403).json({ message: "Ban chua ket ban voi nguoi nay" });
    }

    return next();
  } catch (error) {
    console.error("Loi xay ra khi checkFriendship:", error);
    return res.status(500).json({ message: "Loi server" });
  }
};

export const checkGroupMembership =async (req, res, next) => {
  try {
    const {conversationId} = req.body;
    const userId = req.user._id;

    if(!mongoose.isValidObjectId(conversationId)){
      return res.status(400).json({message:"conversationId khong hop le"});
    }

    const conversation = await Conversation.findById(conversationId);

    if(!conversation) {
      return res.status(404).json({message:"Không tìm thấy cuộc trò chuyện"});
    }

    if(conversation.status === "locked") {
      return res.status(403).json({message:"Nhom chat da bi khoa boi quan tri vien"});
    }
    if(conversation.status === "deleted") {
      return res.status(404).json({message:"Nhom chat khong con ton tai"});
    }

    const isMember = conversation.participants.some((p) => p.userId.toString() === userId.toString());

    if(!isMember) {
      return res.status(403).json({message:"Bạn không tìm thấy group này"});
    }

    req.conversation = conversation;

    next();
  }catch (error) {
    console.error("Loi checkGroupMembership:", error);
    return res.status(500).json({message:"Loi server"});
  }
}
