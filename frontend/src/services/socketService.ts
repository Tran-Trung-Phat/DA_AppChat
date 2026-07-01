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
  "call:incoming": (payload: {
    fromUserId: string;
    fromUser: any;
    signalData: any;
    callType: "audio" | "video";
  }) => void;
  "call:accepted": (payload: { signalData: any }) => void;
  "call:declined": () => void;
  "call:ice-candidate": (payload: { candidate: any }) => void;
  "call:ended": () => void;
  "call:busied": () => void;
  "call:failed": (payload: { reason: string }) => void;

  // Group calling events
  "group-call:incoming": (payload: {
    conversationId: string;
    caller: any;
    callType: "audio" | "video";
  }) => void;
  "group-call:user-joined": (payload: { userId: string }) => void;
  "group-call:user-left": (payload: { userId: string }) => void;
  "group-call:user-declined": (payload: { userId: string }) => void;
  "group-call:join-success": (payload: { existingUsers: string[] }) => void;
  "group-call:signal": (payload: { fromUserId: string; signalData: any }) => void;
};

type ClientToServerEvents = {
  "conversation:join": (conversationId: string) => void;
  "conversation:leave": (conversationId: string) => void;
  "typing:start": (conversationId: string) => void;
  "typing:stop": (conversationId: string) => void;
  "call:ice-candidate": (payload: { toUserId: string; candidate: any }) => void;
  "call:initiate": (payload: {
    toUserId: string;
    signalData: any;
    callType: "audio" | "video";
  }) => void;
  "call:accept": (payload: { toUserId: string; signalData: any }) => void;
  "call:decline": (payload: { toUserId: string }) => void;
  "call:end": (payload: { toUserId: string }) => void;
  "call:busy": (payload: { toUserId: string }) => void;

  // Group calling events
  "group-call:initiate": (payload: { conversationId: string; callType: "audio" | "video" }) => void;
  "group-call:join": (payload: { conversationId: string }) => void;
  "group-call:signal": (payload: { conversationId: string; toUserId: string; signalData: any }) => void;
  "group-call:leave": (payload: { conversationId: string }) => void;
  "group-call:decline": (payload: { conversationId: string }) => void;
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
