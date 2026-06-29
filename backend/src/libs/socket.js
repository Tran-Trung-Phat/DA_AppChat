import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

let io;
const onlineUsers = new Map();

const addOnlineSocket = (userId, socketId) => {
  const sockets = onlineUsers.get(userId) ?? new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);
  return wasOffline;
};

const removeOnlineSocket = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);

  if (!sockets) return false;

  sockets.delete(socketId);

  if (sockets.size > 0) return false;

  onlineUsers.delete(userId);
  return true;
};

export const initSocket = (httpServer) => {
  const clientUrl = process.env.CLIENT_URL || [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Missing socket token"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded.userId).select("isActive");

      if (!user || user.isActive === false) {
        return next(new Error("Account is blocked"));
      }

      socket.userId = decoded.userId.toString();
      return next();
    } catch (error) {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.userId));
    socket.emit("presence:snapshot", {
      onlineUserIds: Array.from(onlineUsers.keys()),
    });

    if (addOnlineSocket(socket.userId, socket.id)) {
      io.emit("presence:changed", {
        userId: socket.userId,
        online: true,
      });
    }

    socket.on("conversation:join", (conversationId) => {
      if (conversationId) {
        socket.join(conversationRoom(conversationId));
      }
    });

    socket.on("conversation:leave", (conversationId) => {
      if (conversationId) {
        socket.leave(conversationRoom(conversationId));
      }
    });

    socket.on("typing:start", (conversationId) => {
      if (conversationId) {
        socket.to(conversationRoom(conversationId)).emit("typing:start", {
          conversationId,
          userId: socket.userId,
        });
      }
    });

    socket.on("typing:stop", (conversationId) => {
      if (conversationId) {
        socket.to(conversationRoom(conversationId)).emit("typing:stop", {
          conversationId,
          userId: socket.userId,
        });
      }
    });

    socket.on("call:initiate", async ({ toUserId, signalData, callType }) => {
      if (!toUserId) return;
      
      const isOnline = onlineUsers.has(toUserId);
      if (!isOnline) {
        socket.emit("call:failed", { reason: "offline" });
        return;
      }

      try {
        const caller = await User.findById(socket.userId).select("displayName avatarUrl username");
        if (!caller) return;
        
        io.to(userRoom(toUserId)).emit("call:incoming", {
          fromUserId: socket.userId,
          fromUser: {
            _id: caller._id,
            displayName: caller.displayName,
            avatarUrl: caller.avatarUrl,
            username: caller.username,
          },
          signalData,
          callType,
        });
      } catch (err) {
        console.error("Lỗi khi khởi tạo cuộc gọi socket:", err);
      }
    });

    socket.on("call:accept", ({ toUserId, signalData }) => {
      if (!toUserId) return;
      io.to(userRoom(toUserId)).emit("call:accepted", { signalData });
    });

    socket.on("call:decline", ({ toUserId }) => {
      if (!toUserId) return;
      io.to(userRoom(toUserId)).emit("call:declined");
    });

    socket.on("call:ice-candidate", ({ toUserId, candidate }) => {
      if (!toUserId) return;
      io.to(userRoom(toUserId)).emit("call:ice-candidate", { candidate });
    });

    socket.on("call:end", ({ toUserId }) => {
      if (!toUserId) return;
      io.to(userRoom(toUserId)).emit("call:ended");
    });

    socket.on("call:busy", ({ toUserId }) => {
      if (!toUserId) return;
      io.to(userRoom(toUserId)).emit("call:busied");
    });

    socket.on("disconnect", () => {
      if (removeOnlineSocket(socket.userId, socket.id)) {
        io.emit("presence:changed", {
          userId: socket.userId,
          online: false,
        });
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

export const disconnectUserSockets = (userId) => {
  if (!io || !userId) return;
  io.in(userRoom(userId.toString())).disconnectSockets(true);
};

export const userRoom = (userId) => `user:${userId}`;

export const conversationRoom = (conversationId) =>
  `conversation:${conversationId}`;

export const emitToConversationParticipants = (
  conversation,
  event,
  payload
) => {
  if (!io || !conversation?.participants?.length) return;

  conversation.participants.forEach((participant) => {
    const userId = participant.userId?._id ?? participant.userId;

    if (userId) {
      io.to(userRoom(userId.toString())).emit(event, payload);
    }
  });
};
