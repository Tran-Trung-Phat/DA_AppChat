import { create } from "zustand";
import { toast } from "sonner";
import { chatService } from "@/services/chatService";
import { friendService } from "@/services/friendService";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
  Conversation,
  ConversationParticipant,
  FriendRequest,
  Message,
  UserSummary,
} from "@/types/chat";

interface ChatState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  messages: Message[];
  friends: UserSummary[];
  sentRequests: FriendRequest[];
  receivedRequests: FriendRequest[];
  searchResults: UserSummary[];
  messageSearchResults: Message[];
  onlineUserIds: string[];
  typingByConversation: Record<string, string[]>;
  loading: boolean;
  messagesLoading: boolean;
  sending: boolean;
  searchLoading: boolean;
  messageSearchLoading: boolean;

  hydrate: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshPeople: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  startDirectConversation: (friendId: string) => Promise<void>;
  startGroupConversation: (name: string, memberIds: string[]) => Promise<boolean>;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  sendLocation: (latitude: number, longitude: number) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  receiveSocketMessage: (conversationId: string, message: Message) => void;
  receiveSocketMessageUpdate: (conversationId: string, message: Message) => void;
  receiveSocketConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  setTyping: (conversationId: string, userId: string, typing: boolean) => void;
  searchUsers: (query: string) => Promise<void>;
  searchMessages: (query: string) => Promise<void>;
  sendFriendRequest: (userId: string, message?: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  updateGroupInfo: (conversationId: string, name: string) => Promise<boolean>;
  addGroupMembers: (conversationId: string, memberIds: string[]) => Promise<boolean>;
  removeGroupMember: (conversationId: string, userId: string) => Promise<boolean>;
  leaveGroup: (conversationId: string) => Promise<boolean>;
}

const upsertConversation = (
  conversations: Conversation[],
  conversation: Conversation
) => {
  const next = conversations.filter((item) => item._id !== conversation._id);
  return [conversation, ...next].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt ?? a.updatedAt ?? 0).getTime();
    const bTime = new Date(b.lastMessageAt ?? b.updatedAt ?? 0).getTime();
    return bTime - aTime;
  });
};

export const getParticipantId = (participant: ConversationParticipant) => {
  if (participant._id) return participant._id;
  if (typeof participant.userId === "string") return participant.userId;
  return participant.userId?._id;
};

export const getParticipantName = (participant: ConversationParticipant) => {
  if (participant.displayName) return participant.displayName;
  if (typeof participant.userId === "object") return participant.userId.displayName;
  return "Moji user";
};

export const getParticipantAvatar = (participant: ConversationParticipant) => {
  if (participant.avatarUrl) return participant.avatarUrl;
  if (typeof participant.userId === "object") return participant.userId.avatarUrl;
  return undefined;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const getMessageId = (message: Message) => String(message._id);

const appendMessageOnce = (messages: Message[], message: Message) => {
  const messageId = getMessageId(message);

  if (messages.some((item) => getMessageId(item) === messageId)) {
    return messages;
  }

  return [...messages, message];
};

const replaceMessage = (messages: Message[], message: Message) =>
  messages.map((item) =>
    getMessageId(item) === getMessageId(message) ? message : item
  );

const markUnreadLocal = (
  conversations: Conversation[],
  conversationId: string,
  userId?: string
) =>
  conversations.map((conversation) => {
    if (conversation._id !== conversationId || !userId) return conversation;

    return {
      ...conversation,
      unreadCounts: {
        ...(conversation.unreadCounts ?? {}),
        [userId]: 0,
      },
    };
  });

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  messages: [],
  friends: [],
  sentRequests: [],
  receivedRequests: [],
  searchResults: [],
  messageSearchResults: [],
  onlineUserIds: [],
  typingByConversation: {},
  loading: false,
  messagesLoading: false,
  sending: false,
  searchLoading: false,
  messageSearchLoading: false,

  hydrate: async () => {
    try {
      set({ loading: true });
      const [conversations, friends, requests] = await Promise.all([
        chatService.getConversations(),
        friendService.getFriends(),
        friendService.getRequests(),
      ]);

      const currentId = get().selectedConversationId;
      const selectedConversationId =
        conversations.find((item) => item._id === currentId)?._id ??
        conversations[0]?._id ??
        null;

      set({
        conversations,
        friends,
        sentRequests: requests.sent,
        receivedRequests: requests.received,
        selectedConversationId,
      });

      if (selectedConversationId) {
        await get().selectConversation(selectedConversationId);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải dữ liệu chat"));
    } finally {
      set({ loading: false });
    }
  },

  refreshConversations: async () => {
    const conversations = await chatService.getConversations();
    set({ conversations });
  },

  refreshPeople: async () => {
    const [friends, requests] = await Promise.all([
      friendService.getFriends(),
      friendService.getRequests(),
    ]);
    set({
      friends,
      sentRequests: requests.sent,
      receivedRequests: requests.received,
    });
  },

  selectConversation: async (conversationId) => {
    try {
      set({
        selectedConversationId: conversationId,
        messagesLoading: true,
        messages: [],
        messageSearchResults: [],
      });
      const messages = await chatService.getMessages(conversationId);
      set({ messages });
      await get().markConversationRead(conversationId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải tin nhắn"));
    } finally {
      set({ messagesLoading: false });
    }
  },

  markConversationRead: async (conversationId) => {
    try {
      const conversation = await chatService.markConversationRead(conversationId);
      const userId = useAuthStore.getState().user?._id;

      set((state) => ({
        conversations: markUnreadLocal(
          upsertConversation(state.conversations, conversation),
          conversationId,
          userId
        ),
      }));
    } catch (error) {
      console.error("Cannot mark conversation as read", error);
    }
  },

  startDirectConversation: async (friendId) => {
    try {
      const conversation = await chatService.createDirectConversation(friendId);
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
        selectedConversationId: conversation._id,
      }));
      await get().selectConversation(conversation._id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể mở cuộc trò chuyện"));
    }
  },

  startGroupConversation: async (name, memberIds) => {
    try {
      const conversation = await chatService.createGroupConversation(name, memberIds);
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
        selectedConversationId: conversation._id,
      }));
      await get().selectConversation(conversation._id);
      toast.success("Da tao nhom chat");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the tao nhom chat"));
      return false;
    }
  },

  sendMessage: async (content, attachments = []) => {
    const text = content.trim();
    const conversationId = get().selectedConversationId;
    const conversation = get().conversations.find(
      (item) => item._id === conversationId
    );

    if ((!text && attachments.length === 0) || !conversationId || !conversation) return;

    try {
      set({ sending: true });
      const message =
        conversation.type === "group"
          ? await chatService.sendGroupMessage(conversationId, text, attachments)
          : await chatService.sendDirectMessage(conversationId, text, attachments);

      set((state) => ({ messages: appendMessageOnce(state.messages, message) }));
      await get().refreshConversations();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể gửi tin nhắn"));
    } finally {
      set({ sending: false });
    }
  },

  sendLocation: async (latitude, longitude) => {
    const conversationId = get().selectedConversationId;
    const conversation = get().conversations.find(
      (item) => item._id === conversationId
    );

    if (!conversationId || !conversation) return false;

    try {
      set({ sending: true });
      const message = await chatService.sendLocation(
        conversationId,
        conversation.type,
        latitude,
        longitude
      );
      set((state) => ({ messages: appendMessageOnce(state.messages, message) }));
      await get().refreshConversations();
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the gui vi tri"));
      return false;
    } finally {
      set({ sending: false });
    }
  },

  editMessage: async (messageId, content) => {
    try {
      const message = await chatService.editMessage(messageId, content);
      set((state) => ({
        messages: replaceMessage(state.messages, message),
        messageSearchResults: replaceMessage(state.messageSearchResults, message),
      }));
      await get().refreshConversations();
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the sua tin nhan"));
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const message = await chatService.deleteMessage(messageId);
      set((state) => ({
        messages: replaceMessage(state.messages, message),
        messageSearchResults: replaceMessage(state.messageSearchResults, message),
      }));
      await get().refreshConversations();
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the thu hoi tin nhan"));
    }
  },

  receiveSocketMessage: (conversationId, message) => {
    const state = get();
    const isSelected = state.selectedConversationId === conversationId;
    const exists = state.messages.some(
      (item) => getMessageId(item) === getMessageId(message)
    );

    if (isSelected && !exists) {
      set({ messages: appendMessageOnce(state.messages, message) });
      get().markConversationRead(conversationId).catch((error) => {
        console.error("Cannot mark selected conversation as read", error);
      });
    }

    if (exists) {
      return;
    }

    get().refreshConversations().catch((error) => {
      console.error("Cannot refresh conversations after socket message", error);
    });
  },

  receiveSocketMessageUpdate: (conversationId, message) => {
    const isSelected = get().selectedConversationId === conversationId;

    if (isSelected) {
      set((state) => ({
        messages: replaceMessage(state.messages, message),
        messageSearchResults: replaceMessage(state.messageSearchResults, message),
      }));
    }

    get().refreshConversations().catch((error) => {
      console.error("Cannot refresh conversations after message update", error);
    });
  },

  receiveSocketConversation: (conversation) => {
    set((state) => {
      const existing = state.conversations.find(
        (item) => item._id === conversation._id
      );

      if (existing?.updatedAt === conversation.updatedAt) {
        return state;
      }

      return { conversations: upsertConversation(state.conversations, conversation) };
    });
  },

  removeConversation: (conversationId) => {
    set((state) => {
      const nextConversations = state.conversations.filter(
        (conversation) => conversation._id !== conversationId
      );
      const nextSelectedId =
        state.selectedConversationId === conversationId
          ? nextConversations[0]?._id ?? null
          : state.selectedConversationId;

      return {
        conversations: nextConversations,
        selectedConversationId: nextSelectedId,
        messages: nextSelectedId === state.selectedConversationId ? state.messages : [],
        messageSearchResults:
          nextSelectedId === state.selectedConversationId
            ? state.messageSearchResults
            : [],
      };
    });
  },

  setOnlineUsers: (userIds) => {
    set({ onlineUserIds: [...new Set(userIds)] });
  },

  setUserOnline: (userId, online) => {
    set((state) => ({
      onlineUserIds: online
        ? [...new Set([...state.onlineUserIds, userId])]
        : state.onlineUserIds.filter((id) => id !== userId),
    }));
  },

  setTyping: (conversationId, userId, typing) => {
    const currentUserId = useAuthStore.getState().user?._id;

    if (userId === currentUserId) return;

    set((state) => {
      const current = state.typingByConversation[conversationId] ?? [];
      const next = typing
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);

      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: next,
        },
      };
    });
  },

  searchMessages: async (query) => {
    const text = query.trim();
    const conversationId = get().selectedConversationId;

    if (!conversationId || text.length < 2) {
      set({ messageSearchResults: [], messageSearchLoading: false });
      return;
    }

    try {
      set({ messageSearchLoading: true });
      const messages = await chatService.searchMessages(conversationId, text);
      set({ messageSearchResults: messages });
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the tim tin nhan"));
    } finally {
      set({ messageSearchLoading: false });
    }
  },

  searchUsers: async (query) => {
    const text = query.trim();

    if (text.length < 2) {
      set({ searchResults: [], searchLoading: false });
      return;
    }

    try {
      set({ searchLoading: true });
      const users = await userService.searchUsers(text);
      set({ searchResults: users });
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tìm người dùng"));
    } finally {
      set({ searchLoading: false });
    }
  },

  sendFriendRequest: async (userId, message) => {
    try {
      await friendService.sendRequest(userId, message);
      toast.success("Đã gửi lời mời kết bạn");
      set({ searchResults: [] });
      await get().refreshPeople();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể gửi lời mời kết bạn"));
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      await friendService.acceptRequest(requestId);
      toast.success("Đã chấp nhận lời mời");
      await get().refreshPeople();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể chấp nhận lời mời"));
    }
  },

  declineFriendRequest: async (requestId) => {
    try {
      await friendService.declineRequest(requestId);
      await get().refreshPeople();
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể từ chối lời mời"));
    }
  },

  updateGroupInfo: async (conversationId, name) => {
    try {
      const conversation = await chatService.updateGroupInfo(conversationId, name);
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
      }));
      toast.success("Da cap nhat nhom");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the cap nhat nhom"));
      return false;
    }
  },

  addGroupMembers: async (conversationId, memberIds) => {
    try {
      const conversation = await chatService.addGroupMembers(conversationId, memberIds);
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
      }));
      toast.success("Da them thanh vien");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the them thanh vien"));
      return false;
    }
  },

  removeGroupMember: async (conversationId, userId) => {
    try {
      const conversation = await chatService.removeGroupMember(conversationId, userId);
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
      }));
      toast.success("Da xoa thanh vien");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the xoa thanh vien"));
      return false;
    }
  },

  leaveGroup: async (conversationId) => {
    try {
      await chatService.leaveGroup(conversationId);
      get().removeConversation(conversationId);
      toast.success("Da roi nhom");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Khong the roi nhom"));
      return false;
    }
  },
}));
