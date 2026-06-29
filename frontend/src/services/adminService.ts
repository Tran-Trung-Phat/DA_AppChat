import api from "@/lib/axios";
import type { User } from "@/types/user";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  adminUsers: number;
  totalConversations: number;
  totalMessages: number;
  onlineUsers: number;
  activeGroups: number;
  unresolvedReports: number;
  userTrend: Array<{ label: string; value: number }>;
  messageTrend: Array<{ label: string; value: number }>;
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const adminService = {
  getStats: async () => {
    const res = await api.get<{ stats: AdminStats }>("/admin/stats");
    return res.data.stats;
  },

  getUsers: async (
    page = 1,
    query = "",
    filters: { status?: string; role?: string } = {}
  ) => {
    const res = await api.get<{
      users: User[];
      pagination: AdminPagination;
    }>("/admin/users", {
      params: { page, q: query, limit: 20, ...filters },
    });
    return res.data;
  },

  updateUser: async (
    userId: string,
    data: Partial<Pick<User, "role" | "adminRole" | "isActive">> & {
      reason?: string;
    }
  ) => {
    const res = await api.patch<{ user: User }>(
      `/admin/users/${userId}`,
      data
    );
    return res.data.user;
  },

  getUserDetail: async (userId: string) => {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },

  getMessages: async (page = 1, query = "") => {
    const res = await api.get("/admin/messages", { params: { page, q: query } });
    return res.data;
  },

  deleteMessage: async (messageId: string, reason: string) => {
    const res = await api.delete(`/admin/messages/${messageId}`, {
      data: { reason },
    });
    return res.data.message;
  },

  getGroups: async () => {
    const res = await api.get("/admin/groups");
    return res.data.groups;
  },

  updateGroup: async (groupId: string, status: string, reason = "") => {
    const res = await api.patch(`/admin/groups/${groupId}`, { status, reason });
    return res.data.group;
  },

  getReports: async (filters: { status?: string; type?: string } = {}) => {
    const res = await api.get("/admin/reports", { params: filters });
    return res.data.reports;
  },

  updateReport: async (
    reportId: string,
    data: { status: string; internalNote?: string; resolution?: string }
  ) => {
    const res = await api.patch(`/admin/reports/${reportId}`, data);
    return res.data.report;
  },

  getNotifications: async () => {
    const res = await api.get("/admin/notifications");
    return res.data.notifications;
  },

  createNotification: async (data: {
    title: string;
    content: string;
    link?: string;
    audience: string;
    scheduledAt?: string;
  }) => {
    const res = await api.post("/admin/notifications", data);
    return res.data.notification;
  },

  getMedia: async () => {
    const res = await api.get("/admin/media");
    return res.data;
  },

  getAudits: async () => {
    const res = await api.get("/admin/audits");
    return res.data.audits;
  },
};
