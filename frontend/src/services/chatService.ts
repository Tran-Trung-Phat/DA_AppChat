import api from "@/lib/axios";
import type { Conversation, Message } from "@/types/chat";

export const chatService = {
  getConversations: async () => {
    const res = await api.get<{ conversations: Conversation[] }>("/conversations");
    return res.data.conversations;
  },

  createDirectConversation: async (memberId: string) => {
    const res = await api.post<{ conversation: Conversation }>("/conversations", {
      type: "direct",
      memberIds: [memberId],
    });
    return res.data.conversation;
  },

  createGroupConversation: async (name: string, memberIds: string[]) => {
    const res = await api.post<{ conversation: Conversation }>("/conversations", {
      type: "group",
      name,
      memberIds,
    });
    return res.data.conversation;
  },

  getMessages: async (conversationId: string) => {
    const res = await api.get<{ messages: Message[]; nextCursor: string | null }>(
      `/conversations/${conversationId}/messages`
    );
    return res.data.messages;
  },

  markConversationRead: async (conversationId: string) => {
    const res = await api.patch<{ conversation: Conversation }>(
      `/conversations/${conversationId}/read`
    );
    return res.data.conversation;
  },

  sendDirectMessage: async (
    conversationId: string,
    content: string,
    attachments: File[] = [],
    replyTo?: string
  ) => {
    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("content", content);
      if (replyTo) {
        formData.append("replyTo", replyTo);
      }
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await api.post<{ message: Message }>("/messages/direct", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.message;
    }

    const res = await api.post<{ data?: Message; message?: Message | string }>(
      "/messages/direct",
      {
        conversationId,
        content,
        replyTo,
      }
    );

    return (res.data.data ?? res.data.message) as Message;
  },

  sendGroupMessage: async (
    conversationId: string,
    content: string,
    attachments: File[] = [],
    replyTo?: string
  ) => {
    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("content", content);
      if (replyTo) {
        formData.append("replyTo", replyTo);
      }
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await api.post<{ message: Message }>("/messages/group", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.message;
    }

    const res = await api.post<{ message: Message }>("/messages/group", {
      conversationId,
      content,
      replyTo,
    });
    return res.data.message;
  },

  sendLocation: async (
    conversationId: string,
    conversationType: Conversation["type"],
    latitude: number,
    longitude: number
  ) => {
    const endpoint =
      conversationType === "group" ? "/messages/group" : "/messages/direct";
    const res = await api.post<{ message: Message }>(endpoint, {
      conversationId,
      type: "location",
      latitude,
      longitude,
    });
    return res.data.message;
  },

  editMessage: async (messageId: string, content: string) => {
    const res = await api.patch<{ message: Message }>(`/messages/${messageId}`, {
      content,
    });
    return res.data.message;
  },

  deleteMessage: async (messageId: string) => {
    const res = await api.delete<{ message: Message }>(`/messages/${messageId}`);
    return res.data.message;
  },

  reactMessage: async (messageId: string, emoji: string) => {
    const res = await api.patch<{ message: Message }>(`/messages/${messageId}/react`, {
      emoji,
    });
    return res.data.message;
  },

  searchMessages: async (conversationId: string, query: string) => {
    const res = await api.get<{ messages: Message[] }>("/messages/search", {
      params: { conversationId, q: query },
    });
    return res.data.messages;
  },

  updateGroupInfo: async (conversationId: string, name: string) => {
    const res = await api.patch<{ conversation: Conversation }>(
      `/conversations/${conversationId}/group`,
      { name }
    );
    return res.data.conversation;
  },

  addGroupMembers: async (conversationId: string, memberIds: string[]) => {
    const res = await api.post<{ conversation: Conversation }>(
      `/conversations/${conversationId}/group/members`,
      { memberIds }
    );
    return res.data.conversation;
  },

  removeGroupMember: async (conversationId: string, userId: string) => {
    const res = await api.delete<{ conversation: Conversation }>(
      `/conversations/${conversationId}/group/members/${userId}`
    );
    return res.data.conversation;
  },

  leaveGroup: async (conversationId: string) => {
    const res = await api.post<{ conversation: Conversation | null }>(
      `/conversations/${conversationId}/group/leave`
    );
    return res.data.conversation;
  },
};
