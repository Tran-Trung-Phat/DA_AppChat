import { io, type Socket } from "socket.io-client";
import type { Conversation, Message } from "@/types/chat";

type ServerToClientEvents = {
  "message:new": (payload: {
    conversationId: string;
    message: Message;
  }) => void;
  "message:updated": (payload: {
    conversationId: string;
    message: Message;
  }) => void;
  "message:deleted": (payload: {
    conversationId: string;
    message: Message;
  }) => void;
  "conversation:changed": (payload: { conversation: Conversation }) => void;
  "conversation:removed": (payload: { conversationId: string }) => void;
  "presence:snapshot": (payload: { onlineUserIds: string[] }) => void;
  "presence:changed": (payload: { userId: string; online: boolean }) => void;
  "typing:start": (payload: { conversationId: string; userId: string }) => void;
  "typing:stop": (payload: { conversationId: string; userId: string }) => void;
};

type ClientToServerEvents = {
  "conversation:join": (conversationId: string) => void;
  "conversation:leave": (conversationId: string) => void;
  "typing:start": (conversationId: string) => void;
  "typing:stop": (conversationId: string) => void;
};

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

const socketURL = import.meta.env.VITE_API_URL || "/";

export const socketService = {
  connect: (accessToken: string) => {
    if (socket?.connected) return socket;

    socket?.disconnect();

    socket = io(socketURL, {
      auth: {
        token: accessToken,
      },
      withCredentials: true,
    });

    return socket;
  },

  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },

  getSocket: () => socket,

  joinConversation: (conversationId: string) => {
    socket?.emit("conversation:join", conversationId);
  },

  leaveConversation: (conversationId: string) => {
    socket?.emit("conversation:leave", conversationId);
  },

  startTyping: (conversationId: string) => {
    socket?.emit("typing:start", conversationId);
  },

  stopTyping: (conversationId: string) => {
    socket?.emit("typing:stop", conversationId);
  },
};
