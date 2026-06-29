import * as React from 'react';
import { AppSidebar } from '@/components/sidebar/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import ChatWindowLayout from '@/components/chat/ChatWindowLayout';
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
    </SidebarProvider>
  );
};

export default ChatAppPage;