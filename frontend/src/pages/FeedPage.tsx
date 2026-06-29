import * as React from "react";
import { useNavigate } from "react-router";
import {
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  SendIcon,
  ImagePlusIcon,
  Trash2Icon,
  LoaderCircleIcon,
  CopyIcon,
} from "lucide-react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { socketService } from "@/services/socketService";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useChatStore,
  getParticipantId,
  getParticipantName,
} from "@/stores/useChatStore";
import { useCallStore } from "@/stores/useCallStore";
import CallOverlay from "@/components/chat/CallOverlay";
import type { Story, Conversation } from "@/types/chat";

const initials = (name?: string) =>
  (name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
};

const BG_GRADIENTS = [
  "bg-gradient-to-tr from-purple-500 to-indigo-600",
  "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500",
  "bg-gradient-to-tr from-teal-400 to-blue-500",
  "bg-gradient-to-tr from-yellow-200 via-pink-200 to-red-200",
  "bg-zinc-950",
];

/* ─── Post Card Component ─── */
function PostCard({
  story,
  userId,
  onLike,
  onComment,
  onDeleteComment,
  onShare,
}: {
  story: Story;
  userId?: string;
  onLike: (id: string) => void;
  onComment: (id: string, content: string) => Promise<boolean>;
  onDeleteComment: (storyId: string, commentId: string) => void;
  onShare: (story: Story) => void;
}) {
  const [commentDraft, setCommentDraft] = React.useState("");
  const [showComments, setShowComments] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const liked = userId ? story.likes.includes(userId) : false;
  const [animateLike, setAnimateLike] = React.useState(false);

  const handleLike = () => {
    setAnimateLike(true);
    onLike(story._id);
    setTimeout(() => setAnimateLike(false), 500);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentDraft.trim() || sending) return;
    setSending(true);
    const ok = await onComment(story._id, commentDraft);
    setSending(false);
    if (ok) {
      setCommentDraft("");
      setShowComments(true);
    }
  };

  // Detect if content matches a gradient background pattern
  const bgGradient =
    story.mediaType === "text"
      ? BG_GRADIENTS.find((bg) => story.content?.includes(bg)) || BG_GRADIENTS[0]
      : undefined;

  return (
    <article className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      {/* Author Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar className="size-10 border">
          <AvatarImage src={story.user?.avatarUrl} alt={story.user?.displayName} />
          <AvatarFallback>{initials(story.user?.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{story.user?.displayName}</p>
          <p className="text-[11px] text-muted-foreground">
            @{story.user?.username} · {timeAgo(story.createdAt)}
          </p>
        </div>
      </div>

      {/* Post Body */}
      {story.mediaType === "text" ? (
        <div
          className={`mx-4 my-2 flex min-h-[200px] items-center justify-center rounded-lg p-6 text-center text-lg font-bold text-white shadow-inner ${bgGradient}`}
        >
          {story.content}
        </div>
      ) : (
        <div className="px-4 py-2">
          {story.content && (
            <p className="mb-2 text-sm whitespace-pre-wrap">{story.content}</p>
          )}
          {story.mediaUrl && story.mediaType === "image" && (
            <img
              src={story.mediaUrl}
              alt=""
              className="w-full rounded-lg object-cover max-h-[500px]"
            />
          )}
          {story.mediaUrl && story.mediaType === "video" && (
            <video
              src={story.mediaUrl}
              controls
              className="w-full rounded-lg max-h-[500px]"
            />
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 px-4 py-1.5 text-xs text-muted-foreground">
        {story.likes.length > 0 && (
          <span className="flex items-center gap-1">
            <HeartIcon className="size-3 fill-rose-500 text-rose-500" />
            {story.likes.length}
          </span>
        )}
        {story.comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:text-foreground transition-colors"
          >
            {story.comments.length} bình luận
          </button>
        )}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="grid grid-cols-3 divide-x divide-border">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 ${
            liked ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <HeartIcon
            className={`size-4 transition-transform ${liked ? "fill-rose-500" : ""} ${
              animateLike ? "scale-125" : ""
            }`}
          />
          {liked ? "Đã thích" : "Thích"}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <MessageCircleIcon className="size-4" />
          Bình luận
        </button>
        <button
          onClick={() => onShare(story)}
          className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Share2Icon className="size-4" />
          Chia sẻ
        </button>
      </div>

      {/* Comments Section (Expandable) */}
      {showComments && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Existing Comments */}
          {story.comments.length > 0 ? (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {story.comments.map((comment) => (
                <div key={comment._id} className="group flex gap-2.5">
                  <Avatar className="size-7 shrink-0 mt-0.5">
                    <AvatarImage src={comment.user?.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {initials(comment.user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-lg bg-card border px-3 py-2">
                      <p className="text-xs font-semibold">
                        {comment.user?.displayName}
                      </p>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 ml-1">
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(comment.createdAt)}
                      </span>
                      {(comment.user?._id === userId ||
                        story.user?._id === userId) && (
                        <button
                          onClick={() =>
                            onDeleteComment(story._id, comment._id)
                          }
                          className="text-[10px] text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2 italic">
              Chưa có bình luận. Hãy là người đầu tiên!
            </p>
          )}

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
            <Input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 h-9 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!commentDraft.trim() || sending}
              className="shrink-0 size-9"
            >
              {sending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </article>
  );
}

/* ─── Main Feed Page ─── */
const FeedPage = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const {
    stories,
    conversations,
    friends,
    loading,
    fetchStories,
    createStory,
    likeStory,
    commentStory,
    deleteComment,
    sendMessage,
    selectConversation,
    receiveSocketMessage,
    receiveSocketMessageUpdate,
    receiveSocketConversation,
    removeConversation,
    setOnlineUsers,
    setUserOnline,
    setTyping,
  } = useChatStore();

  // Create post state
  const [postContent, setPostContent] = React.useState("");
  const [postMediaType, setPostMediaType] = React.useState<"text" | "image" | "video">("text");
  const [postFile, setPostFile] = React.useState<File | null>(null);
  const [postFilePreview, setPostFilePreview] = React.useState("");
  const [postBgColor, setPostBgColor] = React.useState(BG_GRADIENTS[0]);
  const [creating, setCreating] = React.useState(false);

  // Share dialog
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareStory, setShareStory] = React.useState<Story | null>(null);
  const [shareQuery, setShareQuery] = React.useState("");

  // Socket listeners (same as ChatAppPage)
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

    // Call listeners
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
      socketService.disconnect();
    };
  }, [
    accessToken,
    receiveSocketMessage,
    receiveSocketMessageUpdate,
    receiveSocketConversation,
    removeConversation,
    setOnlineUsers,
    setUserOnline,
    setTyping,
  ]);

  // Fetch stories on mount
  React.useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPostFile(file);
    setPostMediaType(file.type.startsWith("video") ? "video" : "image");
    setPostFilePreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    if (postMediaType === "text" && !postContent.trim()) return;
    if (postMediaType !== "text" && !postFile) return;

    setCreating(true);

    const formData = new FormData();
    if (postMediaType === "text") {
      formData.append("content", postContent);
      formData.append("mediaType", "text");
    } else {
      formData.append("media", postFile!);
      formData.append("mediaType", postMediaType);
      if (postContent.trim()) {
        formData.append("content", postContent);
      }
    }

    const ok = await createStory(formData);
    setCreating(false);

    if (ok) {
      setPostContent("");
      setPostFile(null);
      setPostFilePreview("");
      setPostMediaType("text");
    }
  };

  const handleShare = (story: Story) => {
    setShareStory(story);
    setShareDialogOpen(true);
    setShareQuery("");
  };

  const handleCopyLink = () => {
    const text =
      shareStory?.mediaType === "text"
        ? shareStory.content || ""
        : shareStory?.mediaUrl || "";
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép nội dung bài viết vào clipboard");
    setShareDialogOpen(false);
  };

  const handleShareToConversation = async (conversation: Conversation) => {
    if (!shareStory) return;

    const shareText =
      shareStory.mediaType === "text"
        ? `📢 Chia sẻ bài viết từ ${shareStory.user?.displayName}:\n\n"${shareStory.content}"`
        : `📢 Chia sẻ bài viết từ ${shareStory.user?.displayName}:\n${shareStory.content ? `"${shareStory.content}"\n` : ""}${shareStory.mediaUrl}`;

    await selectConversation(conversation._id);
    await sendMessage(shareText);
    toast.success("Đã chia sẻ bài viết vào cuộc trò chuyện");
    setShareDialogOpen(false);
    navigate("/");
  };

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.type === "group") {
      return conversation.group?.name || "Nhóm chat";
    }
    const peer = conversation.participants.find(
      (p) => getParticipantId(p) !== user?._id
    );
    return peer ? getParticipantName(peer) : "Chat";
  };

  const filteredShareConversations = conversations.filter((c) => {
    if (!shareQuery.trim()) return true;
    return getConversationTitle(c)
      .toLowerCase()
      .includes(shareQuery.toLowerCase());
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">📰 Bảng tin</span>
            <span className="truncate text-xs text-muted-foreground">
              Xem bài đăng, bình luận & chia sẻ
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
            {/* Create Post Box */}
            <form
              onSubmit={handleCreatePost}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border">
                  <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
                  <AvatarFallback>{initials(user?.displayName)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold">{user?.displayName}</span>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={postMediaType === "text" ? "default" : "outline"}
                  onClick={() => {
                    setPostMediaType("text");
                    setPostFile(null);
                    setPostFilePreview("");
                  }}
                >
                  ✏️ Viết bài
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={postMediaType !== "text" ? "default" : "outline"}
                  asChild
                >
                  <label className="cursor-pointer">
                    <ImagePlusIcon className="size-4 mr-1" />
                    Ảnh / Video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                </Button>
              </div>

              {/* Text Mode */}
              {postMediaType === "text" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">Màu nền:</span>
                    {BG_GRADIENTS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setPostBgColor(bg)}
                        className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          postBgColor === bg ? "border-primary scale-110" : "border-transparent"
                        } ${bg}`}
                      />
                    ))}
                  </div>
                  <Textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Bạn đang nghĩ gì?"
                    className="min-h-[100px] resize-none"
                    required
                  />
                  {postContent && (
                    <div
                      className={`flex items-center justify-center rounded-lg min-h-[150px] p-4 text-center text-white font-bold text-base shadow-inner ${postBgColor}`}
                    >
                      {postContent}
                    </div>
                  )}
                </div>
              )}

              {/* Media Mode */}
              {postMediaType !== "text" && (
                <div className="space-y-2">
                  {postFilePreview && (
                    <div className="relative overflow-hidden rounded-lg bg-muted max-h-[300px] flex items-center justify-center">
                      {postMediaType === "video" ? (
                        <video src={postFilePreview} controls className="max-h-[300px] max-w-full" />
                      ) : (
                        <img
                          src={postFilePreview}
                          alt="Preview"
                          className="max-h-[300px] max-w-full object-contain"
                        />
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 size-7 rounded-full"
                        onClick={() => {
                          setPostFile(null);
                          setPostFilePreview("");
                          setPostMediaType("text");
                        }}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  )}
                  <Input
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Thêm mô tả..."
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? (
                  <>
                    <LoaderCircleIcon className="size-4 animate-spin mr-2" />
                    Đang đăng...
                  </>
                ) : (
                  "Đăng bài viết"
                )}
              </Button>
            </form>

            {/* Feed Stream */}
            {stories.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <span className="text-4xl">📭</span>
                <p className="text-sm">
                  Chưa có bài viết nào. Hãy đăng bài đầu tiên!
                </p>
              </div>
            )}

            {stories.map((story) => (
              <PostCard
                key={story._id}
                story={story}
                userId={user?._id}
                onLike={likeStory}
                onComment={commentStory}
                onDeleteComment={deleteComment}
                onShare={handleShare}
              />
            ))}
          </div>
        </main>
      </SidebarInset>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chia sẻ bài viết</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleCopyLink}
            >
              <CopyIcon className="size-4" />
              Sao chép nội dung
            </Button>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">
              Hoặc chia sẻ đến cuộc trò chuyện:
            </p>
            <Input
              value={shareQuery}
              onChange={(e) => setShareQuery(e.target.value)}
              placeholder="Tìm cuộc trò chuyện..."
              className="h-9"
            />
            <div className="max-h-[250px] space-y-1 overflow-y-auto">
              {filteredShareConversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => handleShareToConversation(conversation)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(getConversationTitle(conversation))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium">
                    {getConversationTitle(conversation)}
                  </span>
                </button>
              ))}
              {filteredShareConversations.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground italic">
                  Không tìm thấy cuộc trò chuyện
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CallOverlay />
    </SidebarProvider>
  );
};

export default FeedPage;
