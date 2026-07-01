import * as React from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  ImagePlusIcon,
  KeyRoundIcon,
  LogOutIcon,
  MessageCircleIcon,
  Moon,
  PencilIcon,
  SearchIcon,
  ShieldCheckIcon,
  Sun,
  UserPlusIcon,
  XIcon,
  MoreHorizontalIcon,
  BanIcon,
  UserMinusIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getParticipantAvatar,
  getParticipantId,
  getParticipantName,
  useChatStore,
} from "@/stores/useChatStore";
import type { Conversation, UserSummary } from "@/types/chat";

const initials = (name?: string) =>
  (name || "M")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const getDirectPeer = (conversation: Conversation, currentUserId?: string) =>
  conversation.participants.find(
    (participant) => getParticipantId(participant) !== currentUserId
  ) ?? conversation.participants[0];

const getConversationTitle = (
  conversation: Conversation,
  currentUserId?: string
) => {
  if (conversation.type === "group") {
    return conversation.group?.name || "Nhóm chat";
  }

  return getParticipantName(getDirectPeer(conversation, currentUserId));
};

const getConversationAvatar = (
  conversation: Conversation,
  currentUserId?: string
) => {
  if (conversation.type === "group") return undefined;
  return getParticipantAvatar(getDirectPeer(conversation, currentUserId));
};

function PersonRow({
  person,
  action,
  online = false,
}: {
  person: UserSummary;
  action?: React.ReactNode;
  online?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5">
      <div className="relative">
        <Avatar size="sm">
          <AvatarImage src={person.avatarUrl} alt={person.displayName} />
          <AvatarFallback>{initials(person.displayName)}</AvatarFallback>
        </Avatar>
        <span
          className={`absolute bottom-0 right-0 size-2.5 rounded-full border border-background ${
            online ? "bg-emerald-500" : "bg-muted-foreground"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          @{person.username}
        </p>
      </div>
      {action}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const { user, signOut, updateProfile, uploadAvatar, changePassword } = useAuthStore();
  const {
    conversations,
    selectedConversationId,
    friends,
    receivedRequests,
    sentRequests,
    blockedUsers,
    stories,
    storiesLoading,
    loading,
    searchResults,
    searchLoading,
    onlineUserIds,
    hydrate,
    selectConversation,
    startDirectConversation,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    unfriend,
    cancelFriendRequest,
    blockUser,
    unblockUser,
    fetchBlockedUsers,
    createStory,
    viewStory,
  } = useChatStore();
  const [query, setQuery] = React.useState("");
  const [conversationQuery, setConversationQuery] = React.useState("");
  const [darkMode, setDarkMode] = React.useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({
    displayName: user?.displayName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    bio: user?.bio ?? "",
  });
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState(user?.avatarUrl ?? "");
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [blockedOpen, setBlockedOpen] = React.useState(false);
  const [createStoryOpen, setCreateStoryOpen] = React.useState(false);
  const [storyContent, setStoryContent] = React.useState("");
  const [storyMediaType, setStoryMediaType] = React.useState<"text" | "image" | "video">("text");
  const [storyFile, setStoryFile] = React.useState<File | null>(null);
  const [storyFilePreview, setStoryFilePreview] = React.useState("");
  const [storyBgColor, setStoryBgColor] = React.useState("bg-gradient-to-tr from-purple-500 to-indigo-600");
  const [viewStoryOpen, setViewStoryOpen] = React.useState(false);
  const [viewStoryIndex, setViewStoryIndex] = React.useState(0);
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleCreateStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storyMediaType !== "text" && !storyFile) {
      toast.error("Vui lòng chọn hình ảnh hoặc video cho story");
      return;
    }
    if (storyMediaType === "text" && !storyContent.trim()) {
      toast.error("Vui lòng nhập nội dung story");
      return;
    }

    const formData = new FormData();
    formData.append("mediaType", storyMediaType);
    if (storyFile) {
      formData.append("media", storyFile);
    }
    
    // Support custom background gradients for text stories
    if (storyMediaType === "text") {
      formData.append("content", `[${storyBgColor}]${storyContent}`);
    } else {
      formData.append("content", storyContent);
    }

    const success = await createStory(formData);
    if (success) {
      setCreateStoryOpen(false);
      setStoryContent("");
      setStoryFile(null);
      setStoryFilePreview("");
      setStoryMediaType("text");
    }
  };

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setStoryFile(file);
      setStoryFilePreview(URL.createObjectURL(file));
      if (file.type.startsWith("video/")) {
        setStoryMediaType("video");
      } else {
        setStoryMediaType("image");
      }
    }
  };

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      searchUsers(query);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, searchUsers]);

  React.useEffect(() => {
    if (!profileOpen) return;

    setProfileForm({
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      bio: user?.bio ?? "",
    });
    setAvatarFile(null);
    setAvatarPreview(user?.avatarUrl ?? "");
  }, [profileOpen, user]);

  React.useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const toggleTheme = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
  };

  const updateProfileField =
    (field: keyof typeof profileForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfileForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const ok = await updateProfile({
      displayName: profileForm.displayName,
      email: profileForm.email,
      phone: profileForm.phone,
      bio: profileForm.bio,
    });

    if (!ok) return;

    if (avatarFile) {
      const avatarOk = await uploadAvatar(avatarFile);

      if (!avatarOk) return;
    }

    setProfileOpen(false);
  };

  const handleAvatarFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setAvatarFile(file);
  };

  const filteredConversations = conversations.filter((conversation) => {
    const text = conversationQuery.trim().toLowerCase();

    if (!text) return true;

    const title = getConversationTitle(conversation, user?._id).toLowerCase();
    const lastMessage = conversation.lastMessage?.content?.toLowerCase() ?? "";
    return title.includes(text) || lastMessage.includes(text);
  });

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="bg-gradient-primary">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-white/20 text-sm font-bold text-white">
                    M
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-white">
                      Moji
                    </h1>
                    <p className="truncate text-xs text-white/75">Chat app</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Sun className="size-4 text-white/80" />
                  <Switch
                    checked={darkMode}
                    onCheckedChange={toggleTheme}
                    className="data-checked:bg-background/80"
                  />
                  <Moon className="size-4 text-white/80" />
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {user?.role === "admin" && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Quan tri</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-11">
                      <Link to="/admin">
                        <ShieldCheckIcon />
                        <span className="flex min-w-0 flex-col">
                          <span className="font-medium">Mo trang quan tri</span>
                          <span className="truncate text-xs text-muted-foreground">
                            Nguoi dung va he thong
                          </span>
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
          </>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Tìm bạn bè</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                placeholder="Tên, username hoặc email"
              />
            </div>
            {query.trim().length >= 2 && (
              <div className="space-y-1">
                {searchLoading && (
                  <p className="px-2 text-xs text-muted-foreground">
                    Đang tìm...
                  </p>
                )}
                {!searchLoading &&
                  searchResults.map((person) => (
                    <PersonRow
                      key={person._id}
                      person={person}
                      online={onlineUserIds.includes(person._id)}
                      action={
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => sendFriendRequest(person._id)}
                        >
                          <UserPlusIcon />
                          <span className="sr-only">Kết bạn</span>
                        </Button>
                      }
                    />
                  ))}
                {!searchLoading && searchResults.length === 0 && (
                  <p className="px-2 text-xs text-muted-foreground">
                    Không có kết quả
                  </p>
                )}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {receivedRequests.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Lời mời kết bạn</SidebarGroupLabel>
              <SidebarGroupContent className="space-y-1">
                {receivedRequests.map((request) => (
                  <PersonRow
                    key={request._id}
                    person={request.from}
                    online={onlineUserIds.includes(request.from._id)}
                    action={
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-xs"
                          onClick={() => acceptFriendRequest(request._id)}
                        >
                          <CheckIcon />
                          <span className="sr-only">Chấp nhận</span>
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => declineFriendRequest(request._id)}
                        >
                          <XIcon />
                          <span className="sr-only">Từ chối</span>
                        </Button>
                      </div>
                    }
                  />
                ))}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {sentRequests.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Lời mời đã gửi</SidebarGroupLabel>
              <SidebarGroupContent className="space-y-1">
                {sentRequests.map((request) => (
                  <PersonRow
                    key={request._id}
                    person={request.to}
                    online={onlineUserIds.includes(request.to._id)}
                    action={
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => cancelFriendRequest(request._id)}
                        title="Thu hồi lời mời"
                      >
                        <XIcon className="size-3.5 text-muted-foreground hover:text-red-500" />
                      </Button>
                    }
                  />
                ))}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-11">
                  <Link to="/feed">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 text-white font-bold text-sm shadow-md">
                      📰
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">Bảng tin</span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        Xem bài đăng, thả tim, bình luận
                      </span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Cuộc trò chuyện</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="relative mb-2">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={conversationQuery}
                onChange={(event) => setConversationQuery(event.target.value)}
                className="h-9 pl-8"
                placeholder="Tim cuoc tro chuyen"
              />
            </div>
            <SidebarMenu>
              {filteredConversations.map((conversation) => {
                const title = getConversationTitle(conversation, user?._id);
                const unread = user?._id
                  ? conversation.unreadCounts?.[user._id] ?? 0
                  : 0;
                const peerId = getParticipantId(getDirectPeer(conversation, user?._id));
                const peerOnline =
                  conversation.type === "direct" &&
                  Boolean(peerId && onlineUserIds.includes(peerId));

                return (
                  <SidebarMenuItem key={conversation._id}>
                    <SidebarMenuButton
                      isActive={conversation._id === selectedConversationId}
                      className="h-12"
                      onClick={() => selectConversation(conversation._id)}
                    >
                      <div className="relative">
                        <Avatar size="sm">
                          <AvatarImage
                            src={getConversationAvatar(conversation, user?._id)}
                            alt={title}
                          />
                          <AvatarFallback>{initials(title)}</AvatarFallback>
                        </Avatar>
                        {conversation.type === "direct" && (
                          <span
                            className={`absolute bottom-0 right-0 size-2.5 rounded-full border border-background ${
                              peerOnline ? "bg-emerald-500" : "bg-muted-foreground"
                            }`}
                          />
                        )}
                      </div>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {conversation.lastMessage?.content || "Bắt đầu chat"}
                        </span>
                      </span>
                      {unread > 0 && <Badge>{unread}</Badge>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {filteredConversations.length === 0 && (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Chưa có cuộc trò chuyện
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Bạn bè</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-1">
            {friends.map((friend) => (
              <PersonRow
                key={friend._id}
                person={friend}
                online={onlineUserIds.includes(friend._id)}
                action={
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={async () => {
                        await startDirectConversation(friend._id);
                        navigate("/");
                      }}
                      title="Nhắn tin"
                    >
                      <MessageCircleIcon />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" title="Tùy chọn">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn hủy kết bạn với ${friend.displayName}?`)) {
                              unfriend(friend._id);
                            }
                          }}
                        >
                          <UserMinusIcon className="mr-2 size-4 text-red-600" />
                          <span className="text-red-600">Hủy kết bạn</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn chặn ${friend.displayName}?`)) {
                              blockUser(friend._id);
                            }
                          }}
                        >
                          <BanIcon className="mr-2 size-4 text-red-600" />
                          <span className="text-red-600">Chặn người dùng</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
              />
            ))}
            {friends.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Tìm và kết bạn để bắt đầu trò chuyện
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
          <Link to="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-85 transition-opacity">
            <Avatar>
              <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
              <AvatarFallback>{initials(user?.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-foreground">{user?.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </Link>
          {user?.role === "admin" && (
            <Button size="icon-sm" variant="ghost" asChild>
              <Link to="/admin">
                <ShieldCheckIcon />
                <span className="sr-only">Quan tri</span>
              </Link>
            </Button>
          )}
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <PencilIcon />
                <span className="sr-only">Chinh sua ho so</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Chinh sua ho so</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage
                      src={avatarPreview}
                      alt={profileForm.displayName}
                    />
                    <AvatarFallback>
                      {initials(profileForm.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <label htmlFor="avatarFile" className="text-xs font-medium">
                      Anh dai dien
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="avatarFile"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="sr-only"
                      />
                      <Button asChild variant="outline">
                        <label htmlFor="avatarFile" className="cursor-pointer">
                        <ImagePlusIcon />
                        Chon anh
                        </label>
                      </Button>
                      {avatarFile && (
                        <span className="truncate text-xs text-muted-foreground">
                          {avatarFile.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ho tro file anh toi da 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="displayName" className="text-xs font-medium">
                      Ten hien thi
                    </label>
                    <Input
                      id="displayName"
                      value={profileForm.displayName}
                      onChange={updateProfileField("displayName")}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-xs font-medium">
                      So dien thoai
                    </label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={updateProfileField("phone")}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={updateProfileField("email")}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="bio" className="text-xs font-medium">
                    Gioi thieu
                  </label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={updateProfileField("bio")}
                    maxLength={500}
                    className="max-h-32"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setProfileOpen(false)}
                  >
                    Huy
                  </Button>
                  <Button type="submit">Luu thay doi</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={passwordOpen} onOpenChange={(open) => {
            setPasswordOpen(open);
            if (!open) setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          }}>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="ghost">
                <KeyRoundIcon />
                <span className="sr-only">Doi mat khau</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Doi mat khau</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    const { toast } = await import("sonner");
                    toast.error("Mat khau xac nhan khong khop");
                    return;
                  }
                  const ok = await changePassword(
                    passwordForm.currentPassword,
                    passwordForm.newPassword
                  );
                  if (ok) {
                    setPasswordOpen(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label htmlFor="currentPassword" className="text-xs font-medium">
                    Mat khau hien tai
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="newPassword" className="text-xs font-medium">
                    Mat khau moi
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-xs font-medium">
                    Xac nhan mat khau moi
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    minLength={6}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasswordOpen(false)}
                  >
                    Huy
                  </Button>
                  <Button type="submit">Doi mat khau</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={blockedOpen} onOpenChange={(open) => {
            setBlockedOpen(open);
            if (open) {
              fetchBlockedUsers();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" title="Danh sách chặn">
                <BanIcon className="size-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Danh sách người dùng đã chặn</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
                {blockedUsers.map((person) => (
                  <div key={person._id} className="flex items-center justify-between gap-3 p-1 rounded-lg hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar>
                        <AvatarImage src={person.avatarUrl} alt={person.displayName} />
                        <AvatarFallback>{initials(person.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{person.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unblockUser(person._id)}
                    >
                      Bỏ chặn
                    </Button>
                  </div>
                ))}
                {blockedUsers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Chưa chặn người dùng nào
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* View Story Lightbox Modal */}
          {viewStoryOpen && stories[viewStoryIndex] && (
            <Dialog open={viewStoryOpen} onOpenChange={setViewStoryOpen}>
              <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black text-white border-none select-none">
                {/* Story Header */}
                <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between z-50">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 border-2 border-white/60">
                      <AvatarImage src={stories[viewStoryIndex].user?.avatarUrl} />
                      <AvatarFallback className="text-black bg-white">{initials(stories[viewStoryIndex].user?.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{stories[viewStoryIndex].user?.displayName || "Người dùng"}</p>
                      <p className="text-[10px] text-white/70">@{stories[viewStoryIndex].user?.username || "unknown"}</p>
                    </div>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-white hover:bg-white/20 hover:text-white"
                    onClick={() => setViewStoryOpen(false)}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>

                {/* Story Content Area */}
                <div className="flex-1 flex items-center justify-center relative min-h-[420px]">
                  {/* Previous Story Arrow */}
                  {viewStoryIndex > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevIdx = viewStoryIndex - 1;
                        setViewStoryIndex(prevIdx);
                        viewStory(stories[prevIdx]._id);
                      }}
                      className="absolute left-3 size-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors z-50 text-white"
                    >
                      <ChevronLeftIcon className="size-5" />
                    </button>
                  )}

                  {/* Next Story Arrow */}
                  {viewStoryIndex < stories.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIdx = viewStoryIndex + 1;
                        setViewStoryIndex(nextIdx);
                        viewStory(stories[nextIdx]._id);
                      }}
                      className="absolute right-3 size-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors z-50 text-white"
                    >
                      <ChevronRightIcon className="size-5" />
                    </button>
                  )}

                  {/* Story body based on media type */}
                  {stories[viewStoryIndex].mediaType === "text" ? (
                    (() => {
                      const content = stories[viewStoryIndex].content || "";
                      const match = content.match(/^\[(.*?)\](.*)$/s);
                      const bg = match ? match[1] : "bg-gradient-to-tr from-purple-500 to-indigo-600";
                      const text = match ? match[2] : content;
                      return (
                        <div className={`w-full h-full min-h-[420px] flex flex-col items-center justify-center p-8 text-center text-lg font-bold ${bg}`}>
                          {text}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="relative w-full h-full min-h-[420px] flex flex-col items-center justify-center bg-zinc-950">
                      {stories[viewStoryIndex].mediaType === "video" ? (
                        <video src={stories[viewStoryIndex].mediaUrl} autoPlay controls className="max-h-full max-w-full" />
                      ) : (
                        <img src={stories[viewStoryIndex].mediaUrl} alt="Story content" className="max-h-full max-w-full object-contain" />
                      )}
                      
                      {/* Story caption overlay if content exists */}
                      {stories[viewStoryIndex].content && (
                        <div className="absolute bottom-4 inset-x-0 px-6 py-3 bg-gradient-to-t from-black/85 via-black/55 to-transparent text-center text-xs font-medium text-white max-h-[30%] overflow-y-auto">
                          {stories[viewStoryIndex].content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button size="icon-sm" variant="ghost" onClick={signOut}>
            <LogOutIcon />
            <span className="sr-only">Đăng xuất</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
