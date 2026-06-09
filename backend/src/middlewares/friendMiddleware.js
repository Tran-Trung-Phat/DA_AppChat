import Friend from "../models/Friend.js";
import Conversation from "../models/Conversation.js";

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export const checkFriendship = async (req, res, next) => {
  try {
    const me = req.user._id.toString();
    const recipientId = req.body?.recipientId ?? req.body?.memberIds?.[0] ?? null;

    if (!recipientId) {
      return res.status(400).json({ message: "Can cung cap recipientId" });
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

    const conversation = await Conversation.findById(conversationId);

    if(!conversation) {
      return res.status(404).json({message:"Không tìm thấy cuộc trò chuyện"});
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
