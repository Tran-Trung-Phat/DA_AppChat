import express from "express";
import {
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
  getAdminUserDetail,
  getAdminMessages,
  deleteAdminMessage,
  getAdminGroups,
  updateAdminGroup,
  getAdminReports,
  updateAdminReport,
  getAdminNotifications,
  createAdminNotification,
  getAdminMedia,
  getAdminAudits,
  getAdminStories,
  deleteAdminStory,
} from "../controllers/adminController.js";
import {
  requireAdmin,
  requireAdminPermission,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(requireAdmin);
router.get("/stats", requireAdminPermission("dashboard"), getAdminStats);
router.get("/users", requireAdminPermission("users"), getAdminUsers);
router.get("/users/:userId", requireAdminPermission("users"), getAdminUserDetail);
router.patch("/users/:userId", requireAdminPermission("users"), updateAdminUser);
router.get("/messages", requireAdminPermission("messages"), getAdminMessages);
router.delete("/messages/:messageId", requireAdminPermission("messages"), deleteAdminMessage);
router.get("/groups", requireAdminPermission("groups"), getAdminGroups);
router.patch("/groups/:groupId", requireAdminPermission("groups"), updateAdminGroup);
router.get("/reports", requireAdminPermission("reports"), getAdminReports);
router.patch("/reports/:reportId", requireAdminPermission("reports"), updateAdminReport);
router.get("/notifications", requireAdminPermission("notifications"), getAdminNotifications);
router.post("/notifications", requireAdminPermission("notifications"), createAdminNotification);
router.get("/media", requireAdminPermission("media"), getAdminMedia);
router.get("/audits", requireAdminPermission("admins"), getAdminAudits);
router.get("/stories", requireAdminPermission("stories"), getAdminStories);
router.delete("/stories/:storyId", requireAdminPermission("stories"), deleteAdminStory);

export default router;
