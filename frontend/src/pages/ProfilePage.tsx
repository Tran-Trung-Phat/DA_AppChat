import * as React from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  CameraIcon,
  MessageCircleIcon,
  UserPlusIcon,
  UserCheckIcon,
  UserXIcon,
  UserMinusIcon,
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  BookOpenIcon,
  LoaderCircleIcon,
  Heart as HeartIcon,
  Send as SendIcon,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { friendService } from "@/services/friendService";
import { userService, type UserProfileResponse } from "@/services/userService";
import CallOverlay from "@/components/chat/CallOverlay";
import type { Story } from "@/types/chat";
import api from "@/lib/axios";

// Helper components & functions from FeedPage
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

/* ─── Story Post Card Component ─── */
function ProfilePostCard({
  story,
  userId,
  onLike,
  onComment,
  onDeleteComment,
}: {
  story: Story;
  userId?: string;
  onLike: (id: string) => void;
  onComment: (id: string, content: string) => Promise<boolean>;
  onDeleteComment: (storyId: string, commentId: string) => void;
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

  const bgGradient =
    story.mediaType === "text"
      ? BG_GRADIENTS.find((bg) => story.content?.includes(bg)) || BG_GRADIENTS[0]
      : undefined;

  return (
    <article className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
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

      {story.mediaType === "text" ? (
        <div
          className={`mx-4 my-2 flex min-h-[160px] items-center justify-center rounded-lg p-6 text-center text-base font-bold text-white shadow-inner ${bgGradient}`}
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
              className="w-full rounded-lg object-cover max-h-[400px]"
            />
          )}
          {story.mediaUrl && story.mediaType === "video" && (
            <video
              src={story.mediaUrl}
              controls
              className="w-full rounded-lg max-h-[400px]"
            />
          )}
        </div>
      )}

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

      <div className="grid grid-cols-2 divide-x divide-border">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors hover:bg-muted/50 ${
            liked ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <HeartIcon
            className={`size-3.5 transition-transform ${liked ? "fill-rose-500" : ""} ${
              animateLike ? "scale-125" : ""
            }`}
          />
          {liked ? "Đã thích" : "Thích"}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <MessageCircleIcon className="size-3.5" />
          Bình luận
        </button>
      </div>

      {showComments && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
          {story.comments.length > 0 ? (
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto">
              {story.comments.map((comment) => (
                <div key={comment._id} className="group flex gap-2">
                  <Avatar className="size-7 shrink-0 mt-0.5">
                    <AvatarImage src={comment.user?.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {initials(comment.user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-lg bg-card border px-2.5 py-1.5">
                      <p className="text-xs font-semibold">
                        {comment.user?.displayName}
                      </p>
                      <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 ml-1">
                      <span className="text-[9px] text-muted-foreground">
                        {timeAgo(comment.createdAt)}
                      </span>
                      {(comment.user?._id === userId ||
                        story.user?._id === userId) && (
                        <button
                          onClick={() =>
                            onDeleteComment(story._id, comment._id)
                          }
                          className="text-[9px] text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <p className="text-[10px] text-muted-foreground text-center py-1 italic">
              Chưa có bình luận nào.
            </p>
          )}

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
            <Input
              value={commentDraft}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommentDraft(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 h-8 text-xs"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!commentDraft.trim() || sending}
              className="shrink-0 size-8"
            >
              {sending ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : (
                <SendIcon className="size-3.5" />
              )}
            </Button>
          </form>
        </div>
      )}
    </article>
  );
}

/* ─── Profile Page Component ─── */
const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const loggedInUser = useAuthStore((state) => state.user);
  const { startDirectConversation, likeStory, commentStory, deleteComment } =
    useChatStore();

  const isMe = !userId || userId === loggedInUser?._id;
  const targetId = isMe ? loggedInUser?._id : userId;

  const [profile, setProfile] = React.useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updatingCover, setUpdatingCover] = React.useState(false);
  const [updatingAvatar, setUpdatingAvatar] = React.useState(false);

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const loadProfile = React.useCallback(async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const data = await userService.getUserProfile(targetId);
      setProfile(data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải thông tin trang cá nhân");
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleMessageClick = async () => {
    if (!targetId) return;
    await startDirectConversation(targetId);
    navigate("/");
  };

  const handleAddFriend = async () => {
    if (!targetId) return;
    try {
      await friendService.sendRequest(targetId);
      toast.success("Đã gửi lời mời kết bạn");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendshipStatus: "sent",
            }
          : null
      );
    } catch (error) {
      toast.error("Không thể gửi yêu cầu kết bạn");
    }
  };

  const handleAcceptRequest = async () => {
    if (!targetId) return;
    try {
      // Find the request first in backend or use endpoint to accept.
      // Friend request is accepted by its requestId. We can find the incoming request or let friendService handle it.
      // Wait, let's call the endpoint through friendService. Let's find pending incoming request ID.
      const res = await api.get<{ received: any[] }>("/friends/requests");
      const incoming = res.data.received.find(
        (r: any) => r.from._id === targetId
      );
      if (incoming) {
        await friendService.acceptRequest(incoming._id);
        toast.success("Hai bạn đã trở thành bạn bè!");
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                friendshipStatus: "friends",
                totalFriends: prev.totalFriends + 1,
              }
            : null
        );
      }
    } catch (error) {
      toast.error("Không thể đồng ý kết bạn");
    }
  };

  const handleUnfriend = async () => {
    if (!targetId) return;
    try {
      await friendService.unfriend(targetId);
      toast.success("Đã hủy kết bạn");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              friendshipStatus: "none",
              totalFriends: Math.max(prev.totalFriends - 1, 0),
            }
          : null
      );
    } catch (error) {
      toast.error("Không thể hủy kết bạn");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdatingCover(true);
    const formData = new FormData();
    formData.append("cover", file);

    try {
      const updatedUser = await userService.uploadCover(formData);
      useAuthStore.getState().setUser(updatedUser); // Update local store
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: updatedUser,
            }
          : null
      );
      toast.success("Đã cập nhật ảnh bìa thành công!");
    } catch (error) {
      toast.error("Không thể tải lên ảnh bìa");
    } finally {
      setUpdatingCover(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpdatingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      // Use existing avatar upload method
      const res = await api.post<{ user: any }>("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      useAuthStore.getState().setUser(res.data.user);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: res.data.user,
            }
          : null
      );
      toast.success("Đã cập nhật ảnh đại diện thành công!");
    } catch (error) {
      toast.error("Không thể cập nhật ảnh đại diện");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <LoaderCircleIcon className="size-10 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Đang tải trang cá nhân...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-center p-4">
        <div>
          <h2 className="text-lg font-bold">Không tìm thấy người dùng</h2>
          <p className="text-xs text-muted-foreground mt-1">Trang cá nhân không tồn tại hoặc đã bị khóa.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Quay lại trang chủ
          </Button>
        </div>
      </div>
    );
  }

  const { user: profileUser, posts, friends: friendsList, totalFriends, friendshipStatus } = profile;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">Trang cá nhân</span>
            <span className="truncate text-xs text-muted-foreground">@{profileUser.username}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20 pb-10">
          {/* Header Card (Cover & Avatar) */}
          <div className="bg-card border-b shadow-sm">
            <div className="mx-auto max-w-4xl">
              {/* Cover Photo */}
              <div className="relative h-48 md:h-64 w-full bg-gradient-to-r from-zinc-300 to-zinc-400 overflow-hidden">
                {profileUser.coverUrl ? (
                  <img
                    src={profileUser.coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500/10 via-orange-500/5 to-teal-500/10" />
                )}

                {isMe && (
                  <>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleCoverUpload}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={updatingCover}
                      className="absolute bottom-3 right-3 text-xs gap-1.5 shadow-md"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <CameraIcon className="size-4" />
                      {updatingCover ? "Đang tải..." : "Thay ảnh bìa"}
                    </Button>
                  </>
                )}
              </div>

              {/* Profile Bar Info */}
              <div className="px-4 pb-6 pt-3 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-16 md:-mt-20">
                  {/* Avatar upload */}
                  <div className="relative size-24 md:size-32 rounded-full border-4 border-card shadow-lg bg-card overflow-hidden group shrink-0">
                    <Avatar className="size-full">
                      <AvatarImage src={profileUser.avatarUrl} alt={profileUser.displayName} />
                      <AvatarFallback className="text-xl md:text-2xl">
                        {initials(profileUser.displayName)}
                      </AvatarFallback>
                    </Avatar>

                    {isMe && (
                      <>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleAvatarUpload}
                        />
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={updatingAvatar}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs disabled:opacity-100"
                        >
                          <CameraIcon className="size-5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="text-center md:text-left min-w-0 pb-1">
                    <h2 className="text-xl md:text-2xl font-bold truncate">
                      {profileUser.displayName}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{profileUser.username} · {totalFriends} bạn bè
                    </p>
                  </div>
                </div>

                {/* Profile Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isMe && (
                    <>
                      <Button onClick={handleMessageClick} size="sm" variant="default" className="text-xs">
                        <MessageCircleIcon className="size-4 mr-1.5" />
                        Nhắn tin
                      </Button>

                      {friendshipStatus === "none" && (
                        <Button onClick={handleAddFriend} size="sm" variant="outline" className="text-xs">
                          <UserPlusIcon className="size-4 mr-1.5" />
                          Kết bạn
                        </Button>
                      )}

                      {friendshipStatus === "sent" && (
                        <Button disabled size="sm" variant="outline" className="text-xs">
                          <UserCheckIcon className="size-4 mr-1.5" />
                          Đã gửi lời mời
                        </Button>
                      )}

                      {friendshipStatus === "received" && (
                        <Button onClick={handleAcceptRequest} size="sm" variant="outline" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200">
                          <UserPlusIcon className="size-4 mr-1.5" />
                          Đồng ý kết bạn
                        </Button>
                      )}

                      {friendshipStatus === "friends" && (
                        <Button onClick={handleUnfriend} size="sm" variant="destructive" className="text-xs">
                          <UserMinusIcon className="size-4 mr-1.5" />
                          Hủy kết bạn
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bố cục hai cột */}
          <div className="mx-auto max-w-4xl px-4 mt-6 grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-6">
            {/* Cột trái (Thông tin & Bạn bè) */}
            <div className="space-y-6">
              {/* Giới thiệu Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Giới thiệu</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3.5">
                  {profileUser.bio && (
                    <div className="flex items-start gap-2 text-muted-foreground italic">
                      <BookOpenIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>"{profileUser.bio}"</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MailIcon className="size-4 text-muted-foreground shrink-0" />
                    <span>{profileUser.email}</span>
                  </div>
                  {profileUser.phone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="size-4 text-muted-foreground shrink-0" />
                      <span>{profileUser.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                    <span>
                      Tham gia vào {new Date(profileUser.createdAt || "").toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Bạn bè Card */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Bạn bè</CardTitle>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{totalFriends} người bạn</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {friendsList.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {friendsList.map((friend) => (
                        <Link
                          key={friend._id}
                          to={`/profile/${friend._id}`}
                          className="flex flex-col items-center min-w-0 text-center hover:opacity-90 group"
                        >
                          <Avatar className="size-14 rounded-lg shadow-sm border group-hover:scale-105 transition-transform">
                            <AvatarImage src={friend.avatarUrl} />
                            <AvatarFallback className="rounded-lg">{initials(friend.displayName)}</AvatarFallback>
                          </Avatar>
                          <span className="mt-1.5 block text-[10px] font-semibold text-foreground truncate w-full">
                            {friend.displayName}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground italic py-4">Chưa có bạn bè nào.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cột phải (Dòng thời gian bài đăng) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground tracking-wide uppercase px-1">
                Bài viết gần đây
              </h3>

              {posts.length === 0 && (
                <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
                  <span className="text-3xl">📝</span>
                  <p className="text-xs font-semibold mt-2">Chưa có bài đăng nào trên dòng thời gian.</p>
                </div>
              )}

              <div className="space-y-4">
                {posts.map((post) => (
                  <ProfilePostCard
                    key={post._id}
                    story={post}
                    userId={loggedInUser?._id}
                    onLike={likeStory}
                    onComment={commentStory}
                    onDeleteComment={deleteComment}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>

      <CallOverlay />
    </SidebarProvider>
  );
};

export default ProfilePage;
