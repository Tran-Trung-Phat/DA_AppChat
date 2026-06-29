import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Session from "../models/Session.js";
import User from "../models/user.js";
import { disconnectUserSockets } from "../libs/socket.js";
import { getOnlineUserIds } from "../libs/socket.js";
import AdminAudit from "../models/AdminAudit.js";
import Friend from "../models/Friend.js";
import LoginLog from "../models/LoginLog.js";
import Report from "../models/Report.js";
import SystemNotification from "../models/SystemNotification.js";

const USER_FIELDS =
  "_id username email displayName avatarUrl bio phone role adminRole isActive banReason reportCount createdAt updatedAt";

const writeAudit = (req, action, targetType, targetId, detail = "") =>
  AdminAudit.create({
    adminId: req.user._id,
    action,
    targetType,
    targetId: targetId?.toString(),
    detail,
    ip: req.ip,
  });

export const getAdminStats = async (_req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      adminUsers,
      totalConversations,
      totalMessages,
      activeGroups,
      unresolvedReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: "admin" }),
      Conversation.countDocuments(),
      Message.countDocuments(),
      Conversation.countDocuments({ type: "group", status: { $ne: "deleted" } }),
      Report.countDocuments({ status: { $in: ["new", "reviewing"] } }),
    ]);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    const [userTrendRaw, messageTrendRaw] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $hour: "$createdAt" },
            value: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        adminUsers,
        totalConversations,
        totalMessages,
        onlineUsers: getOnlineUserIds().length,
        activeGroups,
        unresolvedReports,
        userTrend: userTrendRaw.map((item) => ({
          label: item._id,
          value: item.value,
        })),
        messageTrend: messageTrendRaw.map((item) => ({
          label: `${String(item._id).padStart(2, "0")}:00`,
          value: item.value,
        })),
      },
    });
  } catch (error) {
    console.error("Loi khi lay thong ke admin", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const queryText = String(req.query.q || "").trim();
    const filter = {};
    const status = String(req.query.status || "");
    const role = String(req.query.role || "");

    if (queryText) {
      const safeQuery = queryText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { username: { $regex: safeQuery, $options: "i" } },
        { displayName: { $regex: safeQuery, $options: "i" } },
        { email: { $regex: safeQuery, $options: "i" } },
      ];
    }
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "banned") filter.isActive = false;
    if (["user", "admin"].includes(role)) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      users: await Promise.all(
        users.map(async (user) => ({
          ...user,
          role: user.role ?? "user",
          adminRole:
            user.role === "admin" ? user.adminRole ?? "super_admin" : undefined,
          isActive: user.isActive !== false,
          messageCount: await Message.countDocuments({ senderId: user._id }),
        }))
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("Loi khi lay danh sach user admin", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, adminRole, isActive, reason = "" } = req.body;

    if (
      (role !== undefined || adminRole !== undefined) &&
      (req.user.adminRole || "super_admin") !== "super_admin"
    ) {
      return res.status(403).json({
        message: "Chi Super Admin moi co the thay doi quyen quan tri",
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Ban khong the tu thay doi quyen hoac khoa chinh minh",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Khong tim thay nguoi dung" });
    }
    if (
      user.adminRole === "super_admin" &&
      (req.user.adminRole || "super_admin") !== "super_admin"
    ) {
      return res.status(403).json({ message: "Khong the thay doi Super Admin" });
    }

    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Role khong hop le" });
      }
      user.role = role;
      if (role === "admin") {
        user.adminRole = adminRole || user.adminRole || "moderator";
      } else {
        user.adminRole = undefined;
      }
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "Trang thai khong hop le" });
      }
      user.isActive = isActive;
      user.banReason = isActive ? "" : String(reason).trim();
    }

    await user.save();

    if (user.isActive === false || role !== undefined) {
      await Session.deleteMany({ userId: user._id });
    }
    if (user.isActive === false) {
      disconnectUserSockets(user._id);
    }
    await writeAudit(
      req,
      isActive === false ? "lock_user" : isActive === true ? "unlock_user" : "update_role",
      "user",
      user._id,
      reason
    );

    const safeUser = await User.findById(user._id).select(USER_FIELDS).lean();
    return res.status(200).json({
      user: {
        ...safeUser,
        role: safeUser.role ?? "user",
        isActive: safeUser.isActive !== false,
      },
    });
  } catch (error) {
    console.error("Loi khi cap nhat user boi admin", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(USER_FIELDS).lean();
    if (!user) return res.status(404).json({ message: "Khong tim thay nguoi dung" });

    const [friendships, groups, loginLogs, reports, messageCount] =
      await Promise.all([
        Friend.find({ $or: [{ userA: user._id }, { userB: user._id }] })
          .populate("userA userB", "displayName username avatarUrl")
          .lean(),
        Conversation.find({
          type: "group",
          "participants.userId": user._id,
          status: { $ne: "deleted" },
        })
          .select("group participants status createdAt")
          .lean(),
        LoginLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
        Report.find({ targetType: "user", targetId: user._id })
          .sort({ createdAt: -1 })
          .lean(),
        Message.countDocuments({ senderId: user._id }),
      ]);

    const friends = friendships.map((item) =>
      item.userA._id.toString() === user._id.toString() ? item.userB : item.userA
    );

    return res.json({
      user: {
        ...user,
        role: user.role ?? "user",
        isActive: user.isActive !== false,
        messageCount,
      },
      friends,
      groups,
      loginLogs,
      reports,
    });
  } catch (error) {
    console.error("Loi lay chi tiet user", error);
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminMessages = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 20;
    const q = String(req.query.q || "").trim();
    const filter = {};
    if (q) filter.content = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate("senderId", "displayName username avatarUrl")
        .populate("conversationId", "type group participants")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
    ]);
    return res.json({
      messages,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const deleteAdminMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Khong tim thay tin nhan" });
    message.content = "";
    message.attachments = [];
    message.location = undefined;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();
    await writeAudit(req, "delete_message", "message", message._id, req.body.reason);
    return res.json({ message });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminGroups = async (req, res) => {
  try {
    const groups = await Conversation.find({ type: "group" })
      .populate("participants.userId", "displayName username avatarUrl")
      .populate("group.createdBy", "displayName username")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ groups });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const updateAdminGroup = async (req, res) => {
  try {
    const { status, reason = "" } = req.body;
    if (!["active", "locked", "deleted"].includes(status)) {
      return res.status(400).json({ message: "Trang thai khong hop le" });
    }
    const group = await Conversation.findOneAndUpdate(
      { _id: req.params.groupId, type: "group" },
      { status, lockedReason: status === "active" ? "" : reason },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: "Khong tim thay nhom" });
    await writeAudit(req, `${status}_group`, "group", group._id, reason);
    return res.json({ group });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminReports = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.targetType = req.query.type;
    const reports = await Report.find(filter)
      .populate("reporterId", "displayName username avatarUrl")
      .populate("handledBy", "displayName username")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ reports });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const updateAdminReport = async (req, res) => {
  try {
    const { status, internalNote, resolution } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      {
        status,
        internalNote,
        resolution,
        handledBy: req.user._id,
        handledAt: ["resolved", "rejected"].includes(status) ? new Date() : undefined,
      },
      { new: true, runValidators: true }
    );
    if (!report) return res.status(404).json({ message: "Khong tim thay report" });
    await writeAudit(req, "review_report", "report", report._id, resolution);
    return res.json({ report });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminNotifications = async (_req, res) => {
  const notifications = await SystemNotification.find()
    .populate("createdBy", "displayName username")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ notifications });
};

export const createAdminNotification = async (req, res) => {
  try {
    const { title, content, link, audience, scheduledAt } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: "Tieu de va noi dung la bat buoc" });
    }
    const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
    const notification = await SystemNotification.create({
      title,
      content,
      link,
      audience,
      scheduledAt: scheduleDate,
      status: scheduleDate && scheduleDate > new Date() ? "scheduled" : "sent",
      sentAt: !scheduleDate || scheduleDate <= new Date() ? new Date() : undefined,
      createdBy: req.user._id,
    });
    await writeAudit(req, "create_notification", "notification", notification._id, title);
    return res.status(201).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: "Loi he thong" });
  }
};

export const getAdminMedia = async (_req, res) => {
  const messages = await Message.find({ "attachments.0": { $exists: true } })
    .select("attachments senderId conversationId createdAt")
    .populate("senderId", "displayName username")
    .sort({ createdAt: -1 })
    .lean();
  const media = messages.flatMap((message) =>
    message.attachments.map((attachment) => ({
      ...attachment,
      messageId: message._id,
      sender: message.senderId,
      createdAt: message.createdAt,
    }))
  );
  return res.json({
    media,
    storage: {
      totalBytes: media.reduce((sum, item) => sum + (item.size || 0), 0),
      images: media.filter((item) => item.kind === "image").length,
      files: media.filter((item) => item.kind === "file").length,
    },
  });
};

export const getAdminAudits = async (_req, res) => {
  const audits = await AdminAudit.find()
    .populate("adminId", "displayName username avatarUrl")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return res.json({ audits });
};
