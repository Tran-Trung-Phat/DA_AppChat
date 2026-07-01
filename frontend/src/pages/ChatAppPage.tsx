import * as React from 'react';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import ChatWindowLayout from '@/components/chat/ChatWindowLayout';
import CallOverlay from '@/components/chat/CallOverlay';
import { useCallStore } from '@/stores/useCallStore';
import { Separator } from '@/components/ui/separator';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatStore } from '@/stores/useChatStore';

const ChatAppPage = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const selectedConversationId = useChatStore(
    (state) => state.selectedConversationId
  );
  const receiveSocketMessage = useChatStore(
    (state) => state.receiveSocketMessage
  );
  const receiveSocketConversation = useChatStore(
    (state) => state.receiveSocketConversation
  );
  const removeConversation = useChatStore((state) => state.removeConversation);
  const receiveSocketMessageUpdate = useChatStore(
    (state) => state.receiveSocketMessageUpdate
  );
  const setOnlineUsers = useChatStore((state) => state.setOnlineUsers);
  const setUserOnline = useChatStore((state) => state.setUserOnline);
  const setTyping = useChatStore((state) => state.setTyping);

  React.useEffect(() => {
    if (!accessToken) return;

    const socket = socketService.connect(accessToken);

    socket.on("message:new", ({ conversationId, message }) => {
      receiveSocketMessage(conversationId, message);
    });

    socket.on("message:updated", ({ conversationId, message }) => {
      receiveSocketMessageUpdate(conversationId, message);
    });

    socket.on("message:deleted", ({ conversationId, message }) => {
      receiveSocketMessageUpdate(conversationId, message);
    });

    socket.on("conversation:changed", ({ conversation }) => {
      receiveSocketConversation(conversation);
    });

    socket.on("conversation:removed", ({ conversationId }) => {
      removeConversation(conversationId);
    });

    socket.on("presence:snapshot", ({ onlineUserIds }) => {
      setOnlineUsers(onlineUserIds);
    });

    socket.on("presence:changed", ({ userId, online }) => {
      setUserOnline(userId, online);
    });

    socket.on("typing:start", ({ conversationId, userId }) => {
      setTyping(conversationId, userId, true);
    });

    socket.on("typing:stop", ({ conversationId, userId }) => {
      setTyping(conversationId, userId, false);
    });

    socket.on("call:incoming", ({ fromUserId, fromUser, signalData, callType }) => {
      useCallStore.getState().handleIncomingCall(fromUserId, fromUser, signalData, callType);
    });

    socket.on("call:accepted", ({ signalData }) => {
      void useCallStore.getState().handleCallAccepted(signalData);
    });

    socket.on("call:declined", () => {
      useCallStore.getState().handleCallDeclined();
    });

    socket.on("call:ice-candidate", ({ candidate }) => {
      void useCallStore.getState().handleIceCandidate(candidate);
    });

    socket.on("call:ended", () => {
      useCallStore.getState().handleCallEnded();
    });

    socket.on("call:busied", () => {
      useCallStore.getState().handleCallDeclined();
    });

    socket.on("call:failed", ({ reason }) => {
      useCallStore.getState().handleCallFailed(reason);
    });

    // Group calling listeners
    socket.on("group-call:incoming", ({ conversationId, caller, callType }) => {
      useCallStore.getState().handleIncomingGroupCall(conversationId, caller, callType);
    });

    socket.on("group-call:user-joined", ({ userId }) => {
      void useCallStore.getState().handleGroupUserJoined(userId);
    });

    socket.on("group-call:user-left", ({ userId }) => {
      useCallStore.getState().handleGroupUserLeft(userId);
    });

    socket.on("group-call:user-declined", ({ userId }) => {
      useCallStore.getState().handleGroupUserDeclined(userId);
    });

    socket.on("group-call:join-success", ({ existingUsers }) => {
      void useCallStore.getState().handleGroupJoinSuccess(existingUsers);
    });

    socket.on("group-call:signal", ({ fromUserId, signalData }) => {
      void useCallStore.getState().handleGroupSignal(fromUserId, signalData);
    });

    return () => {
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("message:deleted");
      socket.off("conversation:changed");
      socket.off("conversation:removed");
      socket.off("presence:snapshot");
      socket.off("presence:changed");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:declined");
      socket.off("call:ice-candidate");
      socket.off("call:ended");
      socket.off("call:busied");
      socket.off("call:failed");
      socket.off("group-call:incoming");
      socket.off("group-call:user-joined");
      socket.off("group-call:user-left");
      socket.off("group-call:user-declined");
      socket.off("group-call:join-success");
      socket.off("group-call:signal");
      socketService.disconnect();
    };
  }, [
    accessToken,
    receiveSocketConversation,
    removeConversation,
    receiveSocketMessage,
    receiveSocketMessageUpdate,
    setOnlineUsers,
    setTyping,
    setUserOnline,
  ]);

  React.useEffect(() => {
    if (!selectedConversationId) return;

    socketService.joinConversation(selectedConversationId);

    return () => {
      socketService.leaveConversation(selectedConversationId);
    };
  }, [selectedConversationId]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">Moji</span>
            <span className="truncate text-xs text-muted-foreground">
              Chat workspace
            </span>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 p-3">
          <ChatWindowLayout />
        </main>
      </SidebarInset>
      <CallOverlay />
    </SidebarProvider>
  );
};

export default ChatAppPage;